# Changelog

仓库版本与 sing-box 内核版本是两回事：

- **仓库版本**（如 `v0.1.0`）：本仓库模板、脚本与文档的快照版本，用于不可变
  Raw URL 与 Release 说明；
- **sing-box 内核版本**（如 `1.14.0` / `1.13.21` / `1.12.25`）：SagerNet
  上游的实际运行版本，本仓库用其做 `sing-box check` 与规则集解析验证。

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

旧路径未删除，`templates/*.json` 继续可用。

### 验证

- `bash -n scripts/*.sh`、`sync-platforms.sh --check`、`audit-public.sh`、
  `check-links.sh`、`check-pages.sh`；
- 官方 `1.14.0` 检查 current / 1.14、官方 `1.13.21` 检查 Android 1.13、官方
  `1.12.25` 检查 Android 1.12；
- 三个版本均下载并解析全部 17 个远程 `.srs`（每周 CI）。
