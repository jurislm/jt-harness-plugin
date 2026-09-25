---
name: delivery-preflight
description: >
  由 `engineering-delivery` 調用：單次查證本次交付的環境前提（版本控制、GitHub
  託管、remote 解析、案件管理管道），回傳 internal result。
---

## 回答的問題

這次交付的環境前提齊了嗎？

## 副作用

無。本 Skill 只做唯讀查證。

## 查證規則

**單次查證，不重試。**每一項都在同一次執行內查完，再一起回傳結果。

| 前提 | 不成立時 |
|---|---|
| 版本控制可執行，且當前目錄是其工作樹 | `halted / access_config` |
| repo 使用 git（而非其他 VCS） | `not_applicable` |
| 目標 repo 託管於 GitHub | `not_applicable` |
| 可用的 GitHub 事實來源至少一種（例如 `gh`、GitHub MCP、整合功能） | `halted / access_config` |
| remote 解析唯一，且 fetch／push 目標一致 | `halted / ambiguity` |
| Notion 四庫可讀，且開發任務頁有寫入管道；`功能要求` 具備 `記錄類型`、`工作項目 ID` 與 `對應需求` | `halted / access_config`；貼上的文字不能代替 Notion 案件與寫回 |

**版本控制與 Notion 案件是前提，不是工具選項**：不可用時停下。取得 GitHub 事實與
讀寫 Notion 的管道可替換；換管道後仍須讀回同一工作項目。

**外部審查管道不在此查證**——那由 `external-review-gate` 在需要時查，提早查會讓還沒
寫任何程式碼的案件就被擋下。

## 回傳

`ok` 時的 `payload`：

| 欄位 | 說明 |
|---|---|
| `remote` | 實際的 remote 名稱，不假設叫 `origin` |
| `ownerRepo` | `<owner>/<repo>` |
| `defaultBranch` | 預設分支名，不假設叫 `main` |
| `notionWorkspace` | 已讀回的 Notion 工作區名稱或 ID |
| `taskDataSource` | `功能要求` 資料來源 ID；不得以同名資料庫猜測 |

`halted` 時附 `blocked`（`kind`／`what`／`needed`）與 `recoverableByCode: false`。
