# Changelog

仓库版本记录工具与配置快照；sing-box 内核版本用于选择和验证配置。

## Unreleased

### 新增与调整

- 网页与 Node.js CLI 共用节点解析和配置生成逻辑，支持五种分享链接及原生节点 JSON。
- 提供节点文件导入/导出、完整配置下载与预览；修改输入后禁用旧结果，离开页面清空节点。
- 五个平台统一使用 `platforms/<平台>/<版本>/`，共 51 份配置；支持 1.13 / 1.14，1.15 实验版固定按 `1.15.0-alpha.12` 验证。
- 配置片段与场景组合统一在 `modules/`，构建和验证入口为 `scripts/build.py`、`scripts/check.py`。
- 三套内核集成测试、102 种双语网页组合、下载与重新导入测试，以及 macOS 工具检查。

### 修复

- 修复旧版 Shadowsocks Base64 分享链接中特殊字符密码被误解析或静默修改的问题，保留原始密码与 IPv6 地址。
- 拒绝 WebSocket / HTTPUpgrade Host 中的 ASCII 控制字符，覆盖分享链接、原生 JSON 及 Host 数组，防止请求头注入。
- 限制 JSON 嵌套深度为 100 层，深层输入返回安全的双语错误。
- 公共审计遇到解析或读取失败时明确报错；私有节点和外部私人仓不参与扫描。
- 节点生成器支持 `udp_outbounds: []`，可生成纯 TCP 配置；移除空 UDP 策略组，
  明确拒绝需要代理的 UDP，保留既有国内及局域网直连规则。
- 拒绝通过相对路径别名、符号链接或硬链接覆盖节点文件与模板。
- 为 iOS FakeIP / RealIP 添加局域网、链路本地、回环、组播、有限广播和 CGNAT
  排除路由（[#1](https://github.com/qixuancao/sing-box-config-templates/issues/1)）。
  根据源模板自动扣除 TUN、虚拟 DNS 与 FakeIP 网段，不整段排除包含 TUN 的
  私网；其余平台与隐私模板保持原有策略。
- 清理使用文档中的过时迁移说明，修正规则集检查范围与 Android 专属场景说明。
- 静态检查覆盖所有公开 Markdown 的本地链接目标。

## v0.1.0

首个仓库版本。发布时使用的 sing-box 内核：`1.14.0`（多平台与 Android 1.14）、
`1.13.21`（Android 1.13）、`1.12.25`（Android 1.12）。

### 新增

- Android SFA 八种场景 × 1.12 / 1.13 / 1.14 三条兼容线，以及 iOS SFI、macOS
  SFM、Linux、Windows 配置，共 45 个公开 JSON；
- 顶层 `$schema`（`https://sing-box.sagernet.org/schema.json`）：templates、
  顶层 current、Android 1.14、iOS / macOS / Linux / Windows 的 1.14 配置携带，
  Android 1.12 / 1.13 由同步脚本删除并由 CI 正反断言；
- GitHub Pages 配置选择器（中文首页 + 英文 `/en/`，纯本地运行），含独立
  title、meta description、canonical、zh-CN/en hreflang、Open Graph、Twitter
  Card、SoftwareSourceCode 与 FAQ 的 JSON-LD、`sitemap.xml`；
- `PRIVACY.md` 默认外联披露、`THIRD_PARTY.md` 补充 jsDelivr / gstatic /
  AliDNS / Google Public DNS、`SECURITY.md` 指向私密报告入口；
- 功能请求与新版本支持 Issue Form、`CHANGELOG.md`。

### 链接策略

- `main` 链接继续作为滚动稳定入口（45 条 Raw URL、36 条 import URI 保持可用）；
- tag 不可变快照示例（以 Android 1.14 FakeIP 为例）：

```text
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/v0.1.0/platforms/android/1.14/fakeip.json
```

```text
sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fv0.1.0%2Fplatforms%2Fandroid%2F1.14%2Ffakeip.json#Android%201.14%20FakeIP
```

### 验证

- `bash -n scripts/*.sh`、`sync-platforms.sh --check`、`audit-public.sh`、
  `check-links.sh`、`check-pages.sh`；
- 官方 `1.14.0` 检查 current / 1.14、官方 `1.13.21` 检查 Android 1.13、官方
  `1.12.25` 检查 Android 1.12；
- 三个版本均下载并解析全部 17 个远程 `.srs`（每周 CI）。
