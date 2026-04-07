# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**repo-dashboard** 是 GitHub Repository 狀態看板，監控 `chuangkevin` 和 `kevinsisi` 兩個帳號的所有 repository。

## Architecture

- **Backend**: Express.js (vanilla JS) + Octokit (`@octokit/rest`)
- **Frontend**: 純靜態 HTML/CSS/JS (`public/`)
- **Entry**: `server.js` — 單一檔案後端 + 靜態服務
- **Data**: `data/settings.json` (settings), `data/cache.json` (API cache)

## Development Commands

```bash
# Development (with file watching)
npm run dev     # node --watch server.js

# Production
npm start       # node server.js
```

## Key Features

- Fetches all repos for configured accounts (user + org)
- In-memory cache with configurable TTL (default: 2min)
- Auto-refresh interval (default: 5min)
- Settings: hiddenRepos, cacheTtlMs, refreshIntervalMs, githubToken
- Supports GitHub personal access token for higher rate limits

## Settings (`data/settings.json`)

```json
{
  "accounts": [
    { "name": "chuangkevin", "type": "user" },
    { "name": "kevinsisi", "type": "org" }
  ],
  "cacheTtlMs": 120000,
  "refreshIntervalMs": 300000,
  "hiddenRepos": [],
  "githubToken": null
}
```

## Port

| Port | Service |
|------|---------|
| 3000 | Express server + static frontend |

## Docker

```bash
docker compose up -d
```
