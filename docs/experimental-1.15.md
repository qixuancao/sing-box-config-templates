# sing-box 1.15 · 实验版

仅按官方 **1.15.0-alpha.13** 验证，在网页高级设置或 CLI `--core 1.15` 中选择。
配置位于 `platforms/<平台>/1.15/`；默认推荐 1.14。

| 平台 | 配置 |
| --- | --- |
| Android | [FakeIP](../platforms/android/1.15/fakeip.json) · [RealIP](../platforms/android/1.15/realip.json) |
| iOS | [FakeIP](../platforms/ios/1.15/fakeip.json) · [RealIP](../platforms/ios/1.15/realip.json) |
| macOS | [FakeIP](../platforms/macos/1.15/fakeip.json) · [RealIP](../platforms/macos/1.15/realip.json) · [mixed](../platforms/macos/1.15/mixed.json) |
| Linux | [mixed](../platforms/linux/1.15/mixed.json) · [TUN](../platforms/linux/1.15/tun.json) |
| Windows | [mixed](../platforms/windows/1.15/mixed.json) · [TUN](../platforms/windows/1.15/tun.json) |

## 已适配的差异

- 按[官方迁移指南](https://sing-box.sagernet.org/migration/#1150)移除 TUN 的
  `stack` 字段，采用 1.15 的新默认栈。1.13 / 1.14 模块保留原设置。
  这是本仓库的默认策略；上游在 1.15 弃用该选项，计划在 1.17 移除，并非 1.15 已不接受该字段。
- DNS、路由和规则集各有独立的 `modules/<类别>/1.15/` 来源，初始策略沿用 1.14。
- Android 保持无需 root 的客户端使用方式；新增的 root `auto_redirect` 能力不作为默认前提。

依据：[官方发布](https://github.com/SagerNet/sing-box/releases/tag/v1.15.0-alpha.13)、
[变更记录](https://sing-box.sagernet.org/changelog/)、
[TUN 字段](https://sing-box.sagernet.org/configuration/inbound/tun/#stack)。

## alpha.13 适配评估

上游于 2026-10-24 发布 [1.15.0-alpha.13](https://github.com/SagerNet/sing-box/releases/tag/v1.15.0-alpha.13)。
本仓已从 alpha.12 升级到 alpha.13 验证基线：官方检查器归档经 SHA-256 校验，
11 份平台配置、节点填入后的配置及生成器 core 检查通过；稳定默认仍为 1.14。

对两个 tag 的对应文件直接比较（提交历史存在分叉，不能将 compare 的全部提交视为新增功能）：

- `option/tun.go`、`option/route.go`、`option/http.go`、`option/experimental.go` 未变；这些配置结构没有新增的必迁移字段。
- TUN 平台接口判断及 Linux DNS 缓存刷新有实现修复；Naive 增加复用能力标记，拨号器调整 ICMP/UDP 网络选择。这些是升级内核获得的修复，不需要为模板添加开关。
- URLTest 开始拒绝组内重复 tag，生成器输出必须保持组成员唯一。
- 上游 FakeIP IPv6 示例改用 `2001:2::/48`；这是示例调整，不应仅为跟随示例而迁移现有地址或缓存。
- `route_address_set` / `route_exclude_address_set` 的图形客户端限制说明扩展到 Apple；本仓使用有限的显式排除地址，不引入大型规则集路由表。

暂不为更新增加 MASQUE、Tailcat 或 Android root 模式，也不将实验版变为稳定默认。
这些能力不是 alpha.13 才出现，且不属于当前日常模板的必要依赖。

## 生成与检查

```bash
node scripts/generate.mjs --platform android --core 1.15 \
  --input nodes.txt --output generated/sing-box-1.15.json
/path/to/temporary/sing-box check -c generated/sing-box-1.15.json
```

固定检查器版本和归档 SHA-256 位于 [`modules/catalog.json`](../modules/catalog.json)。
CI 下载该版本到临时 runner，只执行 `version` / `check`，验证目录清单中的 11 份平台配置、
节点填入后的配置及五种分享链接的生成结果。

这里验证的是 Linux 检查器接受配置、生成器正确组合字段；客户端连接、各平台 TUN
表现和真实节点连通性仍需实际设备验证。更新 alpha 版本时重新核对官方变更与校验值。
