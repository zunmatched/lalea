# LaLea

LaLea 是以手機優先設計的職場語言學習網站。MVP 先提供一般商務英文短課，架構則以多使用者、多學習語言路徑為基礎。

## 技術

- Node.js 24 LTS、Next.js 16 App Router、TypeScript、Tailwind CSS
- PostgreSQL 17、Drizzle ORM code-first migration
- Vitest、React Testing Library、Playwright

## 本機啟動

需要 Node.js 24、pnpm 與 Docker Desktop。複製環境設定後執行：

```powershell
Copy-Item .env.example .env.local
docker compose up -d
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

網站位於 `http://localhost:3000`。PostgreSQL 開發與測試資料庫分別使用主機埠 `55432`、`55433`，避免與既有本機 PostgreSQL 衝突。seed 可安全重複執行。

## 驗證

```powershell
pnpm db:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`DEV_AUTH_ENABLED=true` 僅供開發。production build 或正式執行環境若啟用此設定，環境驗證會直接失敗。任何 `.env*`（除 `.env.example`）、生成音訊、備份、測試輸出與 build 產物都不會進入 Git。

## 範圍

產品與架構基準請參考 `PRODUCT_ARCHITECTURE.md`、`IMPLEMENTATION_ARCHITECTURE.md` 與 `MVP_DEVELOPMENT_CHECKLIST.md`。YouTube、自動 AI、開放式回答和專業課程不在目前 MVP 內。
