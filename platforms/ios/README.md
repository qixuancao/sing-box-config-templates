# iOS / iPadOS

推荐 `fakeip.json`；个别应用异常时改用 `realip.json`。使用官方 Apple 客户端
SFI 导入生成后的本地文件或远程 HTTPS 配置，并允许系统创建 VPN。

官方入口与当前安装要求见
[sing-box for Apple platforms](https://sing-box.sagernet.org/clients/apple/)。

Apple NetworkExtension 没有实现 `strict_route`，也不支持 Android 的包名分流，
所以本目录不伪装提供这些能力。是否可从 App Store 或 TestFlight 安装可能随
时间和地区变化，请以官方页面为准。
