# JT Harness Plugin

JurisLM 的自动触发 Codex Skill。在 Agent 开始软件开发、修 bug、代码审查、PR 或部署任务时提供交付规则，不编排独立 workflow。

唯一 Skill：`using-jt-harness`。

## 规则

- 开始开发前在 Linear 查找对应 issue；没有匹配项时创建追踪 issue，再记录开始状态。完成后更新结果、PR、审查、检查与合并状态。
- Coolify 资源使用 `coolify-plugin:coolify`；Hetzner Cloud 或 Storage Box 使用 `hetzner-plugin:hetzner`。
- 开发工法交给对应的 `superpowers:*` Skill；审查使用 `requesting-code-review` 和 `receiving-code-review`。
- Codex 与 CodeRabbit 各进行一次完整审查。Codex 的唯一审查使用 `requesting-code-review` 作为 PR 前清单；PR 开启时自动启动后，等待其完成并返回结果，再计为这一次。若没有自动审查启动，按清单手动请求一次。若自动运行失败或无结果，记录情况，不发起替代审查。CodeRabbit 自动审查启动时等待结果，不重复提及 `@CodeRabbit`；没有自动运行时手动请求一次，PR 管道受限时再用 CLI 一次。两种 CodeRabbit 管道都受限时依赖已完成的 Codex 审查。提交修正后只检查差异并验证修正，不触发增量或第二次完整审查。
- 处理审查意见并验证修正，不重复完整审查。确认目标 repo 的审批规则已满足、所有 findings 解决、必需检查通过且 PR 可合并后，自动合并；用户指定 review-only、draft 或不合并时除外。

## 安装

```bash
codex plugin marketplace add https://github.com/jurislm/jt-harness-plugin --ref main
codex plugin add jt-harness-plugin@jurislm-jt-harness
```

安装或更新后开启新的 Codex session，让自动触发的 Skill 重新载入。

本 Plugin 不提供 MCP server、slash commands、OAuth 或 hosted endpoint。版本以 GitHub Release 发布；此 skills-only Plugin 不发布 npm package。

## License

UNLICENSED
