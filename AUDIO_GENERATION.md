# LaLea 固定音訊產生流程

固定教材採用 Linux 本機 Piper，預設聲音為 `en_US-lessac-medium`（22,050 Hz）。Piper 只在離線產生階段執行；Next.js production 服務不安裝或呼叫 TTS。

## 產生與審核

1. 建立獨立 Python 環境並安裝 `piper-tts==1.6.0`。
2. 執行 `python3 -m piper.download_voices en_US-lessac-medium --data-dir <voice-dir>`。
3. 設定 `PIPER_DATA_DIR=<voice-dir>`，執行 `pnpm audio:generate`。
4. 將 `audio/generated` 複製到伺服器受管理的媒體目錄；該目錄不進 Git。
5. 執行 `pnpm audio:import`。文字、checksum、時長與來源通過驗證後，狀態會成為 `needs_review`。
6. 人工聽完後執行 `pnpm audio:review <asset-uuid> approved`；有問題則使用 `rejected`。

只有 `approved` 音訊可視為正式教材。重新執行 seed 不會覆蓋審核狀態。manifest 保存模型、雜湊與授權來源，實際部署時另以 lockfile 或映像鎖定 Piper patch 版本。
