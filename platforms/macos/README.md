# sing-box macOS 配置选择（SFM / 命令行）

先确认 sing-box 内核版本，再进入对应目录：

| 内核版本 | 配置目录 | CI 检查器 |
| --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 |

TUN 默认绕行常见 LAN、链路本地及组播目标，并保留 TUN、虚拟 DNS 和 FakeIP 地址；`mixed.json` 不受影响。见[跨平台局域网绕行](../../docs/lan-bypass.md)。

- `fakeip.json`：SFM 图形客户端 TUN 首选。
- `realip.json`：SFM TUN 兼容模式。
- `mixed.json`：命令行本地 HTTP/SOCKS，监听 `127.0.0.1:2080`，不会自动接管
  全机流量。

SFM 不再从 macOS App Store 提供，请使用官方 Apple 客户端页面的 standalone
版本。standalone 不会自动继承旧应用的配置和设置，迁移前请先导出并按
[官方迁移说明](https://sing-box.sagernet.org/migration/)处理，版本背景见
[sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)。
命令行版可使用 Homebrew：

```bash
brew install sing-box
sing-box check -c generated/macos.json
sing-box run -c generated/macos.json
```

使用 `mixed.json` 时，需要在浏览器或系统网络设置里手动填写
`127.0.0.1:2080`。Apple NetworkExtension 未实现 `strict_route`，因此 GUI
配置中没有该字段。
