# sing-box Linux TUN 与 nftables 配置

先确认 sing-box 内核版本，再进入对应目录：

| 内核版本 | 配置目录 | CI 检查器 |
| --- | --- | --- |
| 1.14.x | [`1.14/`](1.14/) | 1.14.0 |
| 1.13.x | [`1.13/`](1.13/) | 1.13.21 |
| 1.15 · **实验版** | [`1.15/`](1.15/) | 1.15.0-alpha.12 |

`tun.json` 默认绕行 LAN、链路本地等流量，并保护 TUN/虚拟 DNS；`mixed.json` 不变。远程机器务必验证 `auto_redirect` 与路由实际效果。见[跨平台局域网绕行](../../docs/lan-bypass.md)。

先用 `mixed.json` 验证节点和规则，再决定是否使用全局 TUN：

```bash
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

- `mixed.json`：本地 HTTP/SOCKS，监听 `127.0.0.1:2080`，通常无需 root。
- `tun.json`：全局 TUN，启用 `auto_route`、`strict_route` 和官方推荐的 Linux
  `auto_redirect`；需要 root / `CAP_NET_ADMIN`、iproute2 与 nftables。

图形客户端及支持架构见官方 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)。

TUN 会修改主机路由和 DNS。远程机器上启用前要准备独立回撤方式；本仓库只
提供静态配置，不会替你修改系统网络。

已部署为 systemd 服务时：

```bash
sudo systemctl restart sing-box
sudo journalctl -u sing-box --output cat -f
```
