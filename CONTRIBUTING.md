# Contributing

欢迎补充平台说明、修复规则顺序或增加经过验证的配置变体。请保持一次提交只
解决一个可说明的问题。

## 提交前

同步与检查需要 Bash、`jq`、Python 3（仅标准库）、Node.js 22+ 和带 PCRE2 的 `ripgrep`；
网页无需安装这些工具，CLI 生成只需要 Node.js。iOS 排除路由的生成源位于
`scripts/ios_route_excludes.py`，不要直接维护拆分后的 CIDR 列表。

```bash
./scripts/sync-platforms.sh --check
python3 -B scripts/check-ios-routes.py
./scripts/audit-public.sh
./scripts/check-links.sh
./scripts/check-pages.sh
node --test tests/generator.test.mjs
node scripts/check-browser.mjs # 需要本机 Chrome，可用 CHROME 指定路径
SING_BOX=/path/to/sing-box-1.14 ./scripts/check.sh
SING_BOX=/path/to/sing-box-1.13.21 ./scripts/check-platform-version.sh 1.13
SING_BOX=/path/to/sing-box-1.14.0 python3 -B scripts/check-render.py
```

节点渲染检查也应使用 1.13 检查器运行，CI 覆盖这两个版本的所有平台。

修改远程规则 URL 或准备发版时，再用对应检查器运行
`./scripts/check-rule-sets.sh 1.xx`。该检查需要联网，平时由每周 CI 执行。

若修改 `templates/`，运行 `./scripts/sync-platforms.sh`，同时更新平台文件和浏览器模板包。
修改页面结构或翻译后运行 `python3 -B scripts/build-pages.py`。模块分工与公共 API 见
[模块结构](docs/architecture.md)。新协议的测试应分别带 `SING_BOX` 环境变量用两个内核运行。

## PR 与 Issue

修复已有 Issue 时，在 PR 正文写 `Fixes #编号`（例如 `Fixes #1`）。PR 合并到
默认分支后，GitHub 会自动关闭对应 Issue。跨仓库使用 `Fixes owner/repo#编号`。
仅讨论或部分处理问题时使用 `Refs #编号`，由后续完整修复关闭。

提交 PR 时说明修复内容和验证结果，并检查关联的 Issue 是否与改动相符。

## Issue 最少信息

- 操作系统与版本；
- SFA / SFI / SFM / CLI 版本；
- 配置相对路径；
- 预期行为与实际行为；
- 删除服务器、域名、IP、端口、密码、UUID、密钥和订阅 token 后的日志。

不要上传完整私有配置。若凭据已经公开，先轮换，再处理 Git 历史。

## 设计约束

- 目标语法保持在 README 声明的 sing-box 版本；
- 平台配置只放在 `1.13/` 和 `1.14/`，新变体同步生成两条版本线，并用各自固定核心检查；
- 不加入真实节点、付费订阅或绕过授权的服务；
- 平台不支持的字段不能只因为 schema 接受就写入；
- 新规则集必须有稳定来源、清晰用途和故障退路；
- 不把庞大静态列表复制到每份配置。
