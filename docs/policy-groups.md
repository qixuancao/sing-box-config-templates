# 配置说明：默认值、DNS 与分流

本项目面向自备节点的日常客户端使用。网页和 CLI 使用相同生成逻辑；公开 JSON 是按平台、内核版本生成的基础配置。

## 默认值及理由

| 设置 | 默认值 | 理由 / 取舍 |
| --- | --- | --- |
| 手机、macOS 接入 | TUN + FakeIP | 接管设备流量，国外域名使用虚拟地址；应用不兼容时选 RealIP |
| Linux / Windows 接入 | 本地 HTTP/SOCKS + RealIP | 先在应用里配置代理即可使用；全设备接管选 TUN |
| IPv6 | 关闭公网 IPv6 | 减少不完整 IPv6 路径带来的超时；网络及出口支持时启用 |
| 局域网 | TUN 默认绕行 | 方便访问 NAS、路由器；企业网或覆盖网络可关闭绕行 |
| 直连 / 代理 DNS | AliDNS / Google DoH | 国内外分别解析，代理 DNS 经主选择组 |
| URLTest | 10 分钟、150 ms 容差 | 减少后台探测与频繁切换；不代表故障会立即切换 |
| 日志 | warn | 保留错误和警告，减少日常输出 |
| 广告过滤 | 不启用 | 基础配置优先保证连通性，避免额外规则误杀 |

本地 HTTP/SOCKS 仅监听 `127.0.0.1:2080`。自动系统代理仍使用这个入口，启动时尝试设置系统 HTTP 代理，正常退出时恢复；不保证接管 UDP 或忽略系统代理的应用。

## DNS 与 IPv6

RealIP 返回真实地址；FakeIP 对匹配国外规则的地址查询返回虚拟 IP，需要 TUN/VPN 正确接管 DNS。1.14+ FakeIP 还会使用响应评估判断国内 IP，具体版本差异见[兼容性](compatibility.md)。

直连 DNS 默认 `223.5.5.5`，代理 DNS 默认 `8.8.8.8`；网页和 CLI 可选 AliDNS、Cloudflare、Google。高级 DNS 字段请修改私有模板，不要把普通 UDP DNS 的 IP 当作 DoH 服务。

默认抑制 AAAA、HTTPS 和 SVCB 查询，并拒绝配置内的 IPv6 流量；本地 IPv6 绕行不受该拒绝规则控制。启用 IPv6 会同时：

- 开放 AAAA，DNS 与路由解析优先 IPv4；HTTPS/SVCB 仍保持抑制；
- 为 TUN 增加 IPv6 地址；FakeIP 模式增加 IPv6 地址池和 AAAA 映射；
- 移除 IPv6 拒绝规则，将 ULA 留在 TUN 内，避免排除虚拟 DNS/FakeIP 或生成大量系统路由。

CLI 示例：

```bash
node scripts/generate.mjs --platform linux --core 1.14 \
  --access tun --dns fakeip --ipv6 --no-lan-bypass \
  --input nodes.json --output generated/sing-box.json
```

取消局域网绕行只取消系统路由排除，**不会自动把私网改为代理**；私有地址仍按直连规则处理。需要代理企业私网时，在私有模板中把明确的目标规则放到私网直连规则之前。见[局域网绕行](lan-bypass.md)。

## 策略组与 UDP

| tag | 用途 |
| --- | --- |
| `select` | 主选择组，默认 `auto`，也可手动选任意节点 |
| `auto` | URLTest 自动选择；存在已声明支持 UDP 的节点时仅在其中选择，否则使用全部节点 |
| `streaming` | YouTube、Netflix、Disney、Spotify、TikTok |
| `ai` / `telegram` | AI 服务 / Telegram |
| `microsoft` / `apple` / `google` / `github` | 对应服务，Microsoft 包含 OneDrive |
| `direct` | 直接连接 |
| `GLOBAL` | Clash API 的 Global 模式选择组 |

所有应用组默认跟随 `select`，可切换 `auto` 或 `direct`。TCP、QUIC、其他 UDP 都遵循同一套应用规则，不为 UDP 偷换出口。`auto` 的 HTTPS 探测衡量连通性和延迟，不是 UDP 丢包或游戏体验测试。

手动选择 TCP-only 节点后，代理 UDP 可能失败，不能期待它自动使用其他节点或直连。全部节点仅支持 TCP 时也保留应用策略和直连规则；需要 UDP 的通话或游戏应添加支持 UDP 的节点。能力声明见[节点格式](nodes.md)。

## 规则顺序

1. 嗅探；TUN 劫持 DNS；解析域名；默认拒绝 IPv6。
2. 私有 IP 直连，处理 Direct / Global 模式。
3. 私有域名、国内域名和可信国内 IP 直连。
4. AI、流媒体及其他应用进入各自策略组。
5. 国外域名和未匹配流量走 `select`。

应用组只控制走到该条规则的流量：已匹配国内直连规则的地址不会再进入应用组。系统级 LAN 绕行的流量也不会进入这套规则。

16 个远程 `.srs` 来自 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)，包含国内/私网、国外、AI 与上述应用分类。首次启动需要访问规则 CDN；分类变化由上游维护。每周 CI 使用两套稳定内核下载并解析。

## 修改配置

导出保持标准 JSON，便于客户端和通用工具读取。字段定义以[官方配置文档](https://sing-box.sagernet.org/configuration/)为准；本页解释项目的选择和取舍。

- 个人修改：复制平台 JSON 为私有模板，修改后用 `--template PATH` 注入节点；该模式不叠加网页选项。
- 项目默认值：修改 `modules/`，运行 `python3 -B scripts/build.py`，不要编辑生成产物。
- 调整前先确定目标规则的优先级，再用对应内核的 `sing-box check` 校验。
