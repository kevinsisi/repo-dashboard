## ADDED Requirements

### Requirement: 儲存庫列表
系統 SHALL 顯示 GitHub 使用者（chuangkevin）及組織（kevinsisi）的所有儲存庫，依最後更新時間排序。

#### Scenario: 載入儲存庫
- **WHEN** 使用者開啟 Dashboard 頁面
- **THEN** 系統顯示個人儲存庫與組織儲存庫兩個區塊，每個儲存庫顯示名稱、描述、公開/私有標籤、最後更新時間

#### Scenario: 無描述的儲存庫
- **WHEN** 儲存庫沒有設定描述
- **THEN** 描述欄位顯示「無描述」

### Requirement: GitHub Actions 狀態
系統 SHALL 顯示每個儲存庫最新的 GitHub Actions workflow run 狀態。

#### Scenario: Actions 成功
- **WHEN** 最新 workflow run 結論為 success
- **THEN** 顯示綠色狀態指示點，標籤為「成功」

#### Scenario: Actions 失敗
- **WHEN** 最新 workflow run 結論為 failure
- **THEN** 顯示紅色狀態指示點，標籤為「失敗」

#### Scenario: Actions 執行中
- **WHEN** 最新 workflow run 仍在執行
- **THEN** 顯示黃色狀態指示點，標籤為「執行中」

#### Scenario: 無 Actions
- **WHEN** 儲存庫沒有任何 workflow 或 workflow run
- **THEN** 顯示灰色狀態指示點，標籤為「無 Actions」

### Requirement: 複製 Clone URL
系統 SHALL 提供一鍵複製儲存庫 HTTPS clone URL 的功能。

#### Scenario: 複製成功
- **WHEN** 使用者點擊複製按鈕
- **THEN** 儲存庫的 HTTPS clone URL 寫入剪貼簿，並顯示「已複製！」提示

### Requirement: 搜尋過濾
系統 SHALL 支援依儲存庫名稱即時過濾。

#### Scenario: 輸入搜尋文字
- **WHEN** 使用者在搜尋框輸入文字
- **THEN** 只顯示名稱包含該文字的儲存庫，計數即時更新

### Requirement: 自動重新整理
系統 SHALL 每 5 分鐘自動重新取得資料，並支援手動重新整理。

#### Scenario: 自動重新整理
- **WHEN** 距離上次取得資料超過 5 分鐘
- **THEN** 系統自動重新呼叫 API 並更新畫面

#### Scenario: 手動重新整理
- **WHEN** 使用者點擊「重新整理」按鈕
- **THEN** 系統立即重新取得資料並更新畫面

### Requirement: API 快取
系統 SHALL 對 GitHub API 回應快取 2 分鐘，避免超出 API 速率限制。

#### Scenario: 快取有效期內
- **WHEN** 距離上次 API 呼叫未超過 2 分鐘
- **THEN** 回傳快取資料，不重新呼叫 GitHub API
