# 局域网与链路本地流量绕行

所有平台的 **TUN** 配置默认将常见私网、CGNAT、链路本地、组播及 IPv4
有限广播地址放入 `inbounds[].route_exclude_address`，尽量让路由器、NAS
和局域网发现流量直接走系统网络，不经过 sing-box 用户态。
**mixed / 本地 HTTP/SOCKS** 不设置此字段；Android
`privacy-strict` 保持完整接管策略，不继承绕行。

| 平台 | 行为 |
| --- | --- |
| Android / SFA | 绕行常见 LAN 地址；**不排除 `127.0.0.0/8`、`::1/128`**，规避 VpnService 的 `Bad address` |
| iOS / SFI | 继续排除局域网、回环、链路本地与组播 |
| macOS / SFM | TUN 配置排除常见本地网段；mixed 不受影响 |
| Linux | 仅 TUN（含 `auto_redirect`）配置绕行；mixed 不受影响 |
| Windows | 仅 TUN 配置绕行；mixed 不受影响 |

**地址保护**：生成器读取对应模板的 TUN 子网（包括 `172.19.0.0/30`）、
显式或默认虚拟 DNS 地址（例如 `172.19.0.2`）以及 IPv4/IPv6 FakeIP 池，
自动从排除列表中扣除这些保留网段。因而 `172.16.0.0/12` 会被拆为多个 CIDR，
不能直接整段排除 TUN 网段。修改源模板后请重新构建，**不要手工编辑生成的 JSON**。

**Android 双栈特例**：如果拆除 IPv6 TUN/虚拟 DNS 保护地址会让单个网段
产生超过 32 条排除路由，构建器会让该整个网段（目前为 `fc00::/7`）
继续经过 TUN，依靠 sing-box 的局域网直连分流处理，避免生成大量系统路由。
**32 条是项目的保守保护阈值，不是 Android 官方规定的数量上限。**IPv6 链路本地和组播仍可绕行；Android 单栈预设不受影响。

**需要注意**：
- 系统级绕行的流量不会经过 sing-box 的 DNS 劫持、广告过滤或 Global 策略；
  需要强制代理某个企业网、覆盖网络或私网时，应在自己的模板中删除对应排除项。
- IPv6 的本地绕行不等于开启公网 IPv6；相应模板是否处理 AAAA、IPv6 拒绝规则
  仍由对应 DNS/路由场景决定。
- 路由绕行不一定能解决局域网主机名 / mDNS 解析；需分别测试 IP 与主机名。
- Apple 平台的 Include All Networks、系统权限以及各客户端 VPN 行为可能覆盖或
  改变路由效果；配置和内核静态检查不等于实机连通性测试。
- 远程 Linux 机器修改 TUN 路由前，请保留其他管理连接及回退措施。

代码位于 `scripts/lib/lan_routes.py`；`modules/catalog.json` 中
`platforms.*.lan_bypass` 控制是否为该平台生成路由，
`scenarios.*.lan_bypass` 控制某场景（如 `privacy-strict`）是否跳过。
测试在 `tests/test_lan_routes.py`。
参考：[sing-box TUN 官方字段](https://sing-box.sagernet.org/configuration/inbound/tun/#route_exclude_address)。
