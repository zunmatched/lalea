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

三種題型都要有 `options`／`correctIds`／`feedbackCorrect`／`feedbackIncorrect`。（原本還有一種點句塊排序的 `chunk_ordering`，因為只要看句塊的大小寫、標點符號跟長度就能用猜的、不用真的看懂句子，已經停用；同類需求請改用 `reading_choice` 寫成挖空選擇題，例如 `context` 用 `"Could you ______ me through the process?"`，`options` 放候選單字/片語，這樣才需要真的理解語意才能選對。）

## 多題共用一份素材（`group`）

多益 Part 1（看圖）、Part 3/4（一段對話/獨白配 2-3 題）、Part 6/7（一篇文章配多題）都是「一份素材、多道題目」，不是每題各自獨立。這種情況用 `type: "group"` 包起來，不要把同一篇文章/音檔複製貼到每一題：

```json
{
  "type": "group",
  "context": "選填，共用的文章全文或對話逐字稿",
  "image": "選填，圖片檔名，例如 toeic-p1-office-desk.jpg（要先用 pnpm images:import 匯入）",
  "speech": "選填，共用的音檔文字（有這個欄位，底下每一小題的題型會自動變成 listening_choice；沒有就是 reading_choice）",
  "speechTranslation": "選填",
  "generateAudio": true,
  "questions": [
    { "prompt": "第一小題", "options": [{ "id": "a", "text": "選項一" }], "correctIds": ["a"], "feedbackCorrect": "...", "feedbackIncorrect": "..." },
    { "prompt": "第二小題", "options": [{ "id": "a", "text": "選項一" }], "correctIds": ["a"], "feedbackCorrect": "...", "feedbackIncorrect": "..." }
  ]
}
```

- `context`／`image`／`speech` 只需要寫一次，`questions` 底下每一小題只放自己的 `prompt`／`options`／`correctIds`／`feedbackCorrect`／`feedbackIncorrect`，畫面上每一小題都會自動帶出同一份文章/圖片/音檔。
- `questions` 陣列裡每個小題匯入後都會變成一筆獨立的 `exercises` 資料列（跟獨立題目一樣可以各自作答、各自計分），只是共用同一個 group 的素材。
- Part 1（看圖敘述）：通常只放 `image` + `speech`（單句敘述音檔）+ 一題 `questions`。
- Part 3/4（對話/獨白）：`context` 放逐字稿、`speech` 放同一段文字讓系統轉語音，`questions` 放 2-3 題。
- Part 6/7（段落填空/閱讀理解）：只放 `context`（文章全文，填空題可以把空格直接寫在文章裡，例如 `"...relocate to the fourth floor ______ (1) further notice..."`），不用 `speech`，`questions` 放對應的每一題。

## 圖片（Part 1 專用）

圖片要自己準備檔案，不會自動產生。先把圖片複製進圖片資料夾：

```bash
pnpm images:import path/to/photo.jpg toeic-p1-office-desk.jpg
```

目標檔名只能用小寫字母、數字、連字號，副檔名限 `jpg`／`jpeg`／`png`／`webp`。複製完成後，在課程 JSON 的 `group.image` 填一樣的檔名（純檔名，不用寫路徑），`pnpm courses:import` 匯入時會檢查檔案是否存在，找不到會直接報錯並告訴你要先跑哪個指令。圖片實際存放在 `LALEA_IMAGE_DIR`（預設 `./images/uploaded`，不會進 Git），畫面上顯示的網址是 `/media/images/<檔名>`。

## 匯入

```bash
pnpm courses:import path/to/course.json
```

- 第一次執行會建立課程、單元、題目，並把產生的 `id`／`versionId` **寫回原始檔案**。
- 之後修改同一個檔案（文字內容不變，只是改內容）重跑同一個指令，會用寫回的 `id` 做更新，不會重複建立——所以檔案裡出現 `id` 欄位是正常的，請保留、不要手動刪除，除非真的想建立全新的一份。
- 單元的 `position`（決定在首頁「繼續學習」的排序）會自動接在既有單元後面。

## 聽力題音檔

`listening_choice` 題目、以及帶 `speech` 的 `group`，預設 `generateAudio: true`，匯入時會自動建立一筆 `pending_generation` 狀態的音訊資產（`audio_assets`，`group` 產生的音檔會掛在 group 底下、該 group 內所有小題共用同一份音檔），接續原本的音訊流程：

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
