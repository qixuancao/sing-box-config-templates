# sing-box 配置快速入门

## 1. 安装客户端

- Android：[官方 SFA](https://sing-box.sagernet.org/clients/android/)。
- iOS / iPadOS / tvOS：[官方 Apple 客户端](https://sing-box.sagernet.org/clients/apple/)，1.14 使用 App Store 的 sing-box MT。
- macOS：官方 Apple 客户端的 standalone 版本，或命令行 `sing-box`。
- Linux / Windows：官方命令行版，或 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)。

下载入口优先使用 [SagerNet 官方项目](https://github.com/SagerNet/sing-box)
及其文档，不要从不明网盘安装改包。

稳定配置支持 **1.14.x / 1.13.x**，另有[1.15 实验版](experimental-1.15.md)。
在客户端“关于”页或命令行确认内核版本，再选择相应配置：

```bash
sing-box version
```

## 2. 在网页生成

打开[配置生成器](https://qixuancao.github.io/sing-box-config-templates/)：

1. 粘贴自己的节点分享链接，每行一个；也可读取节点 JSON / TXT 文件。
2. 选择设备，在高级设置中选择与客户端一致的内核版本。
3. 点击“生成配置”，再点击“下载 sing-box.json”。
4. 在 SFA / SFI / SFM 的配置页面导入本地文件，然后启用连接。

手机和 Apple 客户端默认推荐 FakeIP；应用兼容问题可在高级设置改为 RealIP。
Linux / Windows 默认推荐本地 HTTP / SOCKS。电脑端可明确选择三种接入模式：

- **仅监听端口**：生成 mixed 入站，监听 `127.0.0.1:2080`（端口可改），需在应用中手动填写代理地址，不会修改系统代理。
- **自动设置系统代理**：同样使用 mixed 入站，但启用 `set_system_proxy: true`，启动 sing-box 时尝试设置系统 HTTP 代理并在停止时恢复。效果取决于操作系统、桌面环境和权限。此模式不等于 TUN，不一定接管所有应用和 UDP。
- **TUN**：使用虚拟网卡接管系统流量，需要系统权限或客户端授权。远程机器先保留其他管理通道，避免中断 SSH。

高级设置还可独立选择 **DNS 返回方式**（RealIP / FakeIP）和**上游 DNS 服务**
（直连与代理各自的 DoH IPv4 地址）。仅监听端口和系统 HTTP 代理时不一定能接管系统 DNS，
因此网页会禁用 FakeIP；TUN / VPN 环境需要核实 DNS 确实被接管。
修改监听端口后，请使用相同端口设置应用代理。自定义仅作用于网页下载的 JSON，
公开 Raw 模板和没有额外参数的 CLI 不会同步包含这些选项。

“试用示例”只用于预览操作流程，连接时请使用自己的节点。“保存节点 JSON”可保留
输入供下次更新，页面刷新会清空输入。节点格式见[节点链接与 JSON](nodes.md)。

## 3. 命令行生成

需要 Node.js 22+。将节点分享链接逐行放进 `nodes.txt`，或使用 `nodes.json`：

```bash
node scripts/generate.mjs --platform android --core 1.14 \
  --input nodes.txt --output generated/sing-box.json
sing-box check -c generated/sing-box.json
```

选择其他平台或场景：

```bash
node scripts/generate.mjs --platform linux --core 1.13 --scenario mixed \
  --input nodes.json --output generated/linux.json
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

使用自己维护的私有模板：

```bash
node scripts/generate.mjs --template /path/to/private/template.json \
  --input nodes.json --output generated/android.json
```

命令行输出为 `0600`，失败时保留原有输出；`--input -` 可从 stdin 读取。

## 4. 更新与排查

更换节点或模板升级见[更新节点](update-nodes.md)。导入或连接异常见[故障排查](troubleshooting.md)。
网页检查输入格式、节点名称与配置引用；客户端仍需验证完整字段及实际连接。
内核检查版本与验证范围见[版本兼容](compatibility.md)。配置检查通过不等于节点在线。
