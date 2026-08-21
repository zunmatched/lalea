# LaLea MVP 資料模型與狀態規格

> 狀態：開發前草案  
> 最後更新：2026-08-21  
> 技術基線：PostgreSQL + Drizzle ORM  
> 原則：多使用者、多語言路徑、教材版本化、事件可追溯

## 1. 目的

本文件將已確認的產品流程轉換成資料邊界，作為未來建立 Drizzle schema 與 migration 的依據。這不是最終 SQL，也不代表已開始建立資料庫。

MVP 必須可靠支援：

- 多使用者資料隔離。
- 一位使用者擁有多條語言學習路徑。
- 課程與個人進度分離。
- 每題提交後立即保存。
- 中斷後從未完成題目續接。
- 閱讀、聽力與主動提取分開追蹤。
- 被動播放只記曝露，不直接提高掌握度。
- 額外詞彙先保存、補齊審核後再進入首次學習。
- 教材更新不改寫過去的作答證據。

## 2. 共通欄位與識別碼

### 主鍵

- 正式資料表預設使用 UUID。
- 公開 URL 不暴露容易枚舉的流水號。
- 課程內固定內容可額外有人工可讀 `slug`。

### 時間

- 資料庫使用具時區時間 `timestamptz`。
- 儲存 UTC，由介面依使用者時區顯示。
- 使用者偏好保存 IANA 時區，例如 `Asia/Taipei`。

### 共通稽核欄位

視資料表需要加入：

- `created_at`
- `updated_at`
- `created_by`
- `published_at`
- `archived_at`

已被學習事件引用的教材原則上不硬刪除；使用封存或建立新版本。

## 3. 語言與學習路徑

### `languages`

| 欄位 | 用途 |
| --- | --- |
| `id` | 主鍵 |
| `tag` | 標準化語言標籤，例如 `en`、`zh-Hant` |
| `display_name` | 語言顯示名稱 |
| `text_direction` | `ltr` 或 `rtl` |
| `metadata` | 該語言的可變處理資訊，使用 `jsonb` |

`tag` 必須唯一。

### `learning_paths`

| 欄位 | 用途 |
| --- | --- |
| `id` | 主鍵 |
| `slug` | 穩定路徑名稱 |
| `target_language_id` | 目標語言 |
| `support_language_id` | 解釋與翻譯使用的輔助語言 |
| `title` | 路徑名稱 |
| `domain` | 例如 `general-business` |
| `level_framework` | 例如 CEFR，可為空 |
| `status` | 草稿、發布或封存 |

同一目標語言可以有不同輔助語言、領域及程度的路徑。

### `user_learning_paths`

| 欄位 | 用途 |
| --- | --- |
| `id` | 主鍵 |
| `user_id` | 所屬使用者 |
| `learning_path_id` | 所選路徑 |
| `status` | 使用中、暫停或完成 |
| `estimated_level` | 目前程度估計 |
| `daily_goal_minutes` | 每日累計目標 |
| `started_at` | 開始時間 |

`user_id + learning_path_id` 在未封存狀態下應避免重複。

## 4. 使用者與偏好

### `users`

只保存 LaLea 需要的帳號識別與狀態，不將第三方登入憑證直接存入此表。

### `user_settings`

- `user_id`
- `ui_language_id`
- `timezone`
- `default_available_minutes`
- `default_environment_mode`
- `caption_preference`
- `default_audio_rate`
- `reduced_motion`

介面語言與學習路徑的輔助語言分開保存。

### `audio_preferences`

可先合併進 `user_settings`；只有設定逐漸增加時才拆表。MVP 所需設定：

- 中文解釋是否播放。
- 例句是否播放。
- 重複次數。
- 句子間隔。
- 預設循環方式。
- 停止計時器。

## 5. 課程與版本

### `courses`

代表穩定的課程身分，例如「請對方說明並確認理解」。

### `course_versions`

| 欄位 | 用途 |
| --- | --- |
| `id` | 課程版本主鍵 |
| `course_id` | 穩定課程身分 |
| `version_number` | 遞增版本 |
| `status` | 草稿、待審核、發布或封存 |
| `level` | 建議程度 |
| `content_schema_version` | 內容格式版本 |
| `published_at` | 發布時間 |

已發布版本不可直接覆寫。修正內容時建立新版本，使過去作答仍能指向原版本。

### `learning_units`

- `course_version_id`
- `position`
- `unit_type`
- `estimated_seconds`
- `required_environment`
- `content`：固定格式不足的題型資料可暫存於 `jsonb`

第一版 `unit_type`：

- `context_intro`
- `reading_choice`
- `listening_choice`
- `chunk_ordering`
- `naturalness_choice`
- `branched_dialogue`

### `exercises`

若一個單元包含多題，題目拆到此表：

- `learning_unit_id`
- `position`
- `exercise_type`
- `prompt`
- `answer_definition`
- `feedback_definition`
- `content_version`

答案與回饋使用有 schema 版本的 `jsonb`，但正確答案、選項 ID 與分支 ID 必須有穩定識別碼，不能只依選項顯示順序。

### 亂序原則

- 資料庫儲存固定選項 ID 與內容，不儲存「A／B／C」為答案。
- 顯示時以嘗試 ID 作為亂序種子，重整同一次作答時順序保持穩定。
- 新的一次嘗試使用新種子，產生不同順序。
- 作答事件保存使用者選擇的選項 ID 與當次顯示順序，便於還原問題。

## 6. 詞彙與詞義

### `lexemes`

代表一種語言中的寫法：

- `language_id`
- `canonical_form`
- `normalized_form`
- `lexeme_type`
- `metadata`

建議索引：`language_id + normalized_form`。

### `lexeme_forms`

保存詞形變化、替代拼法或縮寫，不把所有變體合併成一個無法追溯的字串。

### `lexeme_senses`

代表特定詞義與用法：

- `lexeme_id`
- `part_of_speech`
- `definition_language_id`
- `definition`
- `register`
- `domain`
- `status`
- `content_version`

### `sense_translations`

同一詞義可有多種輔助語言翻譯：

- `lexeme_sense_id`
- `language_id`
- `translation`
- `usage_note`
- `status`

### `examples`

- 所屬詞義或課程版本。
- 原句語言與文字。
- 翻譯語言與文字。
- 使用情境、正式程度與來源。
- 審核狀態與版本。

## 7. 個人詞彙與注入工作流

### `user_vocabulary`

| 欄位 | 用途 |
| --- | --- |
| `id` | 主鍵 |
| `user_learning_path_id` | 所屬使用者學習路徑 |
| `lexeme_sense_id` | 經確認的詞義；待補齊時可為空 |
| `status` | 待補齊、可開始、學習中、暫時忽略 |
| `added_at` | 加入時間 |
| `first_learned_at` | 首次學習完成時間 |

同一使用者學習路徑與詞義只建立一筆有效紀錄。

### `vocabulary_contexts`

保存個人遇到詞彙的上下文：

- `user_vocabulary_id` 或注入任務 ID。
- 原句。
- 使用者理解、備註與標籤。
- 來源類型、URL 或來源識別碼。
- 是否含敏感內容。

個人上下文預設不成為共用教材。

### `vocabulary_injection_tasks`

- `user_id`
- `learning_path_id`
- `raw_text`
- `normalized_text`
- `language_id`
- `status`
- `matched_lexeme_sense_id`
- `ai_task_schema_version`
- `ai_draft`
- `reviewed_by`
- `reviewed_at`
- `rejection_reason`

狀態：

```text
captured
→ needs_enrichment
→ needs_review
→ approved
→ ready_to_learn
```

旁支：`merged`、`rejected`、`cancelled`。

狀態轉換必須由允許的操作觸發，不能任意修改字串。

## 8. 學習工作階段與續接

### `learning_sessions`

代表一次開啟後的短暫學習期間：

- `user_learning_path_id`
- `available_minutes`
- `environment_mode`
- `device_class`
- `started_at`
- `ended_at`

它不是「一堂課完成紀錄」；使用者可在同一工作階段完成多個微型單元，也可跨工作階段完成一堂課。

### `unit_runs`

代表使用者進入某個單元的一次執行：

- `learning_session_id`
- `learning_unit_id`
- `course_version_id`
- `status`
- `started_at`
- `completed_at`
- `last_exercise_id`
- `shuffle_seed`

狀態：`in_progress`、`completed`、`abandoned`、`expired`。

首頁的「繼續未完成單元」查找最近一筆有效的 `in_progress` 執行。

### 續接規則

- 每題提交成功後才更新 `last_exercise_id`。
- 尚未提交的選項不保存為正式答案。
- 同一使用者同一時間原則上只保留一個主要 `in_progress` 單元。
- 課程版本被封存時，已開始的執行仍可完成原版本；安全問題除外。

## 9. 作答事件

### `exercise_attempts`

每次按下「確認答案」建立一筆不可變的嘗試：

- `id`
- `user_id`
- `user_learning_path_id`
- `unit_run_id`
- `exercise_id`
- `exercise_content_version`
- `attempt_number`
- `response_payload`
- `display_order`
- `is_correct`
- `feedback_code`
- `response_time_ms`
- `submitted_at`
- `client_event_id`

`client_event_id` 由前端產生並對使用者唯一，用來避免網路重送造成重複紀錄。

### 重答與清除畫面

- 重新開始的畫面狀態必須清除，不代表刪除歷史學習證據。
- 同一題再次提交建立新的 `exercise_attempts`，不覆寫上一筆。
- 排程器可採最後一次、第一次或整體表現，但計算規則與原始事件分離。
- 介面若顯示「重新開始」，需說明是新嘗試，不是假裝過去從未作答。

### 回饋規則

每次提交後，伺服器回傳：

- 正確或錯誤。
- 正確答案或正確順序。
- 固定回饋代碼及對應說明。
- 是否允許進入下一題。

前端不得在尚未顯示回饋前直接跳到下一題。

## 10. 掌握度與複習

### `mastery_states`

每一筆使用者詞義至少有三個面向：

- `reading_recognition`
- `listening_recognition`
- `active_recall`

每個面向保存：

- `state`
- `stability` 或可替換排程器需要的數值。
- `difficulty`。
- `last_reviewed_at`。
- `next_review_at`。
- `review_count`。
- `scheduler_version`。

建議唯一鍵：`user_vocabulary_id + mastery_dimension`。

### `review_events`

不可變的複習輸入事件：

- 所屬作答嘗試。
- 掌握度面向。
- 答題結果。
- 自評：忘記、困難、掌握或太容易。
- 排程前後狀態快照。
- 排程器版本。
- 建立時間。

若日後更換演算法，可由原始事件重新計算，而不是遺失歷史。

## 11. 音訊、字幕與曝露

### `audio_assets`

- 對應文字或教材版本。
- 語言與口音。
- 聲音識別資訊。
- 產生方式：預錄、本地 TTS 或瀏覽器 TTS。
- 語速。
- 儲存位置。
- 審核狀態。

瀏覽器 TTS 沒有固定音訊檔時仍可記錄產生方式與裝置回報的 voice metadata，但不假設各裝置聲音一致。

### `audio_play_events`

- `user_id`
- `learning_session_id`
- `audio_asset_id` 或文字內容版本
- `event_type`：開始、暫停、完成、跳過、重播
- `position_ms`
- `played_ms`
- `rate`
- `caption_mode`
- `client_event_id`
- `occurred_at`

純播放只增加曝露紀錄，不更新 `mastery_states`。

### `self_report_events`

純聽中的「不熟」與「想起來了」另存事件：

- 「不熟」可安排較早的正式複習。
- 「想起來了」權重低於可判定題目。
- 無回應不視為答錯。

## 12. 來源與內容審核

### `content_sources`

- 來源類型。
- URL 或外部識別碼。
- 授權或使用條件。
- 擷取方式。
- 建立者。
- 最後確認時間。

### `content_reviews`

- 被審核內容的類型與版本。
- 審核狀態。
- 審核者。
- 審核清單結果。
- 備註與時間。

AI 草稿、人工編寫與字典來源需分開標記。發布狀態不能只由「存在 AI 結果」推導。

## 13. 最小關聯圖

```text
users
  └─ user_learning_paths ─ learning_paths ─ languages
       ├─ learning_sessions
       │    └─ unit_runs ─ learning_units ─ course_versions ─ courses
       │         └─ exercise_attempts ─ exercises
       └─ user_vocabulary ─ lexeme_senses ─ lexemes
            ├─ vocabulary_contexts
            ├─ mastery_states
            └─ review_events

vocabulary_injection_tasks
  ├─ vocabulary_contexts
  └─ approved/merged → lexeme_senses → user_vocabulary
```

## 14. 安全與資料隔離

- 所有個人資料查詢以已驗證的 `user_id` 為邊界。
- API 不接受客戶端任意指定另一個 `user_id`。
- 操作者審核權限與一般學習權限分開。
- Codex／Claude 個人登入資訊不進入資料庫。
- 個人上下文及工作原句預設為私人資料。
- 對外匯出 AI 任務前保存去識別狀態與操作者確認紀錄。

## 15. 第一批 migration 建議順序

正式開發後分批建立，不一次提交所有未驗證表格：

1. `users`、`languages`、`learning_paths`、`user_learning_paths`。
2. `courses`、`course_versions`、`learning_units`、`exercises`。
3. `learning_sessions`、`unit_runs`、`exercise_attempts`。
4. `lexemes`、`lexeme_senses`、`sense_translations`、`user_vocabulary`。
5. `mastery_states`、`review_events`。
6. `audio_assets`、`audio_play_events`。
7. `vocabulary_injection_tasks`、`vocabulary_contexts`、內容審核表。

每批 migration 都應有唯一限制、外鍵、必要索引、回滾或修復方式及測試。

## 16. 開發前仍待確認

- 登入方式已決定採 Passkey + 一次性恢復碼；帳號刪除政策仍待確認。
- 第一版已預定 PostgreSQL 與應用程式部署在同一台 Linux 主機；仍需確認版本、連線與權限設定。
- 教材 `jsonb` schema 的正式版本格式。
- 排程器第一版採簡化規則或 FSRS 類模型。
- 學習事件與音訊事件的保留期限。
- 個人工作原句的加密與去識別需求。
- 瀏覽器 TTS 是否只用於原型，正式版是否預生成音訊。
