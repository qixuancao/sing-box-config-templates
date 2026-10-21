# sing-box 配置工具

[English](README.en.md) · [配置选择器](https://qixuancao.github.io/sing-box-config-templates/) · [更新记录](CHANGELOG.md)

为 Android、iOS、macOS、Linux 和 Windows 生成 sing-box 配置。内置国内外分流、应用策略组、FakeIP / RealIP DNS，以及 TUN 和本地 HTTP/SOCKS 代理模式。

- 按流媒体、AI、Telegram、Microsoft、Apple、Google、GitHub 选择出口；
- 手动选节点或通过 URLTest 按延迟自动选择；
- 在本地合并节点，生成可直接导入客户端的 JSON；
- 所有平台按 1.13、1.14 两条内核版本线维护。

## 快速开始

需要 Bash、`jq` 和 sing-box。

```bash
git clone https://github.com/qixuancao/sing-box-config-templates.git
cd sing-box-config-templates
cp examples/nodes.example.json nodes.json
```

编辑 `nodes.json`，填入自己的 sing-box 出站，然后生成配置：

```bash
./scripts/render.sh platforms/android/1.14/fakeip.json nodes.json generated/android.json
sing-box check -c generated/android.json
```

在客户端导入 `generated/android.json`。`nodes.json` 和 `generated/` 已加入 `.gitignore`，生成文件权限为 `0600`。节点格式见 [节点配置](docs/nodes.md)。

## 选择平台

| 平台 | 配置 | 说明 |
| --- | --- | --- |
| Android / SFA | [FakeIP](platforms/android/1.14/fakeip.json) · [RealIP](platforms/android/1.14/realip.json) | [八种场景与版本选择](platforms/android/README.md) |
| iOS / SFI | [FakeIP](platforms/ios/1.14/fakeip.json) · [RealIP](platforms/ios/1.14/realip.json) | [导入与局域网访问](platforms/ios/README.md) |
| macOS / SFM | [FakeIP](platforms/macos/1.14/fakeip.json) · [RealIP](platforms/macos/1.14/realip.json) · [mixed](platforms/macos/1.14/mixed.json) | [使用说明](platforms/macos/README.md) |
| Linux | [TUN](platforms/linux/1.14/tun.json) · [mixed](platforms/linux/1.14/mixed.json) | [使用说明](platforms/linux/README.md) |
| Windows | [TUN](platforms/windows/1.14/tun.json) · [mixed](platforms/windows/1.14/mixed.json) | [使用说明](platforms/windows/README.md) |

所有平台都先选择内核版本，再选择配置：`platforms/<平台>/1.14/` 或 `platforms/<平台>/1.13/`。上表链接指向 1.14；使用 1.13 内核时，换成同平台 `1.13/` 目录中的同名文件。

Linux / Windows 可先用 `mixed.json`，运行后将应用代理设为 `127.0.0.1:2080`：

```bash
./scripts/render.sh platforms/linux/1.14/mixed.json nodes.json generated/linux.json
sing-box check -c generated/linux.json
sing-box run -c generated/linux.json
```

## Android 场景

| 配置 | 用途 |
| --- | --- |
| `fakeip.json` | 日常使用，国外域名返回 FakeIP |
| `realip.json` | 应用不兼容 FakeIP 时使用 |
| `tcp-stable.json` | UDP 不稳定的网络；阻断 QUIC、DoT 和 STUN，会影响部分通话功能 |
| `privacy-strict.json` | DNS 统一走代理、不发送 ECS；同样阻断 QUIC、DoT 和 STUN |
| `dual-stack.json` | 本地网络和节点均支持 IPv6 |
| `no-adblock.json` | 关闭广告拦截，排查规则误杀 |
| `battery-saver.json` | 降低测速频率和日志量 |
| `udp-first.json` | 游戏、语音；优先使用指定的 UDP 节点 |

## 文档

[入门](docs/getting-started.md) · [策略组与规则顺序](docs/policy-groups.md) · [版本兼容](docs/compatibility.md) · [故障排查](docs/troubleshooting.md) · [Raw 链接](SUBSCRIPTIONS.md) · [参与开发](CONTRIBUTING.md)

规则集来自 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)，策略分组参考 [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR)。代码与配置采用 [MIT](LICENSE)，第三方规则许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。
