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

`fakeip.json` 和 `realip.json` 默认设置 `route_exclude_address`，让常见私网、
CGNAT（`100.64.0.0/10`）、回环、链路本地、IPv4/IPv6 组播与 IPv4 有限广播
流量绕过 TUN。这样访问路由器、NAS 或发现本地设备时，不必先经过 sing-box
用户态转发。此默认值只用于本目录，其他平台与 `privacy-strict` 不继承它。

排除列表由 `scripts/lib/ios_routes.py` 根据源模板生成，保留：

- TUN 子网 `172.19.0.0/30`，包括接口 `172.19.0.1` 和默认虚拟 DNS
  `172.19.0.2`；所以 `172.16.0.0/12` 会拆成多个 CIDR，不能直接整段排除。
- FakeIP 地址池 `198.18.0.0/15`。修改生成源时，脚本也会保留显式
  `dns_address`、IPv6 TUN 子网与 IPv6 FakeIP 地址池；不要手工把它们排除。

IPv6 ULA、链路本地和组播绕行只用于本地通信。模板仍抑制 AAAA 查询、保留
公网 IPv6 拒绝规则，没有变成公网双栈配置。

绕行流量不会进入 sing-box 的分流、DNS 劫持、广告过滤或协议拦截规则，Global
模式也不能覆盖这些系统路由。应用主动查询局域网 DNS 时会直接访问该 DNS；
系统使用的虚拟 DNS 仍留在 TUN 内。需要通过代理访问某个私网/企业网/覆盖网络，
或要求 DNS 全部由 sing-box 处理时，请在自己生成的配置中删除相应排除项，
需要取消全部绕行则删除 `route_exclude_address` 字段。

此策略针对 SFI 普通路由模式。启用 **Include All Networks（包含所有网络）**
会改变系统流量接管方式，不能假定 JSON 排除项仍有同样效果；依赖局域网绕行
时请关闭该选项并重新连接。路由排除也不会自动解决局域网域名解析，需分别
检查本地 IP 访问和域名访问。

依据：[sing-box TUN 字段](https://sing-box.sagernet.org/configuration/inbound/tun/#route_exclude_address)、
[虚拟 DNS 默认地址](https://sing-box.sagernet.org/configuration/inbound/tun/#dns_address)、
[Apple 路由说明](https://developer.apple.com/documentation/networkextension/routing-your-vpn-network-traffic)。
自动检查覆盖排除范围、保留地址和配置语法；局域网发现、IPv6 与不同 iOS/SFI
版本的实际效果仍需设备验证。
