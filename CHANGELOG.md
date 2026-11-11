# Changelog

仓库版本记录工具与配置快照；sing-box 内核版本用于选择和验证配置。

## Unreleased

### 新增与调整

- 聚焦日常分流与本地生成：保留基础接入和 DNS 配置，移除六个 Android 专项场景及默认广告拦截。
- 网页与 CLI 共用接入、DNS（含 DNSPod `1.12.12.12`）、IPv6、LAN 绕行、可选 `category-ads-all` 广告拦截、经代理下载规则集及桌面端本地 Clash API 控制器选项；IPv6 同步调整 DNS、TUN 地址和路由，mixed 禁用 FakeIP。
- TUN 按版本共享基础模块，叠加平台差异；LAN 排除路由保护 TUN、虚拟 DNS 和 FakeIP 地址。
- TCP/UDP 遵循同一套应用策略；自动组使用已声明支持 UDP 的节点（没有时使用全部节点），手动选择不会静默换出口。
- 统一使用 10 分钟 URLTest、warn 日志和默认跟随主选择的应用组；生成配置时各应用策略组同时加入全部节点，方便为 AI、流媒体等单独指定节点。
- 网页与 Node.js CLI 共用节点解析和配置生成逻辑，支持 Naive HTTPS、Hysteria2（含 `mport` 端口跳跃与带宽参数）、TUIC、AnyTLS、Trojan、VLESS、VMess、Shadowsocks、SOCKS5 分享链接（含 WebSocket `?ed=` Early Data）、整段 Base64 订阅内容解码及原生节点 JSON。
- 提供节点文件导入/导出、完整配置下载与预览；修改输入后禁用旧结果，离开页面清空节点。
- 五个平台统一使用 `platforms/<平台>/<版本>/`，共 33 份配置；支持 1.13 / 1.14，1.15 实验版固定按 `1.15.0-alpha.13` 验证。
- 配置片段与场景组合统一在 `modules/`，构建和验证入口为 `scripts/build.py`、`scripts/check.py`。
- 三套内核集成测试、双语网页组合、下载与重新导入测试，以及 macOS 工具检查。
- Raw 链接清单由平台目录声明自动生成；集中提供默认值与配置取舍说明。

### 修复

- 调整路由与 DNS 规则优先级：将已知海外服务规则（如 `google`、`youtube`、`category-ai-!cn`）置于 `geosite-cn` 之前，避免 `googleapis.cn`、`gstatic.cn`、`ggpht.cn` 等域名在 Android 等环境下被误判为国内直连；同时将路由 `resolve` 移至域名分流规则之后、仅用于未知域名的 `geoip-cn` / 私网 IP 兜底，保留代理出站（含链式 SOCKS5）的原始域名与 FakeIP 0-RTT 建连（[#6](https://github.com/qixuancao/sing-box-config-templates/issues/6)）。
- 修复 Android TUN 配置缺少 `route.auto_detect_interface` 的问题，覆盖三条内核兼容线及网页/CLI 生成结果（[#4](https://github.com/qixuancao/sing-box-config-templates/issues/4)）；不默认启用 `override_android_vpn`，Android 上下行仍需实机复测。
- 将 1.15 实验检查器及双语界面统一到 alpha.13，补充出站组成员唯一性测试；纠正 TUN `stack` 弃用时间和实验配置数量说明。
- 修复旧版 Shadowsocks Base64 分享链接中特殊字符密码被误解析或静默修改的问题，保留原始密码与 IPv6 地址。
- 拒绝 WebSocket / HTTPUpgrade Host 中的 ASCII 控制字符，覆盖分享链接、原生 JSON 及 Host 数组，防止请求头注入。
- 限制 JSON 嵌套深度为 100 层，深层输入返回安全的双语错误。
- 公共审计遇到解析或读取失败时明确报错；私有节点和外部私人仓不参与扫描。
- 节点生成器支持 `udp_outbounds: []`，保留纯 TCP 节点与应用、直连策略。
- 拒绝通过相对路径别名、符号链接或硬链接覆盖节点文件与模板。
- 为 iOS FakeIP / RealIP 添加局域网、链路本地、回环、组播、有限广播和 CGNAT
  排除路由（[#1](https://github.com/qixuancao/sing-box-config-templates/issues/1)）。
  根据源模板自动扣除 TUN、虚拟 DNS 与 FakeIP 网段，不整段排除包含 TUN 的
  私网。
- 清理使用文档中的过时说明，修正规则集检查范围。
- CLI 对 TUN 搭配 `--port`、非 TUN 搭配 FakeIP、无效端口和 DNS 服务商给出明确错误，不再提示“更新页面”。
- CI 每周增加 1.15 实验版规则集检查，功能分支仅经 PR 触发一次验证；修正 Android 目录说明中的配置数量。
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
