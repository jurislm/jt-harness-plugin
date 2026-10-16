# JT Harness Plugin

JurisLM 的 Codex／Cursor Plugin，包含唯一的軟體工程交付 Skill：[`using-jt-harness`](skills/using-jt-harness/SKILL.md)。若目前主機已安裝，工程方法優先使用官方 [Pstack](https://github.com/cursor/plugins/tree/main/pstack)；JT 保持交付政策的唯一來源，不複製另一套方法框架。

官方網站：[JT Harness Plugin](https://jurislm.github.io/jt-harness-plugin/)

## 安裝

### Codex

```bash
codex plugin marketplace add https://github.com/jurislm/jt-harness-plugin --ref main
codex plugin add jt-harness-plugin@jurislm-jt-harness
```

安裝或更新後，開啟新的 Codex session，讓 Skill 重新載入。

### Cursor

在 Cursor 的 Customize → Plugins 選擇 From GitHub Repository，輸入 `https://github.com/jurislm/jt-harness-plugin`，然後安裝 `jt-harness-plugin`。更新後重新載入 Cursor，並確認 `using-jt-harness` Skill 已出現。

## 範圍

本 Plugin 只提供 Skill，不提供 MCP server、slash commands、OAuth 或 hosted endpoint。版本透過 GitHub Release 發布，不發布 npm package。

## License

本 Plugin 採用 [MIT License](LICENSE)。
