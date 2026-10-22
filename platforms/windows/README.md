# sing-box Windows TUN 配置

先确认 sing-box 内核版本，再进入对应目录：

| 内核版本 | 配置目录 | CI 检查器 |
| --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 |

- `mixed.json`：监听 `127.0.0.1:2080`，手动设置 HTTP/SOCKS 代理，适合先验证。
- `tun.json`：以管理员权限运行，全局接管流量，并启用 `strict_route` 以降低
  Windows 多宿主 DNS 泄漏风险。

官方文档列出了 Scoop、Chocolatey 和 winget 安装方式。图形界面可选官方
[sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)
（Windows 10+ x64 / x86 / arm64，见
[sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)），
继续保留命令行（CLI）作为可审计的默认路径。示例：

```powershell
winget install sing-box
sing-box check -c .\generated\windows.json
sing-box run -c .\generated\windows.json
```

`strict_route` 可能与 VirtualBox 等虚拟网络软件冲突；出现问题时先退回
`mixed.json`，不要直接删改系统路由。
