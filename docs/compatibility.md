# sing-box 平台与版本兼容性

## 当前目标

- Android、iOS、macOS、Linux、Windows 均维护 1.14、1.13 两条兼容线；
- 路径统一为 `platforms/<平台>/<内核版本>/<配置>.json`；
- CI 检查器：官方 1.14.0、1.13.21 Linux amd64 发布包；
- 同一平台目录下的 `1.15/` 为[实验版](experimental-1.15.md)，固定在 `1.15.0-alpha.12` 验证，默认选择仍为 1.14；
- 默认 DNS：仅 IPv4；`dual-stack.json` 改为双栈并优先 IPv4；
- 规则：MetaCubeX `sing` 分支远程 `.srs`。

## sing-box FakeIP 与 RealIP 如何选择

- `fakeip.json`：日常首选。国外 A 查询走 FakeIP，减少真实 DNS 往返；极少数
  应用不接受 FakeIP 地址时再换。
- `realip.json`：兼容模式，不使用 FakeIP，适合银行、局域网或对 FakeIP
  敏感的应用。
- 若 FakeIP 下某个应用异常，先换同平台同版本目录的 `realip.json`，并清除
  应用缓存或等待 DNS 缓存过期，详见
  [`troubleshooting.md`](troubleshooting.md)。

## 为什么按内核版本拆分

1.14 新增顶层 `http_clients`、规则集 `http_client` 和 DNS `evaluate` /
`match_response`，并提供 [JSON Schema](https://sing-box.sagernet.org/configuration/schema/)
（顶层 `$schema`，见
[sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)）。
1.13 不支持这些字段或动作，其模块使用 `download_detour: direct`、兼容的 FakeIP
判定和路由级 DNS 劫持。1.15 的 TUN 栈变化见[实验版说明](experimental-1.15.md)。

版本目录按 minor 兼容线命名，CI 使用固定 patch 检查公共配置和节点注入结果，
不代表所有 patch 与客户端都经过实机测试。

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

`platforms/ios/{1.13,1.14,1.15}/{fakeip,realip}.json`（1.15 为实验版）默认添加 `route_exclude_address`，
排除常见本地 IPv4/IPv6 地址及 CGNAT。生成时从排除范围中扣除 TUN 子网、
虚拟 DNS 与 FakeIP 地址池，避免绕过 `172.19.0.2` 或误排 IPv6 FakeIP。
其他平台与 Android `privacy-strict` 保持原有接管策略。

这允许本地 IPv6 通信绕过 TUN，但不启用公网 IPv6。绕行的流量（包括应用向
局域网 DNS 发起的查询）不受 sing-box 规则控制；需要代理内网或严格 DNS
接管时，应在生成后的私有配置中调整/删除排除项。SFI 的 Include All Networks
选项也会影响行为。完整边界与依据见 [iOS 说明](../platforms/ios/README.md#局域网与链路本地流量)。

## 已自动验证

- 每份 JSON 能解析；
- 公共占位配置和注入示例节点后的配置都通过 `sing-box check`；
- 平台字段符合上表约束；
- iOS 局域网排除范围完整，且不重叠 TUN、虚拟 DNS 或 FakeIP；
- 五个平台的版本、场景与 `modules/catalog.json` 一致；
- 八种 Android 用途差异符合各自契约；
- 配置不包含真实节点凭据或明显私有网络标记；
- 每周实际下载 17 个远程规则集，并用两套固定核心解析其二进制内容。

## 验证边界

CI 验证配置结构、生成逻辑和内核解析，不验证真实节点、设备 TUN、运营商网络、
CDN 地区可达性或上游规则分类。实机反馈请附平台、客户端版本、配置路径与脱敏日志。
