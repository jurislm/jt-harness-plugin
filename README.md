# JT Harness Plugin

JurisLM 的 Codex／Cursor Plugin，包含一個軟體工程交付 Skill：[`using-jt-harness`](skills/using-jt-harness/SKILL.md)。Skill 內容涵蓋 Linear 追蹤、平台插件路由、審查與合併規則。完整規則以 Skill 為準。

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

UNLICENSED
