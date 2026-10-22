# sing-box iOS 配置选择（SFI）

先确认 sing-box 内核版本，再进入对应目录：

| 内核版本 | 配置目录 | CI 检查器 |
| --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 |

推荐 `fakeip.json`；个别应用异常时改用 `realip.json`。使用官方 Apple 客户端
SFI 导入生成后的本地文件或远程 HTTPS 配置，并允许系统创建 VPN。

自 sing-box 1.14 起，iOS / tvOS 请从 App Store 安装新的 sing-box MT
（旧版 sing-box VT 用户需要重新安装新应用，不能直接升级继承）。
官方入口与当前安装要求见
[sing-box for Apple platforms](https://sing-box.sagernet.org/clients/apple/)，
版本说明见 [sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)。

Apple NetworkExtension 未实现 `strict_route`，也不支持 Android 包名分流。
客户端安装渠道与地区限制以官方页面为准。

## 局域网与链路本地流量

`fakeip.json` 和 `realip.json` 默认设置 `route_exclude_address`，
使局域网、链路本地与组播流量尽量绕过 TUN，同时保护 TUN、虚拟 DNS
和 FakeIP 地址池；回环网段在 iOS 上仍保留系统级绕行。
现在其他平台的 TUN 配置也采用同一套构建器，但 Android
**不会排除回环地址**，以规避 VpnService 的 `Bad address`。

关于各端差异、Global/隐私场景、Include All Networks 与实机验证限制，
请查阅[跨平台局域网绕行说明](../../docs/lan-bypass.md)。
