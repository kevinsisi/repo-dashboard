# repo-dashboard

GitHub Repository 狀態看板 — 同時監控 `chuangkevin` 與 `kevinsisi` 兩個帳號 / 組織下所有 repo 的最近活動、commit、CI 狀態。

## 一句話描述

家用 dashboard，把多帳號 GitHub repo 一次列出來，自動快取 + 排程刷新，避免逐個點開查。

## 技術棧

- **Backend**：Express.js（vanilla JavaScript，無 TypeScript）
- **GitHub API**：`@octokit/rest`
- **Frontend**：純靜態 HTML / CSS / JavaScript（位於 `public/`）
- **入口**：單檔 `server.js`（後端 + 靜態檔案服務）
- **資料**：JSON 檔（`data/settings.json` 設定、`data/cache.json` API 快取）
- **部署**：Docker Compose（dev build from source / prod pull image）

## 主要功能

| 功能 | 說明 |
|---|---|
| 多帳號監控 | 設定檔列出多個 GitHub user / org，自動 fetch 全部 repo |
| 記憶體快取 | TTL 預設 2 分鐘，可設定 |
| 自動刷新 | 預設 5 分鐘排程更新一次 |
| 隱藏 repo | `hiddenRepos` 列表將不想看的 repo 從畫面隱藏 |
| Personal Access Token | 設定 `githubToken` 提高 API 額度 |

## 設定（`data/settings.json`）

```json
{
  "accounts": [
    { "name": "chuangkevin", "type": "user" },
    { "name": "kevinsisi",   "type": "org" }
  ],
  "cacheTtlMs": 120000,
  "refreshIntervalMs": 300000,
  "hiddenRepos": [],
  "githubToken": null
}
```

## 開發

```bash
npm install
npm run dev    # node --watch server.js
# 服務在 http://localhost:3000
```

## 部署

### Production（Docker Compose）

```bash
docker compose -f docker-compose.prod.yml up -d
# 對外 port 8323 → container 3000
# image: ${DOCKERHUB_USERNAME}/repo-dashboard:latest
```

### 環境變數

- 設定 `.env` 檔包含 `DOCKERHUB_USERNAME`（prod compose 需要）
- 其他設定走 `data/settings.json`，volume 掛載持久化

## URL

- Repo：<https://github.com/kevinsisi/repo-dashboard>
- 內網：`http://<host>:8323`
