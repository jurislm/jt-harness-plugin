# JT Harness Plugin

JurisLM 的 skills-only portable OpenAI/Codex Plugin。它提供以 Linear issue 為需求來源的端到端交付工作流：釐清、worktree、TDD、PR、review、merge、驗收與 Linear readback。

## 安裝

```bash
codex plugin marketplace add https://github.com/jurislm/jt-harness-plugin --ref main
codex plugin add jt-harness-plugin@jurislm-jt-harness
```

安裝後請開啟新的 Codex session，讓 Skills 重新載入。

## Skills

公開入口：

- `using-jt-workflow`：紀律與 Skill 選用。
- `engineering-delivery`：單一 Linear issue 的端到端交付 coordinator。

由 `engineering-delivery` 調用的內部 Skill：

- `delivery-preflight`
- `external-review-gate`
- `merge-gate`
- `acceptance-readback`

本 Plugin 不提供 MCP server、slash commands、OAuth 或 hosted endpoint。

版本以 GitHub Release 發布；此 skills-only Plugin 不發布 npm package。

## 授權與依賴

指向一個 Linear issue 並要求交付，即授權流程走到合併與驗收；真實歧義、重大風險、secret、缺少權限或不可逆 production mutation 才會暫停。

工作流依賴：

- `superpowers:*` Skills
- Linear MCP 或使用者提供的 Linear issue 內容
- `coderabbit:code-review` Skill

## License

UNLICENSED
