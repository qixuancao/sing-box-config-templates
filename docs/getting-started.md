# sing-box 配置快速入门

## 1. 安装客户端

- Android：官方 SFA，先在“关于”页确认 sing-box 内核是 1.14 / 1.13 / 1.12 中的哪一条。
- iOS / iPadOS / tvOS：自 1.14 起请安装 App Store 新应用 sing-box MT（旧 VT 用户需重新安装），见 [sing-box v1.14.0](https://github.com/SagerNet/sing-box/releases/tag/v1.14.0)。
- macOS：SFM standalone（不再从 macOS App Store 提供，不自动继承旧配置），或命令行 `sing-box`。
- Linux / Windows：官方命令行版或系统包管理器；图形界面可选官方 [sing-box for Desktop](https://sing-box.sagernet.org/clients/desktop/)，命令行继续保留。

下载入口优先使用 [SagerNet 官方项目](https://github.com/SagerNet/sing-box)
及其文档，不要从不明网盘安装改包。

桌面和 Apple 配置以 sing-box **1.14.x** 为目标；Android 另有 1.14、1.13、
1.12 三条版本化配置。先确认实际内核：

```bash
sing-box version
```

## 2. 选择模板

第一次使用时：

1. Android 先按内核选择 `platforms/android/1.xx/`，再从 `fakeip.json` 开始；
2. Apple 图形客户端先用本平台的 `fakeip.json`；
3. Linux / Windows 命令行先用 `mixed.json`，确认节点可用；
4. 只有确实需要全局透明代理时，再启用桌面系统的 `tun.json`。

不要直接修改 `platforms/` 里的公开文件来保存密码。它们会被平台同步脚本
覆盖，也容易被误提交。

## 3. 创建私有节点文件

```bash
cp examples/nodes.example.json nodes.json
```

编辑 `nodes.json`，把示例出站替换成自己的 sing-box 出站。
`nodes.json` 已写入 `.gitignore`。字段说明见 [`nodes.md`](nodes.md)。

## 4. 渲染并检查

Android 示例：

```bash
./scripts/render.sh \
  platforms/android/fakeip.json \
  nodes.json \
  generated/android.json
sing-box check -c generated/android.json
```

若使用旧版 SFA，把模板路径换成相应目录，并用相同版本的检查器。例如：

```bash
./scripts/render.sh \
  platforms/android/1.13/realip.json \
  nodes.json \
  generated/android-1.13-realip.json
sing-box check -c generated/android-1.13-realip.json
```

Linux 无 root 示例：

```bash
./scripts/render.sh \
  platforms/linux/mixed.json \
  nodes.json \
  generated/linux-mixed.json
sing-box check -c generated/linux-mixed.json
```

脚本会替换唯一的公开占位节点，同时更新 `select`、`auto`、`udp-auto` 和
`GLOBAL`。不会上传、解密或转换你的节点。

## 5. 导入或运行

- SFA / SFI / SFM：导入 `generated/*.json` 本地文件。
- mixed 模式：运行后在应用中设置 HTTP 或 SOCKS 地址
  `127.0.0.1:2080`。
- TUN 命令行模式：确认有本机控制台或其他回撤手段，再以所需权限运行。

```bash
sing-box run -c generated/linux-mixed.json
```

若要使用远程配置，把**生成后的私有文件**放在你控制且需要认证的 HTTPS
存储中。公开 Raw 链接只是机制演示，不包含可用节点。

## 6. 更新仓库

```bash
git pull --ff-only
./scripts/render.sh platforms/android/fakeip.json nodes.json generated/android.json
sing-box check -c generated/android.json
```

模板、规则 tag 或 sing-box 版本升级后都应重新渲染，不要长期使用无人检查的
旧生成文件。
