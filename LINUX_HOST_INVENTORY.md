# LaLea Linux 主機盤點指南

> 狀態：待在目標 Linux 主機執行  
> 最後更新：2026-08-21  
> 用途：正式開發與部署前確認環境，不進行安裝或設定修改

## 1. 盤點原則

- 第一輪只執行唯讀命令。
- 不顯示或複製密碼、API key、SSH 私鑰、Cookie、session token、Codex／Claude 登入資料。
- PostgreSQL 只確認版本、服務、監聽與資料庫名稱，不匯出資料內容。
- 設定檔只列路徑或擷取非敏感欄位，不整份貼出 `.env`、`pgpass` 或認證設定。
- 執行結果先保存在主機本機，人工確認後再決定哪些內容可帶回專案討論。

## 2. 可交給 Linux 主機 Codex／Claude 的任務

```text
請以唯讀方式盤點這台 Linux 主機是否適合部署 LaLea。

LaLea 預計使用 Next.js + TypeScript、同機既有 PostgreSQL、systemd、
Passkey/WebAuthn 與反向代理 HTTPS。請依 LINUX_HOST_INVENTORY.md 執行檢查，
不要安裝套件、不要修改設定、不要啟停服務、不要開放防火牆，也不要輸出任何
密碼、token、私鑰、Cookie、完整連線字串或 Codex/Claude 登入資料。

請將結果填入文件指定的摘要格式；敏感或不確定欄位只標記「存在／不存在／待確認」。
```

## 3. 作業系統與硬體

### 唯讀命令

```bash
cat /etc/os-release
uname -m
uname -r
nproc
free -h
df -hT
timedatectl
```

### 需要記錄

- 發行版與版本。
- CPU 架構與邏輯核心數。
- 記憶體總量與目前可用量。
- 系統磁碟檔案系統、總量與可用量。
- 時區與 NTP 同步狀態。

不要貼出不相關掛載點中的私人目錄名稱。

## 4. Node.js 與程式工具

```bash
command -v node
node --version
command -v npm
npm --version
command -v pnpm
pnpm --version
command -v git
git --version
```

若某個命令不存在，只記錄「未安裝」，不要在盤點階段自行安裝。

需確認：

- Node.js 是否為仍受支援的 LTS 版本。
- 套件管理器是否已存在。
- Git 是否可用。
- Node.js 是系統安裝、版本管理器或其他方式提供。

## 5. PostgreSQL

### 程式與服務

```bash
command -v psql
psql --version
systemctl status postgresql --no-pager
systemctl list-units --type=service --all 'postgresql*' --no-pager
```

不同發行版的服務名稱可能不同。若 `postgresql.service` 不存在，先列出相符服務，不猜測或啟停服務。

### 安全的資料庫查詢

只有目前帳號已有合法本機存取方式時才執行；不要索取或輸出密碼：

```sql
SELECT version();
SHOW server_version;
SHOW listen_addresses;
SHOW port;
SHOW data_directory;
SHOW config_file;
SHOW hba_file;
SELECT current_user, current_database();
```

列出資料庫名稱時，不查詢資料表內容：

```sql
SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;
```

### 需要記錄

- PostgreSQL 版本。
- 服務是否啟動及是否設為開機啟動。
- 監聽本機或外部介面。
- 連接埠。
- 是否已有適合 LaLea 使用的獨立資料庫與角色，只記錄存在與否。
- 資料目錄所在磁碟的可用空間。
- 是否已有備份排程，只記錄方式與最近成功時間。

### 不得收集

- 角色密碼或 password hash。
- `.pgpass` 內容。
- 完整 `DATABASE_URL`。
- 業務資料表內容。
- 其他應用的私人資料。

## 6. Reverse proxy 與網站服務

```bash
command -v caddy
caddy version
command -v nginx
nginx -v
command -v apache2
apache2 -v
systemctl list-units --type=service --all 'caddy*' 'nginx*' 'apache2*' --no-pager
```

需要記錄：

- 是否已有 Caddy、Nginx 或 Apache。
- 哪個服務正在運作。
- 是否已有 80／443 服務。
- 是否已有可供 LaLea 使用的網域或子網域。
- HTTPS 憑證目前由哪種方式管理。

第一輪不整份輸出站台設定；若之後需要檢查，只擷取 LaLea 預定 host 與 upstream 相關區段，並先移除 token 或內部敏感資訊。

## 7. 網路與防火牆

依主機現有工具選擇唯讀命令：

```bash
ss -lntup
systemctl is-active ufw
ufw status
systemctl is-active firewalld
firewall-cmd --state
command -v tailscale
tailscale version
```

若命令需要提高權限或可能顯示不相關程序資訊，只記錄無法確認，不在未授權情況下使用 `sudo`。

需要確認：

- 目前對外監聽的連接埠。
- 80／443 是否可用。
- PostgreSQL 連接埠是否意外對外公開。
- 是否使用 UFW、firewalld、雲端防火牆或路由器轉發。
- 是否已有 Tailscale 或其他私人網路。
- 是否有固定公開 IP、動態 DNS 或只使用內網。

## 8. systemd 與執行使用者

```bash
systemctl --version
loginctl show-user "$(id -un)"
getent passwd lalea
getent group lalea
```

只確認：

- systemd 是否可用。
- 是否已存在 `lalea` 專用服務使用者與群組。
- 預定應用目錄由誰擁有。

不存在屬正常，盤點階段不要建立帳號或目錄。

## 9. Docker 與既有部署方式

```bash
command -v docker
docker --version
docker compose version
systemctl status docker --no-pager
```

不要在未確認權限與資料敏感度前列出所有容器、環境變數或掛載內容。

記錄：

- Docker／Compose 是否存在。
- 主機既有服務主要採容器或 systemd。
- 是否有統一的部署慣例。

LaLea 不因 Docker 已存在就必須容器化；目標是與現有維運方式一致。

## 10. Codex 與 Claude

```bash
command -v codex
codex --version
command -v claude
claude --version
```

只記錄程式位置與版本。不要執行登入診斷、輸出設定檔或列出憑證。

需要確認它們是由哪位主機使用者操作，以及網站服務使用者是否無法讀取該使用者的設定目錄。

## 11. 備份環境

只盤點，不執行備份：

- 目前 PostgreSQL 是否已有 `pg_dump` 或其他備份排程。
- 備份目的地是否與主機磁碟分離。
- 最近一次成功時間。
- 保留週期。
- 是否曾實際還原。
- 是否有足夠空間容納 LaLea 資料庫與未來音訊。

檢查排程時只記錄相關 job 名稱與時間，不輸出可能含密碼的完整命令列。

## 12. 網域與 Passkey 條件

Passkey 正式使用前必須確認：

- 預定完整網域，例如 `lalea.example.com`。
- DNS 是否可指向該主機或反向代理。
- 是否能取得可信 HTTPS 憑證。
- Reverse proxy 是否保留正確 Host 與 HTTPS origin 資訊。
- Production RP ID。
- Staging 是否使用不同子網域、資料庫及 credential。

若目前只有 IP 或可能改變的主機名稱，盤點結果標記為「正式 Passkey 尚未就緒」。

## 13. 結果摘要模板

```markdown
# LaLea 主機盤點結果

盤點日期：
執行者：

## 系統
- 發行版：
- 架構／CPU：
- 記憶體：
- 系統磁碟可用空間：
- 時區／NTP：

## 執行環境
- Node.js：
- 套件管理器：
- Git：
- systemd：
- Docker／Compose：

## PostgreSQL
- 版本：
- 服務狀態：
- 監聽範圍：本機／外部／待確認
- 連接埠：
- LaLea 獨立 DB／角色：已存在／未建立／待確認
- 備份方式：
- 最近成功備份：
- 還原演練：有／無／待確認

## 網站入口
- Reverse proxy：
- 80／443：
- 網域：
- HTTPS：
- 存取方式：公開／私人網路／待確認

## 工具隔離
- Codex 版本：
- Claude 版本：
- 網站服務帳號能否讀取 AI CLI 憑證：否／待修正／待確認

## 備份與容量
- 異機備份位置：已存在／未建立／待確認
- 音訊預留空間：

## 阻礙
- [ ]

## 建議部署方式
- Next.js：systemd 原生／容器／待確認
- PostgreSQL：沿用既有服務
- Reverse proxy：
- 開發前需完成：
```

## 14. 通過條件

開始在主機部署 MVP 前，至少需要：

- Node.js 版本策略明確。
- PostgreSQL 版本受支援且服務健康。
- 能建立 LaLea 專用資料庫與最小權限角色。
- PostgreSQL 不直接暴露於不受信任網路。
- 有 Reverse proxy、固定網域與 HTTPS 方案。
- 有至少一個異機備份目的地。
- 能建立受限的 LaLea systemd 使用者。
- 網站服務無法讀取 Codex／Claude 個人憑證。

盤點不通過時先修正部署條件，不改變 LaLea 核心產品架構來繞過安全要求。

