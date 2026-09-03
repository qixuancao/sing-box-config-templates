# macOS

- `fakeip.json`：SFM 图形客户端 TUN 首选。
- `realip.json`：SFM TUN 兼容模式。
- `mixed.json`：命令行本地 HTTP/SOCKS，监听 `127.0.0.1:2080`，不会自动接管
  全机流量。

SFM 可从官方 Apple 客户端页面安装。命令行版可使用 Homebrew：

```bash
brew install sing-box
sing-box check -c generated/macos.json
sing-box run -c generated/macos.json
```

使用 `mixed.json` 时，需要在浏览器或系统网络设置里手动填写
`127.0.0.1:2080`。Apple NetworkExtension 未实现 `strict_route`，因此 GUI
配置中没有该字段。
