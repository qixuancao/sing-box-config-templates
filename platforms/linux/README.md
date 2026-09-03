# sing-box Linux TUN 与 nftables 配置

先用 `mixed.json` 验证节点和规则，再决定是否使用全局 TUN：

```bash
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

- `mixed.json`：本地 HTTP/SOCKS，监听 `127.0.0.1:2080`，通常无需 root。
- `tun.json`：全局 TUN，启用 `auto_route`、`strict_route` 和官方推荐的 Linux
  `auto_redirect`；需要 root / `CAP_NET_ADMIN`、iproute2 与 nftables。

图形界面可选官方 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)
（Linux x64 / arm64 / armv7l，见
[sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)），
继续保留命令行（CLI）作为可审计、可脚本化的默认路径。

TUN 会修改主机路由和 DNS。远程机器上启用前要准备独立回撤方式；本仓库只
提供静态配置，不会替你修改系统网络。

systemd 安装常用命令：

```bash
sudo systemctl restart sing-box
sudo journalctl -u sing-box --output cat -f
```
