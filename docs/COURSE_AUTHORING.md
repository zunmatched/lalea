# LaLea 課程 Authoring 流程

固定課程內容用結構化 JSON 檔案撰寫，透過 `pnpm courses:import` 匯入資料庫，不透過網頁介面編輯。

## 寫一個課程檔

```json
{
  "slug": "reschedule-meeting-v2",
  "title": "課程標題",
  "units": [
    {
      "title": "單元標題",
      "estimatedSeconds": 180,
      "exercises": [
        {
          "type": "reading_choice",
          "prompt": "題目文字",
          "context": "選填，閱讀題的情境句",
          "options": [{ "id": "a", "text": "選項一" }, { "id": "b", "text": "選項二" }],
          "correctIds": ["a"],
          "feedbackCorrect": "答對時顯示的說明",
          "feedbackIncorrect": "答錯時顯示的說明"
        },
        {
          "type": "listening_choice",
          "prompt": "題目文字",
          "speech": "要轉成音檔的英文句子",
          "speechTranslation": "選填，該句子的繁中翻譯",
          "options": [{ "id": "a", "text": "選項一" }],
          "correctIds": ["a"],
          "feedbackCorrect": "...",
          "feedbackIncorrect": "..."
        },
        {
          "type": "chunk_ordering",
          "prompt": "題目文字",
          "options": [{ "id": "a", "text": "句塊一" }, { "id": "b", "text": "句塊二" }],
          "correctIds": ["a", "b"],
          "feedbackCorrect": "...",
          "feedbackIncorrect": "..."
        },
        {
          "type": "branched_dialogue",
          "prompt": "對話情境",
          "options": [{ "id": "a", "text": "合適的回應" }, { "id": "b", "text": "不合適的回應" }],
          "correctIds": ["a"],
          "feedbackCorrect": "...",
          "feedbackIncorrect": "..."
        }
      ]
    }
  ]
}
```

四種題型都要有 `options`／`correctIds`／`feedbackCorrect`／`feedbackIncorrect`；`chunk_ordering` 的 `options` 順序就是正確順序（前端會自動打亂顯示，`correctIds` 需與 `options` 順序一致）。

## 匯入

```bash
pnpm courses:import path/to/course.json
```

- 第一次執行會建立課程、單元、題目，並把產生的 `id`／`versionId` **寫回原始檔案**。
- 之後修改同一個檔案（文字內容不變，只是改內容）重跑同一個指令，會用寫回的 `id` 做更新，不會重複建立——所以檔案裡出現 `id` 欄位是正常的，請保留、不要手動刪除，除非真的想建立全新的一份。
- 單元的 `position`（決定在首頁「繼續學習」的排序）會自動接在既有單元後面。

## 聽力題音檔

`listening_choice` 題目預設 `generateAudio: true`，匯入時會自動建立一筆 `pending_generation` 狀態的音訊資產（`audio_assets`），接續原本的音訊流程：

```bash
PIPER_DATA_DIR=~/.piper-voices/lalea LALEA_PYTHON=~/.venvs/lalea-audio/bin/python3 pnpm audio:generate
pnpm audio:import
pnpm audio:review <asset-uuid> approved
```

只有 `approved` 的音檔才會真正播給使用者聽（未審核前一律降級成瀏覽器語音）。

**若之後修改 `speech` 文字重新匯入**：對應的音訊資產會自動重設為 `pending_generation`（即使原本已 `approved`），代表舊音檔不再對應新文字，需要重新產生與審核。腳本會在終端機印出提醒。

## 不會做的事

- 不做網頁版編輯介面，只有檔案 + 指令。
- 不驗證題目「好不好」（教學品質、答案是否唯一合理），只驗證資料格式；內容正確性靠自己檢查。
- 不會刪除已存在但這次檔案裡拿掉的單元/題目——目前只支援新增與更新，要刪除需要直接操作資料庫。
