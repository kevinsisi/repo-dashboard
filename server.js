const express = require("express");
const { Octokit } = require("@octokit/rest");
const path = require("path");

const app = express();
const PORT = 3000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("ERROR: GITHUB_TOKEN environment variable is required");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const PERSONAL_USER = "chuangkevin";
const ORG_NAME = "kevinsisi";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

let cache = { data: null, timestamp: 0 };

async function fetchAllRepos() {
  const [personalRepos, orgRepos] = await Promise.all([
    octokit.paginate(octokit.rest.repos.listForUser, {
      username: PERSONAL_USER,
      per_page: 100,
      sort: "updated",
      direction: "desc",
    }),
    octokit.paginate(octokit.rest.repos.listForOrg, {
      org: ORG_NAME,
      per_page: 100,
      sort: "updated",
      direction: "desc",
    }),
  ]);

  return { personalRepos, orgRepos };
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
  } catch (err) {
    // 404 means Actions not enabled or no workflows
    if (err.status === 404) return null;
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
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const { personalRepos, orgRepos } = await fetchAllRepos();

  const allRepos = [...personalRepos, ...orgRepos];

  // Fetch latest workflow run for all repos in parallel
  const actionResults = await Promise.all(
    allRepos.map((repo) => getLatestWorkflowRun(repo.owner.login, repo.name))
  );

  const personal = [];
  const org = [];

  allRepos.forEach((repo, i) => {
    const mapped = mapRepo(repo, actionResults[i]);
    if (repo.owner.login === PERSONAL_USER) {
      personal.push(mapped);
    } else {
      org.push(mapped);
    }
  });

  // Sort by updated_at descending
  const sortFn = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);
  personal.sort(sortFn);
  org.sort(sortFn);

  const result = { personal, org, fetchedAt: new Date().toISOString() };
  cache = { data: result, timestamp: now };
  return result;
}

app.use(express.static(path.join(__dirname, "public")));

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
