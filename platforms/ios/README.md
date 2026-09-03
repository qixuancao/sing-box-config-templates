# sing-box iOS 配置选择（SFI）

推荐 `fakeip.json`；个别应用异常时改用 `realip.json`。使用官方 Apple 客户端
SFI 导入生成后的本地文件或远程 HTTPS 配置，并允许系统创建 VPN。

自 sing-box 1.14 起，iOS / tvOS 请从 App Store 安装新的 sing-box MT
（旧版 sing-box VT 用户需要重新安装新应用，不能直接升级继承）。
官方入口与当前安装要求见
[sing-box for Apple platforms](https://sing-box.sagernet.org/clients/apple/)，
版本说明见 [sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)。

Apple NetworkExtension 没有实现 `strict_route`，也不支持 Android 的包名分流，
所以本目录不伪装提供这些能力。是否可从 App Store 或 TestFlight 安装可能随
时间和地区变化，请以官方页面为准。
