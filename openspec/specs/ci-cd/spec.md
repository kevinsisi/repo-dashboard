## ADDED Requirements

### Requirement: Docker Image 建置
系統 SHALL 在 push 到 main 分支時自動建置 ARM64 Docker image 並推送至 Docker Hub。

#### Scenario: 程式碼變更觸發建置
- **WHEN** 程式碼 push 至 main 分支且包含相關檔案變更
- **THEN** GitHub Actions 建置 linux/arm64 image 並推送至 Docker Hub

#### Scenario: 手動觸發建置
- **WHEN** 使用者透過 workflow_dispatch 觸發
- **THEN** 執行完整建置與推送流程

### Requirement: 自動部署
系統 SHALL 在 Docker image 建置成功後，自動透過 Tailscale SSH 部署至 RPi。

#### Scenario: 建置成功後部署
- **WHEN** Build and Push Docker Image workflow 成功完成
- **THEN** Deploy workflow 透過 Tailscale 連線至 RPi，拉取最新 image 並重啟容器

#### Scenario: 部署健康檢查
- **WHEN** 新容器啟動後
- **THEN** 系統對 port 8323 執行 HTTP 健康檢查，確認服務正常運作
