# 平台配置入口

所有平台先选择内核版本，再选择配置文件，统一使用 `<平台>/<版本>/<场景>.json`。
`1.14/` 和 `1.13/` 为稳定兼容线；`1.15/` 标记为**实验版**，按 `1.15.0-alpha.12` 验证。

| 目录 | 客户端 / 运行方式 | 推荐配置 |
| --- | --- | --- |
| [`android/`](android/) | sing-box for Android (SFA) | 先选内核版本，再选用途 |
| [`ios/`](ios/) | sing-box for Apple (SFI) | `fakeip.json` |
| [`macos/`](macos/) | sing-box for macOS (SFM) 或命令行 | `fakeip.json` / `mixed.json` |
| [`linux/`](linux/) | 官方命令行 / systemd | 先 `mixed.json`，再按需用 `tun.json` |
| [`windows/`](windows/) | 官方命令行 | 先 `mixed.json`，再按需用 `tun.json` |

这里的 JSON 都只有公开占位节点。请先按
[`../docs/getting-started.md`](../docs/getting-started.md) 生成私有配置。

平台目录由 [`../scripts/build.py`](../scripts/build.py)
从[配置模块](../modules/README.md)和 `presets/` 确定性生成，CI 会拒绝未同步的修改。
1.15 的适配差异与验证边界见[实验版说明](../docs/experimental-1.15.md)。
