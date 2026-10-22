# 局域网与链路本地流量绕行

所有平台的 **TUN** 配置默认将常见私网、CGNAT、链路本地、组播及 IPv4
有限广播地址放入 `inbounds[].route_exclude_address`，尽量让路由器、NAS
和局域网发现流量直接走系统网络，不经过 sing-box 用户态。
**mixed / 本地 HTTP/SOCKS** 不设置此字段。网页可取消“局域网绕过 TUN”，CLI 使用 `--no-lan-bypass`。

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

**IPv6 选项**：启用后，各平台均将 ULA 保留在 TUN 内，按私网直连规则处理，
避免绕过新增的 TUN、虚拟 DNS、FakeIP 地址或生成大量排除路由。链路本地和组播仍可绕行。
构建器对自定义 Android 地址另有每段最多 32 条拆分的保护；这不是操作系统的官方上限。

**需要注意**：
- 系统级绕行的流量不会经过 sing-box 的 DNS 劫持或 Global 策略；
  需要强制代理企业网、覆盖网络或私网时，关闭绕行，并在私有模板中把目标代理规则放到私网直连规则之前。
- IPv6 的本地绕行不等于开启公网 IPv6；相应模板是否处理 AAAA、IPv6 拒绝规则
  仍由对应 DNS/路由场景决定。
- 路由绕行不一定能解决局域网主机名 / mDNS 解析；需分别测试 IP 与主机名。
- Apple 平台的 Include All Networks、系统权限以及各客户端 VPN 行为可能覆盖或
  改变路由效果；配置和内核静态检查不等于实机连通性测试。
- 远程 Linux 机器修改 TUN 路由前，请保留其他管理连接及回退措施。

代码位于 `scripts/lib/lan_routes.py`；`modules/catalog.json` 中
`platforms.*.lan_bypass` 控制默认平台策略，`docs/assets/core/customize.mjs` 应用用户的 IPv6 和绕行选项。
测试在 `tests/test_lan_routes.py`。
参考：[sing-box TUN 官方字段](https://sing-box.sagernet.org/configuration/inbound/tun/#route_exclude_address)。
