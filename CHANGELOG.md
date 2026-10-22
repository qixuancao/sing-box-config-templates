# Changelog

仓库版本与 sing-box 内核版本是两回事：

- **仓库版本**（如 `v0.1.0`）：本仓库模板、脚本与文档的快照版本，用于不可变
  Raw URL 与 Release 说明；
- **sing-box 内核版本**（如 `1.14.0` / `1.13.21` / `1.12.25`）：SagerNet
  上游的实际运行版本，本仓库用其做 `sing-box check` 与规则集解析验证。

## Unreleased

### 本地配置生成器

- GitHub Pages 从模板选择器升级为可下载完整 `sing-box.json` 的纯前端生成器。
- 支持 Naive HTTPS、Hysteria2、Trojan、Shadowsocks、VLESS 分享链接与原生节点 JSON。
- 配置源按 `modules/<类别>/<版本>/<方案>.json` 拆分 DNS、入站、路由与规则集，`presets/` 声明场景组合；完整配置由脚本生成。
- 增加标记为实验版的 1.15 配置，按 `1.15.0-alpha.12` 预备 17 份平台配置并验证，网页与 CLI 可主动选择；稳定默认保持 1.14。
- 网页和 Node.js CLI 共用模块；协议适配、节点校验、配置组合、平台目录与页面交互分开维护。
- 提供节点文件导入/导出、完整 JSON 预览/复制、修改输入后禁用旧结果、刷新清空节点。
- 默认使用平台推荐方案，高级设置提供 1.13 / 1.14、明确标记的 1.15 实验配置与全部场景；网页模板包与源配置同步检查。
- CLI 统一使用 Node.js 22+ 的 `scripts/generate.mjs`；UDP 列表省略时按节点能力推断。
- 增加三套真实内核的协议生成测试、102 种双语网页组合和实际 JSON 下载/重新导入测试。
- 增加模块结构、首次导入与更新节点指南。

### 目录与兼容版本

- 所有平台统一使用 `platforms/<平台>/{1.13,1.14,1.15}/`，共 51 份平台配置；1.15 标记为实验版。
- 将 1.15 从根目录实验区移入各平台的 `1.15/`，移除根目录 `experimental/` 及工具中的路径特判；旧实验路径不再维护。
- 删除平台同层无版本号的 JSON 别名和 Android `1.12/`；原无版本号链接需改为同平台 `1.14/` 路径。
- iOS、macOS、Linux、Windows 增加 1.13 兼容配置，生成器、选择器、Raw 链接及 CI 同步调整。
- 移除并停止维护 `templates/` 下的四份无平台通用配置，旧 `main/templates/*.json` Raw 链接不再可用，改用 `platforms/<平台>/<内核版本>/` 下的同名场景。
- 清理构建器的无平台分支、通用配置检查循环与测试依赖；`presets/` 组合配方与私有 `--template` 继续保留。

### 开发工具收敛

- 移除全部 8 个 Shell 脚本，构建与验证统一为 `scripts/build.py`、`scripts/check.py`；内部实现放在 `scripts/lib/`，回归测试归入 `tests/`。
- 配置、浏览器包和中英文页面使用同一构建入口；`--check` 只检查产物同步，不改写文件。
- 公共审计、订阅链接、页面安全、平台和场景契约改用 Python 标准库，不再依赖 Bash、jq 或 ripgrep。
- 默认验证入口覆盖静态检查、所选真实内核和 Chrome；规则集联网下载独立触发，缺少依赖或检查失败时不输出成功。
- 旧 `render.sh TEMPLATE NODES OUTPUT` 调用迁移为 `node scripts/generate.mjs --template TEMPLATE --input NODES --output OUTPUT`。
- CI 同步采用统一入口，macOS 验证构建与静态检查；内核测试补齐 1.15 的 TCP-only 渲染检查。

### 修复

- 修复旧版 Shadowsocks Base64 分享链接中特殊字符密码被误解析或静默修改的问题，保留原始密码与 IPv6 地址。
- 拒绝 WebSocket / HTTPUpgrade Host 中的 ASCII 控制字符，覆盖分享链接、原生 JSON 及 Host 数组，防止请求头注入。
- 限制节点与模板的 JSON 嵌套深度为 100 层，深层输入返回安全的双语错误，不再抛出裸堆栈溢出异常。
- 公共审计对解析或源文件读取失败明确报错，避免输出误导性的通过提示；扫描范围排除私人仓和本地节点输入。
- 节点生成器支持 `udp_outbounds: []`，可生成纯 TCP 配置；移除空 UDP 策略组，
  明确拒绝需要代理的 UDP，保留既有国内及局域网直连规则。
- 拒绝通过相对路径别名、符号链接或硬链接覆盖节点文件与模板。
- 为 iOS FakeIP / RealIP 添加局域网、链路本地、回环、组播、有限广播和 CGNAT
  排除路由（[#1](https://github.com/qixuancao/sing-box-config-templates/issues/1)）。
  根据源模板自动扣除 TUN、虚拟 DNS 与 FakeIP 网段，不整段排除包含 TUN 的
  私网；其余平台与隐私模板保持原有策略。
- 增加地址覆盖、IPv6 FakeIP 冲突与生成结果的回归检查，并说明 SFI 系统选项
  及局域网 DNS 绕行的限制。公共审计仅放行标准 CGNAT CIDR，仍拦截设备地址。

## v0.1.0

首个仓库版本。对应上游 sing-box 内核：`1.14.0`（当前多平台与 Android 1.14）、
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

在 v0.1.0 发布时，旧路径未删除，`templates/*.json` 继续可用；当前移除说明见 Unreleased。

### 验证

- `bash -n scripts/*.sh`、`sync-platforms.sh --check`、`audit-public.sh`、
  `check-links.sh`、`check-pages.sh`；
- 官方 `1.14.0` 检查 current / 1.14、官方 `1.13.21` 检查 Android 1.13、官方
  `1.12.25` 检查 Android 1.12；
- 三个版本均下载并解析全部 17 个远程 `.srs`（每周 CI）。
