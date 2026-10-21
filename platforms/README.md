# 平台配置入口

所有平台先选择 `1.14/` 或 `1.13/`，再选择配置文件。目录中的版本号对应 sing-box 内核版本。

| 目录 | 客户端 / 运行方式 | 推荐配置 |
| --- | --- | --- |
| [`android/`](android/) | sing-box for Android (SFA)，1.14/1.13 兼容线 | 先选内核版本，再选用途 |
| [`ios/`](ios/) | sing-box for Apple (SFI) | `fakeip.json` |
| [`macos/`](macos/) | sing-box for macOS (SFM) 或命令行 | `fakeip.json` / `mixed.json` |
| [`linux/`](linux/) | 官方命令行 / systemd | 先 `mixed.json`，再按需用 `tun.json` |
| [`windows/`](windows/) | 官方命令行 | 先 `mixed.json`，再按需用 `tun.json` |

这里的 JSON 都只有公开占位节点。请先按
[`../docs/getting-started.md`](../docs/getting-started.md) 生成私有配置。

平台目录由 [`../scripts/sync-platforms.sh`](../scripts/sync-platforms.sh)
从兼容模板确定性生成，CI 会拒绝未同步的修改。
