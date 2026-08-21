# LaLea Passkey 登入與帳號恢復規格

> 狀態：開發前規格  
> 最後更新：2026-08-21  
> 決策：Passkey 為主要登入方式，一次性恢復碼為備援

## 1. 目標

- 不建立傳統密碼登入。
- 第一階段個人使用時操作簡單。
- 從資料模型開始支援多使用者。
- 遺失裝置後仍有可控的恢復方式。
- 網站不依賴 Email、SMS 或第三方 OAuth 才能登入。
- 未來可增加 Email 通知或外部身分供應者，但不更換內部 `user_id`。

## 2. 驗證方式

### 主要方式：Passkey

LaLea 使用 WebAuthn 建立與驗證 passkey。伺服器只保存公開金鑰與必要 credential metadata；私鑰留在使用者的裝置、硬體金鑰或憑證管理工具中。

正式環境要求：

- 有效 HTTPS。
- 固定且明確的網域。
- 固定 `RP ID`。
- 嚴格驗證 challenge、origin、RP ID、credential 與使用者驗證結果。
- challenge 一次性、短效且在驗證後失效。

### 備援方式：一次性恢復碼

- 建立帳號時產生一組高熵恢復碼。
- 只在產生當下完整顯示一次。
- 資料庫只保存每個恢復碼的安全雜湊與狀態，不保存明文。
- 每個代碼只能使用一次。
- 使用恢復碼登入後，優先要求新增 passkey，並顯示剩餘恢復碼數量。
- 使用者重新產生恢復碼時，舊代碼全部失效。

恢復流程是另一條登入路徑，安全性不能被當作一般客服便利功能而弱化。

## 3. 第一位使用者建立方式

MVP 不開放公開註冊。第一位使用者由主機操作者產生一次性 bootstrap 邀請：

```text
操作者在 Linux 終端產生短效邀請
→ 使用者以 HTTPS 開啟邀請連結
→ 設定顯示名稱
→ 建立第一把 passkey
→ 下載或抄寫恢復碼
→ 確認已保存恢復碼
→ 帳號啟用
```

Bootstrap token：

- 使用安全亂數產生。
- 資料庫只保存雜湊。
- 設定短效期限。
- 使用後立即失效。
- 不寫入一般應用日誌。
- 不能建立第二位管理者，除非操作者明確產生新的邀請。

## 4. 未來多使用者邀請

當需要加入其他使用者時，由具有權限的操作者建立一次性邀請，而不是開放匿名註冊。

邀請記錄包含：

- 邀請 token 雜湊。
- 預定角色。
- 建立者。
- 建立與失效時間。
- 使用時間。
- 撤銷時間。

是否綁定 Email 可在未來加入；MVP 不要求寄信服務。

## 5. Passkey 註冊流程

```text
已驗證邀請或已登入使用者要求新增 passkey
→ 伺服器產生 registration challenge
→ 瀏覽器呼叫 WebAuthn create
→ 使用者以裝置解鎖／生物辨識確認
→ 伺服器驗證 challenge、origin、RP ID 與 attestation response
→ 保存 credential 公開資料
→ 顯示成功及裝置名稱設定
```

規則：

- 使用不含個人資訊的隨機 WebAuthn user handle。
- 預設要求 discoverable credential，以支援 passkey 登入體驗。
- 預設要求 user verification；若裝置不支援，是否允許降級需另行決定，不能靜默放寬。
- 一位使用者可登錄多把 passkey。
- Credential ID 必須唯一。
- Attestation 預設不要求可識別裝置型號的直接證明，除非未來有明確安全需求。

## 6. Passkey 登入流程

```text
開啟登入頁
→ 選擇使用 passkey
→ 伺服器產生 authentication challenge
→ 瀏覽器呼叫 WebAuthn get
→ 使用者確認
→ 伺服器驗證 assertion
→ 建立伺服器 session
→ 進入最近使用的學習路徑
```

登入頁不先要求輸入 Email。若瀏覽器及實作支援，可使用 discoverable credential 或 conditional UI 顯示可用帳號。

失敗訊息不揭露 credential、帳號是否存在或內部驗證細節。

## 7. 恢復碼登入

```text
選擇「無法使用 passkey」
→ 輸入帳號識別與一組恢復碼
→ 伺服器執行速率限制與安全雜湊比對
→ 原子性地標記該碼已使用
→ 建立受限制的恢復 session
→ 新增一把 passkey
→ 升級為一般 session
```

受限制的恢復 session 不允許：

- 修改其他使用者。
- 匯出所有個人資料。
- 變更操作者權限。
- 產生新的邀請。
- 刪除最後一把既有 passkey。

如果使用者仍有可用 passkey，可要求再驗證後才執行敏感操作。

## 8. Passkey 管理

「我的 → 登入與安全」應提供：

- 已登錄 passkey 清單。
- 使用者自訂名稱，例如「iPhone」或「USB 安全金鑰」。
- 建立時間與最近使用時間。
- 新增 passkey。
- 撤銷 passkey。
- 重新產生恢復碼。
- 登出目前裝置。
- 登出其他裝置。

安全規則：

- 不允許在沒有恢復碼或另一把 passkey 時，直接刪除最後一把 passkey。
- 撤銷 passkey 與重新產生恢復碼屬敏感操作，需要近期重新驗證。
- Credential 公開資料刪除前應保留必要的安全稽核事件，但不保留已撤銷的登入能力。

## 9. Session 設計

使用伺服器端 session，瀏覽器只保存不透明 session token。

Cookie 最低設定：

- `HttpOnly`
- `Secure`
- `SameSite=Lax` 或經驗證的更嚴格設定
- 限定正確 Path 與 Domain

伺服器 session 保存：

- session token 的安全雜湊。
- `user_id`。
- 建立、最後使用與失效時間。
- 驗證方式。
- 是否為受限制恢復 session。
- 裝置顯示資訊與撤銷時間。

建議：

- 登入成功後輪替 session token。
- 登出、撤銷或帳號停用時使 session 失效。
- 敏感操作要求近期驗證。
- 改變權限後撤銷舊 session。
- 所有狀態變更請求使用 CSRF 防護與 origin 檢查。

## 10. 建議資料表

### `users`

- `id`
- `username` 或登入識別名稱
- `display_name`
- `status`
- `created_at`
- `disabled_at`

登入識別名稱需唯一，但不可作為其他資料表的關聯主鍵。

### `webauthn_credentials`

- `id`
- `user_id`
- `credential_id`
- `public_key`
- `counter`
- `transports`
- `device_type`
- `backed_up`
- `user_verified_at`
- `display_name`
- `created_at`
- `last_used_at`
- `revoked_at`

實際欄位以選定 WebAuthn 函式庫的驗證需求為準，不自行刪減必要資料。

### `auth_challenges`

- `id`
- `purpose`
- `challenge_hash`
- `user_id`，登入探索時可為空
- `expires_at`
- `used_at`
- `created_at`

Challenge 短效且只能使用一次；亦可使用受保護的短效伺服器儲存取代永久表格，但必須支援多程序一致性。

### `recovery_codes`

- `id`
- `user_id`
- `code_hash`
- `created_at`
- `used_at`
- `revoked_at`

### `auth_sessions`

- `id`
- `user_id`
- `token_hash`
- `auth_method`
- `assurance_state`
- `created_at`
- `last_seen_at`
- `expires_at`
- `revoked_at`

### `account_invitations`

- `id`
- `token_hash`
- `role`
- `created_by`
- `expires_at`
- `used_at`
- `revoked_at`

### `security_events`

- `user_id`
- `event_type`
- `credential_id` 或 session ID
- `occurred_at`
- 必要且最小化的網路／裝置 metadata

不記錄 challenge、恢復碼、session token 或其他登入祕密的明文。

## 11. 速率限制與防濫用

- 邀請、challenge、登入、恢復碼及敏感操作分開限制。
- 同時考量帳號、session 與來源網路，避免只靠 IP。
- 失敗回應不提供帳號枚舉線索。
- 多次失敗時採漸進式延遲；不讓攻擊者永久鎖死特定帳號。
- 恢復碼成功使用必須以資料庫交易原子性標記，避免同時重放。

## 12. 網域與搬移限制

Passkey 綁定 RP ID，正式網域是安全邊界，不應任意更換。

因此在建立正式帳號以前應先確認：

- 正式網域。
- 是否使用子網域，例如 `lalea.example.com`。
- Reverse proxy 終止 HTTPS 後傳遞的 origin 與 host 設定。
- staging 使用不同 RP ID 與資料庫，不共用 production credential。

若只使用 IP、臨時 hostname 或會變動的內網名稱，不適合直接建立正式 passkey 帳號。

## 13. 帳號恢復與營運邊界

MVP 沒有人工客服覆核身分。若所有 passkey 與恢復碼都遺失：

- 操作者不能僅憑口頭要求直接重設帳號。
- 第一階段個人自架版本可透過主機上的受限維運程序建立帳號恢復事件，但流程必須明確記錄，且不能讀出既有 passkey 私鑰。
- 多使用者版本上線前，必須重新設計可稽核的帳號恢復政策。

為降低鎖定風險，首次設定應鼓勵：

- 將 passkey 同步於可靠的憑證管理工具，或
- 登錄第二把裝置／硬體安全金鑰，並
- 將恢復碼離線保存在不同位置。

## 14. MVP 驗收條件

- 未登入使用者無法讀取學習資料。
- 使用者能以 passkey 建立帳號並再次登入。
- 錯誤 origin、RP ID、challenge 或簽章均被拒絕。
- Challenge 過期或重放會失敗。
- 一位使用者可新增第二把 passkey。
- 恢復碼只能使用一次，資料庫沒有明文。
- 恢復 session 必須新增 passkey 才能恢復完整權限。
- 使用者無法刪除唯一登入方式而鎖住自己。
- 登出與撤銷 session 後 token 不再有效。
- 不同使用者的 passkey、session 與學習資料無法互相存取。
- HTTP 正式環境不能使用 WebAuthn；只能透過 HTTPS。

## 15. 實作原則

- 使用成熟且持續維護的 WebAuthn 伺服器函式庫，不自行實作簽章與資料格式解析。
- 在確定 Next.js 版本與驗證方案時，再評估相容的函式庫。
- 針對註冊、登入、重放、錯誤 origin、撤銷與恢復撰寫整合測試。
- WebAuthn 設定由明確環境變數提供，啟動時驗證，不能從任意 request header 動態信任 RP ID 或 origin。

## 16. 參考依據

- W3C WebAuthn 規格：credential 綁定 RP，伺服器必須驗證 challenge、RP ID、origin 與 assertion。
- MDN Web Authentication API：WebAuthn 以公鑰密碼學提供 passkey，且只能在安全環境使用。
- OWASP 驗證與 MFA 指引：帳號恢復是另一條驗證路徑，不應弱於主要登入方式；需防止枚舉、重放與濫用。

