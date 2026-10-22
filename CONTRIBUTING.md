# Contributing

欢迎补充平台说明、修复规则顺序或增加经过验证的配置变体。请保持一次提交只
解决一个可说明的问题。

## 提交前

构建和静态检查需要 Python 3.10+（仅标准库）与 Node.js 22+；内核测试需要对应的
sing-box，浏览器测试需要 Chrome。iOS 排除路由由 `scripts/lib/ios_routes.py` 生成，
不要直接维护拆分后的 CIDR 列表。

开发入口只有两个：`scripts/build.py` 生成全部产物，`scripts/check.py` 执行验证。
内部实现位于 `scripts/lib/`，回归测试位于 `tests/`。
测试占位节点位于 `tests/fixtures/`，用户节点格式见 [docs/nodes.md](docs/nodes.md)。

```bash
python3 -B scripts/build.py
python3 -B scripts/build.py --check # 只检查，不改写产物
python3 -B scripts/check.py static # 构建同步、公共审计、文档/订阅链接、页面、单元测试
python3 -B scripts/check.py core --core 1.14 --sing-box /path/to/sing-box-1.14.0
python3 -B scripts/check.py core --core 1.13 --sing-box /path/to/sing-box-1.13.21
python3 -B scripts/check.py core --core 1.15 --sing-box /path/to/sing-box-1.15.0-alpha.12
python3 -B scripts/check.py browser # 需要本机 Chrome，可用 CHROME 指定路径
```

`python3 -B scripts/check.py` 默认依次执行 `static`、`core`、`browser`，内核检查器取
`--sing-box`、`SING_BOX` 环境变量或 PATH 中的 `sing-box`。缺少检查器或 Chrome 时明确失败，
不会把跳过当作通过。`core` 可自动识别版本，也可用 `--core` 防止误用；CI 覆盖三套固定内核的
公共配置、示例节点注入、TCP-only 行为与分享链接生成结果。

修改远程规则 URL 或准备发版时，再用对应检查器运行
`python3 -B scripts/check.py rule-sets --core 1.14 --sing-box /path/to/checker`。
规则集下载检查需联网，不包含在默认检查中，每周 CI 使用 1.13.21 / 1.14.0 执行。

配置源位于 `modules/<类别>/<版本>/`，版本、平台与全部场景组合统一在 `modules/catalog.json`。修改后运行
`python3 -B scripts/build.py`，同时更新平台文件、浏览器配置包与中英文页面。
`platforms/` 中的稳定与实验版 JSON 都由这些源生成。
修改页面结构或翻译后使用同一构建入口。模块分工与公共 API 见
[模块结构](docs/architecture.md)。新增协议应使用各个维护版本的 `core` 检查验证。

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
- 所有配置统一放在 `platforms/<平台>/<版本>/`；1.13 / 1.14 为稳定兼容线，
  1.15 在目录说明与网页中标记为实验版，用固定 alpha 检查器验证；
- 不加入真实节点、付费订阅或绕过授权的服务；
- 平台不支持的字段不能只因为 schema 接受就写入；
- 新规则集必须有稳定来源、清晰用途和故障退路；
- 不把庞大静态列表复制到每份配置。
