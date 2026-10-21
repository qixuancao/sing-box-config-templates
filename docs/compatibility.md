# sing-box 平台与版本兼容性

## 当前目标

- Android、iOS、macOS、Linux、Windows 均维护 1.14、1.13 两条兼容线；
- 路径统一为 `platforms/<平台>/<内核版本>/<配置>.json`；
- CI 检查器：官方 1.14.0、1.13.21 Linux amd64 发布包；
- 默认 DNS：仅 IPv4；`dual-stack.json` 改为双栈并优先 IPv4；
- 规则：MetaCubeX `sing` 分支远程 `.srs`。

## sing-box FakeIP 与 RealIP 如何选择

- `fakeip.json`：日常首选。国外 A 查询走 FakeIP，减少真实 DNS 往返；极少数
  应用不接受 FakeIP 地址时再换。
- `realip.json`：兼容模式。所有查询返回真实 IP，适合银行、局域网或对 FakeIP
  敏感的应用；1.13 版使用与 1.14 等价但更保守的 DNS 判定。
- 若 FakeIP 下某个应用异常，先换同平台同版本目录的 `realip.json`，并清除
  应用缓存或等待 DNS 缓存过期，详见
  [`troubleshooting.md`](troubleshooting.md)。

## 为什么按内核版本拆分

1.14 新增顶层 `http_clients`、规则集 `http_client` 和 DNS `evaluate` /
`match_response`，并提供 [JSON Schema](https://sing-box.sagernet.org/configuration/schema/)
（顶层 `$schema`，见
[sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)）。
1.13 不认识这些字段或动作。因此旧版目录会：

- 删除 1.14 的共享 HTTP 客户端字段和顶层 `$schema`；
- 用每个远程规则集的 `download_detour: direct` 下载规则；
- 将 FakeIP 的 1.14 DNS 评估流程降级为可在旧核心解析的规则；
- 从桌面 TUN 配置中删除 1.14 才新增的 `dns_mode` / `dns_address`，保留路由级 DNS 劫持。

这些不是仅改目录名的副本。同步脚本确定性生成差异，CI 再用两个真实版本分别
检查公共配置和注入示例节点后的配置。版本目录按 minor 兼容线命名；表中固定的
patch 是实际自动验证点，不等于所有历史 ROM/patch 都做过实机测试。

## 平台差异

| 平台 / 配置 | TUN | `strict_route` | `auto_redirect` | `auto_detect_interface` |
| --- | --- | --- | --- | --- |
| Android SFA | VpnService | 不使用，客户端未实现 | 不使用 | 不使用 |
| iOS / iPadOS SFI | NetworkExtension | 不使用，客户端未实现 | 不使用 | 不使用 |
| macOS SFM | NetworkExtension | 不使用，客户端未实现 | 不使用 | 使用 |
| Linux `tun.json` | 内核 TUN | 使用 | 使用，需 nftables | 使用 |
| Windows `tun.json` | 系统 TUN | 使用 | 不支持 | 使用 |
| 任意 `mixed.json` | 无 | 不适用 | 不适用 | 桌面系统使用 |

Android/iOS 的字段省略是平台适配，不是功能缺失造成的遗漏。Linux
`auto_redirect` 是官方针对 Linux TUN 的推荐方案；Windows 的
`strict_route` 有助于限制多宿主 DNS 泄漏，但可能与虚拟网络软件冲突。

### iOS 局域网绕行

仅 `platforms/ios/{1.13,1.14}/{fakeip,realip}.json` 默认添加 `route_exclude_address`，
排除常见本地 IPv4/IPv6 地址及 CGNAT。生成时从排除范围中扣除 TUN 子网、
虚拟 DNS 与 FakeIP 地址池，避免绕过 `172.19.0.2` 或误排 IPv6 FakeIP。
其他平台、通用模板与 `privacy-strict` 保持原有接管策略。

这允许本地 IPv6 通信绕过 TUN，但不启用公网 IPv6。绕行的流量（包括应用向
局域网 DNS 发起的查询）不受 sing-box 规则控制；需要代理内网或严格 DNS
接管时，应在生成后的私有配置中调整/删除排除项。SFI 的 Include All Networks
选项也会影响行为。完整边界与依据见 [iOS 说明](../platforms/ios/README.md#局域网与链路本地流量)。

## 已自动验证

- 每份 JSON 能解析；
- 公共占位配置和注入示例节点后的配置都通过 `sing-box check`；
- 平台字段符合上表约束；
- iOS 局域网排除范围完整，且不重叠 TUN、虚拟 DNS 或 FakeIP；
- 五个平台各自只有 1.13、1.14 两个配置目录，无同层 JSON 别名；
- 八种 Android 用途差异符合各自契约；
- 配置不包含真实节点凭据或明显私有网络标记；
- 每周实际下载 17 个远程规则集，并用两套固定核心解析其二进制内容。

## 尚未声称验证

- 所有 Android 厂商 ROM、iOS / macOS 版本均实机运行；
- 每家运营商、校园网、企业网和 IPv6 环境；
- 任意第三方节点协议组合；
- 远程规则 CDN 在所有地区始终可访问；
- 服务分组永远不会因上游规则更新而误判。

因此请把 CI 绿灯理解为“配置可复现且 schema 合法”，不要理解为端到端网络
已经替你验收。实机反馈请附平台、客户端版本、所用模板与脱敏日志。
