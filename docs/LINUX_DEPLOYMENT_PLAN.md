# LaLea Linux 部署與 PostgreSQL 整合草案

> 狀態：開發前規格  
> 最後更新：2026-08-21  
> 已知條件：目標 Linux 主機已安裝 PostgreSQL，並已安裝 Codex 與 Claude

## 1. 第一版部署基線

第一版預設採單機部署：

```text
Internet / private network
        ↓
Reverse proxy + HTTPS
        ↓
Next.js application
        ↓ local connection
Existing PostgreSQL
```

Codex 與 Claude CLI 不位於公開請求路徑中，只供操作者在主機終端執行開發、維護及離線教材工作。

## 2. 為何先採同機 PostgreSQL

- 主機已安裝 PostgreSQL，不需先引入額外託管服務。
- 應用程式與資料庫可透過本機介面連線，部署與備份流程較直接。
- 第一階段主要供個人使用，負載尚不需要拆分主機。
- 未來仍透過標準 PostgreSQL 連線字串存取，不將同機假設寫入商業邏輯，因此可搬到獨立或託管資料庫。

限制：應用程式、資料庫與備份都在同一台主機時，共同故障風險較高，因此備份必須至少有一份離開該主機。

## 3. 建議服務組成

### 必要

- Linux 作業系統。
- Node.js LTS；實際大版本在正式建專案時固定。
- Next.js production server。
- 既有 PostgreSQL。
- Reverse proxy，例如 Caddy 或 Nginx，尚未決定。
- systemd 服務管理。
- HTTPS 憑證。
- 資料庫備份排程。

### 暫不需要

- Kubernetes。
- 多節點 PostgreSQL。
- Redis。
- 訊息佇列。
- 物件儲存服務。
- 專用 AI API 服務。

若日後加入預生成音訊，可先使用受控的本機資料目錄；容量、備份或多主機需求增加後，再抽換為 S3 相容物件儲存。

## 4. 容器與原生服務選擇

既有 PostgreSQL 已在主機運作，第一版建議：

- PostgreSQL 保持現有安裝方式，不為 LaLea 重新建立另一套資料庫容器。
- Next.js 可先使用 Node.js + systemd 原生服務。
- Reverse proxy 使用主機既有方案；若沒有，再選 Caddy 或 Nginx。

這樣能避免為了單一應用引入兩套 PostgreSQL 維運方式。若主機已經以 Docker Compose 管理其他服務，則可改為 Next.js 容器連線到主機 PostgreSQL；需另外處理網路與認證邊界。

容器方案必須等取得主機現況後再決定，不在文件中假設 Docker 已存在。

## 5. PostgreSQL 隔離方式

LaLea 不使用 PostgreSQL 超級使用者執行網站。

建議建立：

- 獨立資料庫，例如 `lalea`。
- 獨立登入角色，例如 `lalea_app`。
- migration 專用角色，例如 `lalea_migrator`；MVP 初期可評估是否合併，但正式應用不應擁有建立任意資料庫或角色的權限。
- 必要 schema 的最小權限。

### 應用角色

只取得 LaLea 執行所需的資料讀寫權限，不擁有：

- PostgreSQL 超級使用者權限。
- 建立角色或資料庫權限。
- 讀取其他應用資料庫的權限。
- 主機檔案系統權限。

### 連線

- 同機預設優先使用 loopback 或 Unix socket。
- 不因網站需要而把 PostgreSQL 公開到 Internet。
- `DATABASE_URL` 只存在伺服器環境，不送進瀏覽器 bundle。
- production、staging 與本機開發使用不同資料庫及憑證。

## 6. Migration 流程

正式部署流程：

```text
備份資料庫
→ 部署新程式碼但尚未切換流量
→ 使用 migration 身分執行 Drizzle migration
→ 執行資料庫與應用健康檢查
→ 啟動或重新載入 Next.js
→ 驗證主要流程
```

原則：

- migration 檔案納入 Git。
- production 不使用自動推測 schema 的 `push` 取代 migration。
- 破壞性 schema 修改分成新增、資料搬移、切換讀寫、最後移除等階段。
- 每次 migration 在 staging 或可還原副本先測試。
- 應用啟動不自動以高權限執行未知 migration。

## 7. 備份與還原

### 最低要求

- 每日一次 PostgreSQL 邏輯備份。
- 備份檔加密或存放在受限位置。
- 至少一份備份位於不同裝置或不同主機。
- 定義保留週期，例如每日 7 份、每週 4 份；正式值尚待確認。
- 備份失敗需要可見通知或檢查紀錄。

### 還原驗證

備份存在不代表可用。開發前需寫出並實測：

1. 建立空白還原資料庫。
2. 匯入最近備份。
3. 執行 migration 到目前版本。
4. 啟動 LaLea 測試環境。
5. 確認帳號、詞彙、作答事件與複習狀態一致。

至少在首次正式使用前完成一次還原演練。

## 8. Next.js 執行身分

- 建立不可登入或受限的專用系統使用者，例如 `lalea`。
- 專案程式、設定與音訊資料使用明確目錄，避免存放在 Codex／Claude 個人設定目錄。
- systemd 服務只取得必要環境變數與讀寫目錄。
- 網站程序不能讀取使用者家目錄、SSH 金鑰、Codex／Claude 登入資料或任意專案檔案。
- production 不以 root 執行 Next.js。

## 9. Reverse proxy 與網路

Reverse proxy 負責：

- HTTPS。
- 對外的 80／443 連接埠。
- 轉發到只監聽本機的 Next.js 連接埠。
- 基本請求大小與逾時限制。
- 安全標頭與必要日誌。

Next.js production server 與 PostgreSQL 連接埠預設不直接公開。

若第一階段只供個人使用，可比較：

- 公開網域 + HTTPS + 應用登入。
- VPN／Tailscale 等私人網路 + 應用登入。

即使部署於私人網路，多使用者資料隔離與登入仍應保留，不用網路位置取代應用層身分驗證。

## 10. 登入方向

第一版已決定採 Passkey 作為主要登入方式，一次性恢復碼作為備援，不建立傳統密碼登入。正式環境必須先有固定網域與 HTTPS；詳細流程、安全限制及資料表定義見 `AUTHENTICATION_PLAN.md`。

資料模型持續使用內部 `user_id`，不把使用者主鍵綁定 passkey credential 或任何外部供應者。

## 11. AI 工具隔離

主機已安裝 Codex 與 Claude，但部署必須遵守：

- Next.js 不直接執行訂閱 CLI。
- 公開 HTTP 請求不能觸發 shell、Codex 或 Claude。
- CLI 個人登入資料與網站服務使用者隔離。
- AI 教材任務由操作者匯出、手動處理、驗證並匯入。
- 匯入資料先進入待審核狀態。

未來若改用本地模型服務或正式 API，需建立獨立受限服務介面，不重用個人 CLI 權限。

## 12. 可觀測性與健康檢查

MVP 至少需要：

- `/health/live`：應用程序正在運作，不查外部依賴。
- `/health/ready`：確認必要設定與資料庫連線。
- systemd 啟動、停止與異常重啟紀錄。
- migration 版本可查詢。
- 不記錄密碼、完整連線字串、敏感工作原句或訂閱登入資料。

初期不需要完整監控平台，但需要能回答：服務是否運作、最近是否重啟、資料庫是否可連、備份最近是否成功。

## 13. 部署目錄概念

實際路徑待主機確認，概念上分離：

```text
application code      唯讀部署內容
runtime configuration 受限環境設定
generated audio       可寫入的應用資料
backup staging        受限且定期移出的暫存備份
logs                  由 systemd/journald 或既有方案管理
```

不要將 `.env`、資料庫備份或生成音訊提交到 Git。

## 14. 從目前工作區搬移

正式開發後，建議使用 Git 搬移程式碼，而不是複製整個 Windows 工作目錄：

1. 提交已確認的程式與 migration。
2. Linux 主機以 Git 取得指定版本。
3. 依設定模板建立 production 環境變數。
4. 安裝固定版本依賴並建置。
5. 建立或升級 PostgreSQL schema。
6. 啟動 systemd 服務。
7. 驗證健康檢查與核心學習流程。

使用者資料透過 PostgreSQL 備份／還原搬移，不透過 Git。

## 15. 開發前主機盤點

之後需要在 Linux 主機上以唯讀命令確認：

- 發行版與版本。
- CPU 架構、核心數、記憶體與可用磁碟。
- Node.js、PostgreSQL、Git、Codex、Claude 版本。
- PostgreSQL 服務狀態、版本、目前監聽介面與認證方式。
- 是否已有 Caddy、Nginx、Apache、Docker 或 Tailscale。
- 防火牆與可用網域。
- 備份目的地。

盤點時不輸出密碼、完整連線字串、API key、SSH 私鑰或訂閱憑證。

完整唯讀命令、敏感資料邊界與結果模板見 `LINUX_HOST_INVENTORY.md`。

## 16. 尚待決定

- Linux 發行版與主機規格。
- 是否已有反向代理與網域。
- 公開 Internet 或私人網路存取。
- 正式網域、RP ID 與 HTTPS 配置。
- PostgreSQL 版本與既有備份方式。
- 是否允許 LaLea 建立獨立資料庫與角色。
- 音訊檔預估容量與異機備份位置。
- staging 是否同機建立獨立服務與資料庫。
