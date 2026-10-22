# sing-box 1.15 · 实验版

按官方 **1.15.0-alpha.12** 预备，稳定配置继续维护 1.13 / 1.14。
网页的“高级设置”中可主动选择 1.15；默认仍是 1.14。
配置与稳定版使用同一目录结构：`platforms/<平台>/1.15/<场景>.json`，
实验状态由版本目录说明、网页标签和 `modules/catalog.json` 的 `channel` 标记。

| 平台 | 配置 |
| --- | --- |
| Android | [FakeIP](../platforms/android/1.15/fakeip.json) · [RealIP](../platforms/android/1.15/realip.json)，另含六种场景 |
| iOS | [FakeIP](../platforms/ios/1.15/fakeip.json) · [RealIP](../platforms/ios/1.15/realip.json) |
| macOS | [FakeIP](../platforms/macos/1.15/fakeip.json) · [RealIP](../platforms/macos/1.15/realip.json) · [mixed](../platforms/macos/1.15/mixed.json) |
| Linux | [mixed](../platforms/linux/1.15/mixed.json) · [TUN](../platforms/linux/1.15/tun.json) |
| Windows | [mixed](../platforms/windows/1.15/mixed.json) · [TUN](../platforms/windows/1.15/tun.json) |

## 已适配的差异

- 按[官方迁移指南](https://sing-box.sagernet.org/migration/#1150)移除 TUN 的
  `stack` 字段，采用 1.15 的新默认栈。1.13 / 1.14 模块保留原设置。
- DNS、路由和规则集各有独立的 `modules/<类别>/1.15/` 来源，初始策略沿用 1.14。
- Android 保持无需 root 的客户端使用方式；新增的 root `auto_redirect` 能力不作为默认前提。
- 测试版新增的 Tailcat、MASQUE 等功能不影响现有默认场景，后续可按需要增加独立模块。

依据：[官方发布](https://github.com/SagerNet/sing-box/releases/tag/v1.15.0-alpha.12)、
[变更记录](https://sing-box.sagernet.org/changelog/)、
[TUN 字段](https://sing-box.sagernet.org/configuration/inbound/tun/#stack)。

## 生成与检查

```bash
node scripts/generate.mjs --platform android --core 1.15 \
  --input nodes.txt --output generated/sing-box-1.15.json
/path/to/temporary/sing-box check -c generated/sing-box-1.15.json
```

固定检查器版本和归档 SHA-256 位于 [`modules/catalog.json`](../modules/catalog.json)。
CI 下载该版本到临时 runner，只执行 `version` / `check`，验证 17 份平台配置、
节点填入后的配置及五种分享链接的生成结果。

这里验证的是 Linux 检查器接受配置、生成器正确组合字段；客户端连接、各平台 TUN
表现和真实节点连通性仍需实际设备验证。更新 alpha 版本时重新核对官方变更与校验值。
