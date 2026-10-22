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

## IPv6 网站或局域网不可用

默认配置抑制 AAAA 并拒绝公网 IPv6；iOS 的本地 IPv6 绕行见[iOS 说明](../platforms/ios/README.md#局域网与链路本地流量)。
接入网络和出口支持 IPv6 时，在高级设置启用 IPv6，或使用 CLI `--ipv6`。
若出现超时，取消该选项重新生成；不要只修改 AAAA 而保留 IPv6 拒绝规则。

## 视频卡顿、QUIC 或 UDP 反复失败

确认 `nodes.json` 的 `udp_outbounds` 只包含确实支持 UDP 的节点，并检查应用策略组实际选中的节点。
手选 TCP-only 节点不会自动为 UDP 换出口。URLTest 的 HTTPS 延迟也不能反映 UDP 丢包。

若仅 QUIC 失败，可在私有模板的嗅探规则之后临时加入以下规则，比较应用表现：

```json
{"protocol": "quic", "action": "reject"}
```

部分 HTTPS 应用会回退 TCP，但这不是游戏或语音的通用修复。确认原因后移除临时规则；不应一并封锁 DoT 和 STUN。

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
