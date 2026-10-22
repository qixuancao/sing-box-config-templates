# sing-box 策略组与规则顺序：按用途选择出口

本仓库借鉴 ACL4SSR 的“用途优先”交互：用户不必在几千条规则里找域名，而是
直接决定流媒体、AI 或某个厂商应该走哪个出口。实现仍是 sing-box 原生
`selector` / `urltest` 与 `.srs` 规则集。

## 策略组

| tag | 默认 | 用途 |
| --- | --- | --- |
| `select` | `auto` | 主手动选择器，也可回到自动测速 |
| `auto` | 自动 | 所有节点的 URLTest，150 ms 容差 |
| `udp-auto` | 自动 | 只包含 `udp_outbounds` 的 URLTest |
| `streaming` | `select` | YouTube、Netflix、Disney、Spotify、TikTok |
| `ai` | `select` | 非中国大陆 AI 服务集合 |
| `telegram` | `select` | Telegram |
| `microsoft` | `direct` | Microsoft 与 OneDrive |
| `apple` | `direct` | Apple 服务 |
| `google` | `select` | Google 服务 |
| `github` | `select` | GitHub |
| `direct` | 直连 | 不经过代理节点 |
| `GLOBAL` | `select` | Clash API Global 模式与最终人工兜底 |

每个服务组都能切换 `select`、`auto`、`udp-auto`、`direct`。默认值只是一个
适合中国大陆网络的温和起点，并不是对所有运营商都最优。

表中是标准配置的默认值。`battery-saver` 将两个 URLTest 的间隔/容差改为
15 分钟/300 ms；`udp-first` 将主选择器默认值改成 `udp-auto`。

## 匹配顺序

规则按以下逻辑从上到下执行：

1. 嗅探、DNS 劫持与域名解析；
2. 私有地址、Direct / Global 模式；
3. 广告域名拒绝；
4. 私有域名、中国域名和可信中国 IP 直连；
5. 其余 UDP 使用 `udp-auto`；
6. AI、流媒体、Telegram 和厂商服务进入各自策略组；
7. 非中国域名与剩余流量走 `select`。

`no-adblock` 有意省略第 3 步；`tcp-stable` 与 `privacy-strict` 还会在分流前
拒绝 DoT、QUIC 与 STUN。

UDP 规则放在服务规则之前是有意的：它保证 QUIC、语音等流量只使用你在
`udp_outbounds` 中确认过的节点。服务策略组主要决定常规 TCP / HTTPS 流量。

若 `udp_outbounds` 显式设为 `[]`，生成配置会移除 `udp-auto` 和相关选择项，
将第 5 步改为拒绝。国内与私有地址的 UDP 继续按前面的规则直连。

## 远程规则集

规则通过 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)
的 `sing` 分支按需下载，包括：

- `category-ads-all`、`private`、`cn`、`geolocation-!cn` 与 `geoip/cn`；
- `category-ai-!cn`；
- YouTube、Netflix、Disney、Spotify、TikTok；
- Telegram、Microsoft、OneDrive、Apple、Google、GitHub。

配置引用的是上游动态分支，优点是规则会更新；代价是首次启动需要访问规则
CDN，而且上游变化可能改变匹配结果。每周 CI 使用 1.13.21 / 1.14.0 下载并解析
全部 17 个规则集；规则分类由上游维护。
