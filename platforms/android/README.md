# sing-box Android SFA 配置选择

先确认 SFA 使用的 sing-box 内核版本，再进入对应版本目录选择用途。

## 1. 选择内核兼容线

| 内核 | 目录 | 实际 CI 检查器 | 说明 |
| --- | --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 | 当前版，使用共享 HTTP 客户端和新版 FakeIP DNS 评估 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 | 规则集下载改用旧版 `download_detour`，FakeIP 不使用 1.14 动作 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 | 移除 TUN `stack`，仅适配固定 alpha，非默认推荐 |

SFA 应用版本与内核版本通常接近，但排障时以“关于”页或启动日志实际显示的
sing-box 版本为准。若你的补丁版本与表中检查器不同，请在导入前使用相同版本的
`sing-box check -c` 再验一次。

## 2. 选择用途

| 文件名 | 建议场景 | 代价 / 注意事项 |
| --- | --- | --- |
| `fakeip.json` | 普通用户首选 | 极少数应用不接受 FakeIP；1.13 版使用较简单的 DNS 判定 |
| `realip.json` | FakeIP 异常、银行或局域网应用 | 兼容性较高，但不享受 FakeIP 的域名映射方式 |
| `tcp-stable.json` | UDP/QUIC 经常失败的校园网、公司网、移动网络 | 阻断 DoT、QUIC、STUN；游戏、通话可能降级或不可用 |
| `privacy-strict.json` | 更重视 DNS 隔离 | A 查询走代理 DNS，不发送 ECS；同时阻断 DoT、QUIC、STUN |
| `dual-stack.json` | 本地与节点都有稳定 IPv6 | 允许 AAAA/IPv6；IPv6 路径有问题时反而可能变慢 |
| `no-adblock.json` | 登录、支付、跳转或 App 因广告规则误杀 | 不再提供域名级广告拦截 |
| `battery-saver.json` | 墨水屏、备用机、后台长期开启 | 测速改为 15 分钟一次，节点故障切换可能更慢 |
| `udp-first.json` | 游戏、语音、视频通话 | 必须在 `nodes.json` 正确维护 `udp_outbounds` |

选择顺序建议：先用 `fakeip`；应用异常换 `realip`；只有症状明确时再用其他
专项配置。不要同时改节点、DNS 和用途配置，否则无法判断是哪一项起作用。

## 3. 生成并导入

1. 安装官方 [sing-box for Android](https://github.com/SagerNet/sing-box-for-android)。
2. 用 [`../../scripts/generate.mjs`](../../scripts/generate.mjs) 注入自己的节点。
3. 将生成的 JSON 作为本地配置导入，或放到你控制且需要认证的 HTTPS 地址后
   添加为远程配置。
4. 首次启动时允许 Android 创建 VPN。

例如给 1.13.x 生成 RealIP 配置：

```bash
node scripts/generate.mjs --platform android --core 1.13 --scenario realip \
  --input nodes.json --output generated/android-1.13-realip.json
sing-box check -c generated/android-1.13-realip.json
```

Android 图形客户端通过 `VpnService` 提供无 root TUN。本目录故意不写
`strict_route` 和 `auto_redirect`：前者在 SFA 中未实现，后者对普通无 root
客户端并不是 Linux 那套 nftables 加速方案。

需要“某些应用代理、某些应用直连”时，优先使用 SFA 设置里的按应用代理覆盖。
公开 JSON 不硬编码包名，既避免暴露个人应用清单，也不会把 Android 专用规则
带进 iOS 或桌面配置。

全部 Raw URL 和一键导入 URI 见 [`../../SUBSCRIPTIONS.md`](../../SUBSCRIPTIONS.md)。
