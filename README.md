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

本 Plugin 提供單一交付政策 Skill 與本機 size gate script，不提供 MCP server、slash commands、OAuth 或 hosted endpoint。版本透過 GitHub Release 發布，不發布 npm package。

## 本機 PR size gate

在目標 repository 執行 `node /path/to/jt-harness-plugin/scripts/review-size-gate.mjs <實際PR目標ref> HEAD`。
在本 plugin 目錄也可用 `npm run review:size -- <實際PR目標ref> HEAD`。
輸出完整 JSON coverage，成功退出碼為 0，超過內部門檻為 1，無法可靠計數為 2。
預設 20 changed paths、500 新增加刪除行、100 KiB 文字 patch；既有更嚴限制優先。
可用第三參數 JSON 收緊門檻，例如 `'{"changedPaths":10}'`。超過門檻須按可驗收功能拆 PR。
大小通過不代表審查通過，完整規則與官方來源見 Skill。

本機入口需手動執行；`npm run validate` 執行 gate 與 CI 接線測試，未安裝 Git hook。
計數只涵蓋已提交的 merge-base 至 HEAD，未提交、已 stage 但未 commit、未追蹤檔都不計入。
下次交付時先核對 `git status` 並將預定範圍納入本機 commit，再以實際 PR target 執行 gate，通過後才首次 push。
commit、rebase 或 retarget 後須重跑；另需核對外部審查結果的 HEAD 與逐檔 coverage，此 script 不驗證外部審查狀態。

`.github/workflows/review-size.yml` 提供 `pull_request` CI 入口，以事件的 base/head SHA 與完整歷史執行同一 gate，超標或計數失敗會使 job 失敗。
workflow 需存在於遠端事件版本且 GitHub Actions 已啟用才會執行，涵蓋新 PR、更新 commit、重開與修改 target；僅本機修改不會啟用遠端檢查。
權限僅 `contents: read`，不使用 secrets 或 `pull_request_target`。此檢查未設為 required check，未修改 branch protection，不能保證禁止合併失敗的 PR。

## License

本 Plugin 採用 [MIT License](LICENSE)。
