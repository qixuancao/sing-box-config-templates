# sing-box Windows TUN 配置

先确认 sing-box 内核版本，再进入对应目录：

| 内核版本 | 配置目录 | CI 检查器 |
| --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 |

TUN 默认绕行常见 LAN 和链路本地流量并保护 TUN/虚拟 DNS；本地 mixed 不受影响。见[跨平台局域网绕行](../../docs/lan-bypass.md)。

- `mixed.json`：监听 `127.0.0.1:2080`，手动设置 HTTP/SOCKS 代理，适合先验证。
- `tun.json`：以管理员权限运行，全局接管流量，并启用 `strict_route` 以降低
  Windows 多宿主 DNS 泄漏风险。

可通过 Scoop、Chocolatey 或 winget 安装命令行版。图形客户端及系统要求见
官方 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)。命令行示例：

```powershell
winget install sing-box
sing-box check -c .\generated\windows.json
sing-box run -c .\generated\windows.json
```

`strict_route` 可能与 VirtualBox 等虚拟网络软件冲突；出现问题时先退回
`mixed.json`，不要直接删改系统路由。
