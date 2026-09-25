# JT Harness Plugin

JurisLM 的 skills-only portable OpenAI/Codex Plugin。它以 Notion 的專案、問題追蹤、功能要求與工程文件管理產品需求和開發任務，再完成 worktree、TDD、PR、review、merge、驗收與 Notion readback。

## 安裝

```bash
codex plugin marketplace add https://github.com/jurislm/jt-harness-plugin --ref main
codex plugin add jt-harness-plugin@jurislm-jt-harness
```

安裝後請開啟新的 Codex session，讓 Skills 重新載入。

## Skills

公開入口：

- `using-jt-workflow`：紀律與 Skill 選用。
- `product-management`：四個 Notion 資料庫的問題、需求、開發任務與專案管理。
- `engineering-delivery`：單一 Notion 開發任務的端到端交付 coordinator。

由 `engineering-delivery` 調用的內部 Skill：

- `delivery-preflight`
- `external-review-gate`
- `merge-gate`
- `acceptance-readback`

本 Plugin 不提供 MCP server、slash commands、OAuth 或 hosted endpoint。

版本以 GitHub Release 發布；此 skills-only Plugin 不發布 npm package。

## 授權與依賴

指向一個 Notion 開發任務並要求交付，即授權流程走到合併與驗收；真實歧義、重大風險、secret、缺少權限或不可逆 production mutation 才會暫停。

工作流依賴：

- `superpowers:*` Skills
- 可讀寫 Notion 四個資料庫與任務留言的 Notion 外掛或等價管道
- `coderabbit:code-review` Skill

## License

UNLICENSED
