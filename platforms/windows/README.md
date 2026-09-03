# Windows

- `mixed.json`：监听 `127.0.0.1:2080`，手动设置 HTTP/SOCKS 代理，适合先验证。
- `tun.json`：以管理员权限运行，全局接管流量，并启用 `strict_route` 以降低
  Windows 多宿主 DNS 泄漏风险。

官方文档列出了 Scoop、Chocolatey 和 winget 安装方式。示例：

```powershell
winget install sing-box
sing-box check -c .\generated\windows.json
sing-box run -c .\generated\windows.json
```

`strict_route` 可能与 VirtualBox 等虚拟网络软件冲突；出现问题时先退回
`mixed.json`，不要直接删改系统路由。
