# sing-box 配置工具

[English](README.en.md) · [在线生成配置](https://qixuancao.github.io/sing-box-config-templates/) · [更新记录](CHANGELOG.md)

为自备节点的 sing-box 用户提供少量可靠的日常分流配置，以及浏览器本地生成器。支持 Android、iOS、macOS、Linux 和 Windows，按平台和内核版本适配。

- 按流媒体、AI、Telegram、Microsoft、Apple、Google、GitHub 选择出口；
- 手动选节点或通过 URLTest 按延迟自动选择；
- 在本地合并节点，生成可直接导入客户端的 JSON；
- 稳定配置维护 1.13、1.14；[1.15 · 实验版](docs/experimental-1.15.md)按固定 alpha 预备。

## 在线生成

打开[配置生成器](https://qixuancao.github.io/sing-box-config-templates/)：

1. 粘贴节点分享链接，或读取节点 JSON 文件。
2. 选择设备和接入方式；内核版本、DNS 和 IPv6 在高级设置中。
3. 点击“生成配置”，下载 `sing-box.json` 后导入客户端。

支持 Naive HTTPS、Hysteria2、Trojan、Shadowsocks、VLESS 分享链接。解析、生成和
下载均在浏览器内完成，节点不上传、不自动保存。支持保存 `nodes.json`，方便下次更新。

**流量接入方式**（Linux / Windows / macOS）可明确选择：仅监听本地 HTTP/SOCKS
（应用手动配置代理）、由 sing-box 在启动时自动设置并在停止时恢复系统 HTTP 代理
（`mixed.set_system_proxy`），或 TUN 系统流量接管。系统代理并不等同于 TUN，
部分应用及 UDP 不会使用系统 HTTP 代理；是否可自动设置取决于平台环境与权限。

**高级设置**可单独选择 RealIP / FakeIP DNS 返回方式（纯 HTTP/SOCKS 模式禁用 FakeIP）、
直连和代理 DNS 的 DoH 服务商、IPv6、局域网绕行，以及 mixed 监听端口。
网页会给出包含当前选项的等价 CLI 命令。
请用 `sing-box check -c sing-box.json` 校验下载的配置。

## 命令行生成

需要 Node.js 22+；运行和内核检查需要 sing-box。

```bash
git clone https://github.com/qixuancao/sing-box-config-templates.git
cd sing-box-config-templates
```

把分享链接逐行保存到 `nodes.txt`，或使用[节点 JSON](docs/nodes.md)：

```bash
node scripts/generate.mjs --platform android --core 1.14 \
  --input nodes.txt --output generated/sing-box.json
sing-box check -c generated/sing-box.json
```

`nodes.txt`、`nodes.json` 和 `generated/` 已加入 `.gitignore`，CLI 输出文件权限为 `0600`。
私有模板通过 `--template PATH` 指定。

默认配置：国内与局域网直连，其他流量按应用策略组或主选择组代理；不含广告拦截。
自动测速间隔 10 分钟，日志级别为 warn。TCP/UDP 遵循相同应用策略；自动选择优先保证节点具备 UDP 能力。
具体默认值、选择依据和修改方法见[配置说明](docs/policy-groups.md)。

## 选择平台

| 平台 | 配置 | 说明 |
| --- | --- | --- |
| Android / SFA | [FakeIP](platforms/android/1.14/fakeip.json) · [RealIP](platforms/android/1.14/realip.json) | [导入与版本选择](platforms/android/README.md) |
| iOS / SFI | [FakeIP](platforms/ios/1.14/fakeip.json) · [RealIP](platforms/ios/1.14/realip.json) | [导入与局域网访问](platforms/ios/README.md) |
| macOS / SFM | [FakeIP](platforms/macos/1.14/fakeip.json) · [RealIP](platforms/macos/1.14/realip.json) · [mixed](platforms/macos/1.14/mixed.json) | [使用说明](platforms/macos/README.md) |
| Linux | [TUN](platforms/linux/1.14/tun.json) · [mixed](platforms/linux/1.14/mixed.json) | [使用说明](platforms/linux/README.md) |
| Windows | [TUN](platforms/windows/1.14/tun.json) · [mixed](platforms/windows/1.14/mixed.json) | [使用说明](platforms/windows/README.md) |

所有平台都先选择内核版本，再选择配置：`platforms/<平台>/<版本>/`。上表链接指向 1.14；使用 1.13 内核时，换成同平台 `1.13/` 目录中的同名文件。`1.15/` 为**实验版**，仅按 `1.15.0-alpha.12` 验证。

Linux / Windows 可先用 `mixed.json`，运行后将应用代理设为 `127.0.0.1:2080`：

```bash
node scripts/generate.mjs --platform linux --core 1.14 --scenario mixed \
  --input nodes.json --output generated/linux.json
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

## 修改与复用

配置源位于 [`modules/`](modules/README.md)，版本、平台与场景组合在
[`modules/catalog.json`](modules/catalog.json)，`platforms/` 是生成结果。
构建与检查见[参与开发](CONTRIBUTING.md)，JavaScript API 与私有模板见[模块结构](docs/architecture.md)。

## 文档

[入门](docs/getting-started.md) · [更新节点](docs/update-nodes.md) · [策略组与规则顺序](docs/policy-groups.md) · [版本兼容](docs/compatibility.md) · [故障排查](docs/troubleshooting.md) · [Raw 链接](SUBSCRIPTIONS.md) · [参与开发](CONTRIBUTING.md)

规则集来自 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)，策略分组参考 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR)。代码与配置采用 [MIT](LICENSE)，第三方规则许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。
