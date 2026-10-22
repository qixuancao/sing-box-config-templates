# 配置模块

配置源统一在本目录：`catalog.json` 声明版本、平台与场景组合，类别子目录按
“功能 → 内核版本 → 方案”维护 JSON 片段，保留对应的 sing-box 顶层字段，
例如 DNS 文件包含 `{"dns": {...}}`。

```text
modules/
├── catalog.json            # 版本、平台与全部场景组合
├── dns/
│   ├── 1.13/
│   ├── 1.14/
│   │   ├── fakeip.json
│   │   └── realip.json
│   └── 1.15/
├── inbounds/{1.13,1.14,1.15}/
├── rules/{1.13,1.14,1.15}/
├── rule-sets/{1.13,1.14,1.15}/
├── base/{1.13,1.14,1.15}/
├── outbounds/common/
└── experimental/common/
```

三个版本的 DNS 目录都有上面两种方案。`outbounds/common/` 和
`experimental/common/` 共享策略组与缓存设置；版本相关的字段留在各自版本目录。
这里的 `experimental` 是 sing-box 的原生配置字段，与 1.15 的实验发布通道不同。

| 修改内容 | 入口 |
| --- | --- |
| DNS 服务器、FakeIP 范围、DNS 规则 | `dns/<版本>/<方案>.json` |
| TUN、mixed 监听地址和端口 | `inbounds/<版本>/<方案>.json` |
| 分流顺序、直连和拒绝策略 | `rules/<版本>/<方案>.json` |
| 远程规则集与下载方式 | `rule-sets/<版本>/<方案>.json` |
| 节点选择组、自动测速 | `outbounds/common/` |
| 日志、schema、HTTP 客户端 | `base/<版本>/default.json` |
| 场景选用哪些模块 | [`catalog.json`](catalog.json) 的 `scenarios` |
| 平台支持的场景、版本通道 | [`catalog.json`](catalog.json) 的 `platforms` / `versions` |

例如，`catalog.json` 中的 `scenarios.fakeip` 选择 `dns: fakeip`，
构建 1.14 配置时读取 `dns/1.14/fakeip.json`。TUN 和 mixed 复用同一套策略组；
修改 DNS 时不需要同时维护完整配置。IPv6 等用户选项由网页和 CLI 共用的 `customize.mjs` 应用。

```bash
# 修改模块或 catalog.json 后，生成所有配置与网页模板包
python3 -B scripts/build.py
# 确认生成产物与模块一致
python3 -B scripts/build.py --check
python3 -B scripts/check.py static
```

生成配置统一放在 `platforms/<平台>/<版本>/`，1.13 / 1.14 为稳定兼容线，
1.15 标记为实验版。网页和 CLI 将用户节点填入对应平台配置，导出完整 JSON。
构建时递归合并对象，数组保持模块中写出的顺序；模块重复定义同一字段会报错，
避免分流规则被拼接或覆盖。构建器不会把其他版本的模块作为缺省值。

版本差异与调用接口见[项目结构](../docs/architecture.md)，
测试版依据与验证范围见[1.15 实验版说明](../docs/experimental-1.15.md)。
