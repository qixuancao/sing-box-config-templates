# sing-box 配置导入失败与 DNS 排障

## 导入成功但完全不能联网

先确认你导入的不是公开占位配置。若日志里出现 `example.com` 或
`CHANGE_ME`，说明尚未注入真实节点。按 [`getting-started.md`](getting-started.md)
重新生成。

然后执行：

```bash
sing-box check -c generated/your-config.json
```

语法通过不代表节点在线；再检查服务器域名、端口、TLS server name 和凭据。

## FakeIP 下某个应用异常

1. 换成同平台的 `realip.json`；
2. 停止客户端；
3. 清除该应用缓存或等待系统 DNS 缓存过期；
4. 重新启动配置。

若 RealIP 正常而 FakeIP 稳定复现异常，提交 Issue 时写明应用与系统版本，但
不要附真实节点。

## 登录、支付或跳转被拦截

基础配置不带广告过滤。先比较 RealIP 与 FakeIP，检查目标命中的策略组和节点，
以及设备上其他过滤工具。提交反馈时提供脱敏后的目标域名与命中规则。

## Android 下部分应用（如 YouTube、Gemini）无法连接

1. **检查 SFA 分应用代理**：若在 SFA 的 `设置 → 配置覆盖 → 分应用代理` 中开启了白名单、黑名单或托管模式，建议先将其关闭后复测。配置已内置国内直连与海外代理分流；单独排除或漏选后台组件（如 `Google`、`Google Play 服务`）会导致依赖 GMS 的应用无法鉴权联网，且被排除组件的流量不会出现在 sing-box 日志中。
2. **检查系统私人 DNS 与 IPv6**：若手机系统开启了「私人 DNS / 加密 DNS」（DoT 853 端口），可能绕过 53 端口的 DNS 劫持并返回 IPv6 地址，在未开启配置 IPv6 时导致流量绕过仅 IPv4 的 TUN 直连失败。建议先将系统私人 DNS 设为关闭，或在生成器高级设置中启用 IPv6 后复测。
3. **检查浏览器网页端与链式落地节点**：用同一台手机浏览器访问对应网页版（如 `youtube.com`），若网页同样失败或手选单跳节点可恢复，重点排查落地节点出口连通性及 QUIC（UDP 443）兼容性。
4. **提供脱敏运行日志**：若仍无法定位，将配置 `log.level` 临时改为 `info` 复现一次，附上脱敏后的连接日志以便定位具体失败域名。

## IPv6 网站或局域网不可用

默认配置抑制 AAAA 并拒绝公网 IPv6；iOS 的本地 IPv6 绕行见[iOS 说明](../platforms/ios/README.md#局域网与链路本地流量)。
接入网络和出口支持 IPv6 时，在高级设置启用 IPv6，或使用 CLI `--ipv6`。
若出现超时，取消该选项重新生成；不要只修改 AAAA 而保留 IPv6 拒绝规则。

## 视频卡顿、QUIC 或 UDP 反复失败

确认 `nodes.json` 的 `udp_outbounds` 只包含确实支持 UDP 的节点，并检查应用策略组实际选中的节点。
手选 TCP-only 节点不会自动为 UDP 换出口。URLTest 的 HTTPS 延迟也不能反映 UDP 丢包。

若仅 QUIC 失败（常见于纯 TCP 节点、链式 SOCKS5 或 UDP 受限的校园 / 公司网络），
在网页高级设置勾选“屏蔽公网 QUIC（UDP 443）”，或使用 CLI `--block-quic` 重新生成。
该规则位于局域网规则之后，以 ICMP 不可达立即拒绝公网 UDP 443，浏览器和多数应用会回退 TCP。

部分 HTTPS 应用会回退 TCP，但这不是游戏或语音的通用修复；节点支持 UDP 且网络正常时应保持关闭，以保留 HTTP/3。

## 日志出现 `dial tcp ... i/o timeout`

这表示在超时时间内没能与目标 IP:端口建立 TCP 连接。若日志同时写着
`outbound/direct[direct]`，说明该连接按规则直连；常见原因是远端端口关闭、
运营商路径不可达、防火墙或应用自己的备用探测失败。单条超时不等于隧道整体
坏了；只有对应应用功能也失败且持续重试时才需要调整规则。

## 远程规则集下载失败

首次启动必须下载 `.srs`。先用浏览器或 `curl` 测试配置里的完整 URL。若只有
规则 CDN 不通，可在自己的私有分支把 URL 换成同一上游文件的可达镜像；不要
随意删掉规则后把所有流量归到直连。

## `127.0.0.1:2080` 已被占用

修改生成配置中 `mixed-in.listen_port`，并同步更新浏览器或系统代理端口：

```bash
ss -ltnp | grep ':2080'
```

## Linux TUN 停止后仍然断网

先保留本机控制台，不要盲目重启网络。只读检查：

```bash
ip rule
ip route show table 2022
resolvectl status
journalctl -u sing-box --output cat -e
```

确认残留的是 sing-box 创建的策略路由或 DNS 状态后，再按你的发行版服务管理
方式回退。远程主机启用 TUN 前应准备独立、自动失效的回撤通道。
