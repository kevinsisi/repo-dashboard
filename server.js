const express = require("express");
const { Octokit } = require("@octokit/rest");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Settings ---
const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS = {
  accounts: [
    { name: "chuangkevin", type: "user" },
    { name: "kevinsisi", type: "org" },
  ],
  cacheTtlMs: 120000,
  refreshIntervalMs: 300000,
  hiddenRepos: [],
  githubToken: null,
};

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

let settings = loadSettings();

// --- Octokit ---
function getToken() {
  return settings.githubToken || process.env.GITHUB_TOKEN;
}

let octokit;

function initOctokit() {
  const token = getToken();
  if (!token) {
    console.error("ERROR: No GitHub token available (env or settings)");
    return;
  }
  octokit = new Octokit({ auth: token });
}

initOctokit();

if (!octokit) {
  console.error("ERROR: GITHUB_TOKEN is required (env var or settings)");
  process.exit(1);
}

// --- Cache ---
let cache = { data: null, timestamp: 0 };

function invalidateCache() {
  cache = { data: null, timestamp: 0 };
}

// --- GitHub API ---
async function fetchAllRepos() {
  const results = await Promise.all(
    settings.accounts.map(async (account) => {
      const fetchFn =
        account.type === "org"
          ? () =>
              octokit.paginate(octokit.rest.repos.listForOrg, {
                org: account.name,
                per_page: 100,
                sort: "updated",
                direction: "desc",
              })
          : () =>
              octokit.paginate(octokit.rest.repos.listForUser, {
                username: account.name,
                per_page: 100,
                sort: "updated",
                direction: "desc",
              });
      const repos = await fetchFn();
      return { name: account.name, type: account.type, repos };
    })
  );
  return results;
}

async function getLatestWorkflowRun(owner, repo) {
  try {
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
    });
    if (data.total_count === 0) return null;
    const run = data.workflow_runs[0];
    return {
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
    };
  } catch {
    return null;
  }
}

function mapRepo(repo, latestRun) {
  return {
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    clone_url: repo.clone_url,
    visibility: repo.private ? "private" : "public",
    updated_at: repo.updated_at,
    owner: repo.owner.login,
    actions: latestRun,
  };
}

async function getReposWithActions() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < settings.cacheTtlMs) {
    return cache.data;
  }

  const accountResults = await fetchAllRepos();
  const hiddenSet = new Set(settings.hiddenRepos);

  const groups = await Promise.all(
    accountResults.map(async ({ name, type, repos }) => {
      const actionResults = await Promise.all(
        repos.map((r) => getLatestWorkflowRun(r.owner.login, r.name))
      );
      const mapped = repos
        .map((r, i) => mapRepo(r, actionResults[i]))
        .filter((r) => !hiddenSet.has(r.full_name));
      mapped.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      return { name, type, repos: mapped };
    })
  );

  const result = { groups, fetchedAt: new Date().toISOString() };
  cache = { data: result, timestamp: now };
  return result;
}

// --- Routes ---
app.use(express.static(path.join(__dirname, "public")));

function maskToken(token) {
  if (!token) return null;
  if (token.length <= 8) return "****";
  return token.slice(0, 4) + "****" + token.slice(-4);
}

app.get("/api/settings", (req, res) => {
  const s = loadSettings();
  res.json({
    accounts: s.accounts,
    cacheTtlMs: s.cacheTtlMs,
    refreshIntervalMs: s.refreshIntervalMs,
    hiddenRepos: s.hiddenRepos,
    githubToken: maskToken(getToken()),
    hasEnvToken: !!process.env.GITHUB_TOKEN,
  });
});

app.put("/api/settings", async (req, res) => {
  const body = req.body;
  const current = loadSettings();

  if (body.accounts !== undefined) {
    if (!Array.isArray(body.accounts) || body.accounts.some((a) => !a.name || !["user", "org"].includes(a.type))) {
      return res.status(400).json({ error: "帳號格式不正確" });
    }
    current.accounts = body.accounts;
  }

  if (body.cacheTtlMs !== undefined) {
    const v = Number(body.cacheTtlMs);
    if (isNaN(v) || v < 10000) return res.status(400).json({ error: "快取間隔至少 10 秒" });
    current.cacheTtlMs = v;
  }

  if (body.refreshIntervalMs !== undefined) {
    const v = Number(body.refreshIntervalMs);
    if (isNaN(v) || v < 10000) return res.status(400).json({ error: "刷新間隔至少 10 秒" });
    current.refreshIntervalMs = v;
  }

  if (body.hiddenRepos !== undefined) {
    if (!Array.isArray(body.hiddenRepos)) return res.status(400).json({ error: "hiddenRepos 必須是陣列" });
    current.hiddenRepos = body.hiddenRepos;
  }

  if (body.githubToken !== undefined && body.githubToken !== null) {
    const newToken = body.githubToken.trim();
    if (newToken) {
      try {
        const testKit = new Octokit({ auth: newToken });
        await testKit.rest.users.getAuthenticated();
        current.githubToken = newToken;
      } catch {
        return res.status(400).json({ error: "GitHub Token 無效" });
      }
    }
  }

  if (body.clearToken) {
    current.githubToken = null;
  }

  saveSettings(current);
  settings = current;
  initOctokit();
  invalidateCache();

  res.json({ ok: true });
});

app.get("/api/repos", async (req, res) => {
  try {
    const data = await getReposWithActions();
    res.json(data);
  } catch (err) {
    console.error("Error fetching repos:", err.message);
    res.status(500).json({ error: "無法取得儲存庫資料，請稍後再試。" });
  }
});

app.listen(PORT, () => {
  console.log(`Repo Dashboard running on http://localhost:${PORT}`);
});
