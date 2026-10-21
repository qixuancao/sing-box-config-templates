# sing-box 配置快速入门

## 1. 安装客户端

- Android：官方 SFA，先在“关于”页确认 sing-box 内核是 1.14 / 1.13 中的哪一条。
- iOS / iPadOS / tvOS：自 1.14 起请安装 App Store 新应用 sing-box MT（旧 VT 用户需重新安装），见 [sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)。
- macOS：SFM standalone（不再从 macOS App Store 提供，不自动继承旧配置），或命令行 `sing-box`。
- Linux / Windows：官方命令行版或系统包管理器；图形界面可选官方 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)，命令行继续保留。

下载入口优先使用 [SagerNet 官方项目](https://github.com/SagerNet/sing-box)
及其文档，不要从不明网盘安装改包。

所有平台均维护 sing-box **1.14.x / 1.13.x** 两条版本线。先确认实际内核，
再选择 `platforms/<平台>/<内核版本>/` 中的配置：

```bash
sing-box version
```

## 2. 在网页生成

打开[配置生成器](https://qixuancao.github.io/sing-box-config-templates/)：

1. 粘贴自己的节点分享链接，每行一个；也可读取节点 JSON / TXT 文件。
2. 选择设备，在高级设置中核对实际内核是 1.13 还是 1.14。
3. 点击“生成配置”，再点击“下载 sing-box.json”。
4. 在 SFA / SFI / SFM 的配置页面导入本地文件，然后启用连接。

手机和 Apple 客户端默认推荐 FakeIP；应用兼容问题可在高级设置改为 RealIP。
Linux / Windows 默认推荐本地 HTTP / SOCKS，运行后将应用代理设为
`127.0.0.1:2080`。需要接管系统流量时再选择 TUN，并授予系统所需权限。

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

已有脚本调用可以继续使用：

```bash
./scripts/render.sh platforms/android/1.14/fakeip.json nodes.json generated/android.json
```

两种命令都调用网页使用的同一套引擎。命令行输出为 `0600`，失败时保留原有输出。
可用 `--input -` 从 stdin 读取，个人模板用 `--template /path/to/private/template.json`。

## 4. 更新与排查

更换节点或模板升级见[更新节点](update-nodes.md)。导入或连接异常见[故障排查](troubleshooting.md)。
网页检查输入格式、节点名称与配置引用；客户端仍需验证完整字段及实际连接。
仓库 CI 使用 1.13.21 / 1.14.0 内核检查生成结果，静态检查通过不等于节点在线。
