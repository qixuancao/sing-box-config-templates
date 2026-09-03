# sing-box 配置模板（sing-box config templates）：Android SFA / iOS SFI / macOS SFM / Linux / Windows

[中文](README.md) · [English](README.en.md)

可审计、可本地生成的 sing-box 配置（sing-box config templates），覆盖 Android SFA（含 1.12 / 1.13 / 1.14 三条内核兼容线）、iOS（SFI）、macOS（SFM）、Linux 与 Windows，提供 FakeIP 与 RealIP 两种 DNS 模式，以及 TUN 全局代理与 mixed 本地代理两种运行模式。仓库借鉴 ACL4SSR
“按用途选择策略”的体验，但使用 sing-box 原生 JSON、远程二进制规则集和
平台专用配置。桌面与 Apple
配置面向 1.14.x；Android 额外维护 1.14、1.13、1.12 三条兼容线。

> [!IMPORTANT]
> 本仓库不是机场，也不提供节点。所有公开 JSON 都故意使用
> `example.com` / `CHANGE_ME`，因此能通过语法检查，但不能直接联网。

> [!TIP]
> 先选择，再拿链接。公开 Raw JSON 是占位模板，不能直接联网：
> 1. 打开[配置选择器](https://qixuancao.github.io/sing-box-config-templates/)，按“平台 → Android 内核版本 → 使用场景”拿到 Raw URL、一键导入 URI 和本地 render 命令；
> 2. 按[三分钟生成自己的配置](#三分钟生成自己的配置)用 `render.sh` 在本地注入你自己的出站，再 `sing-box check`；
> 3. 只导入你自己生成后的文件。直接导入本仓库的占位 JSON 会校验通过但无法连接。

## 先选你的平台

| 平台 | 推荐入口 | 模式 | 权限 | 适合谁 |
| --- | --- | --- | --- | --- |
| Android | [`fakeip.json`](platforms/android/fakeip.json) | SFA TUN | 无 root | 大多数用户 |
| iOS / iPadOS | [`fakeip.json`](platforms/ios/fakeip.json) | SFI TUN | 普通 VPN 权限 | 大多数用户 |
| macOS | [`fakeip.json`](platforms/macos/fakeip.json) | SFM TUN | 客户端管理 | 全局接管流量 |
| macOS | [`mixed.json`](platforms/macos/mixed.json) | HTTP/SOCKS | 普通用户 | 只代理指定软件 |
| Linux | [`tun.json`](platforms/linux/tun.json) | TUN + nftables | root / CAP_NET_ADMIN | 全局透明代理 |
| Linux | [`mixed.json`](platforms/linux/mixed.json) | HTTP/SOCKS | 普通用户 | 最稳妥的起点 |
| Windows | [`tun.json`](platforms/windows/tun.json) | TUN | 管理员 | 全局透明代理 |
| Windows | [`mixed.json`](platforms/windows/mixed.json) | HTTP/SOCKS | 普通用户 | 手动设置系统代理 |

各平台的安装、导入和注意事项在 [`platforms/`](platforms/)；可复制的 Raw
URL 与一键导入链接在 [`SUBSCRIPTIONS.md`](SUBSCRIPTIONS.md)。

## Android：八种用途，三条核心兼容线

| 配置 | 何时使用 | 关键差异 |
| --- | --- | --- |
| [`fakeip.json`](platforms/android/fakeip.json) | 日常首选 | 国外 A 查询使用 FakeIP |
| [`realip.json`](platforms/android/realip.json) | 某些应用不兼容 FakeIP | 所有查询返回真实 IP |
| [`tcp-stable.json`](platforms/android/tcp-stable.json) | 视频、校园网或移动网络的 UDP 不稳 | 基于 RealIP，阻断 DoT、QUIC 与 STUN |
| [`privacy-strict.json`](platforms/android/privacy-strict.json) | 更看重 DNS 隔离 | A 查询统一经代理 DNS、不发送 ECS，并阻断 DoT、QUIC 与 STUN |
| [`dual-stack.json`](platforms/android/dual-stack.json) | 本地与节点都有可靠 IPv6 | RealIP 双栈、加入 IPv6 TUN 地址，并优先 IPv4 |
| [`no-adblock.json`](platforms/android/no-adblock.json) | 广告规则误杀应用或网页 | 保留分流，但不加载/执行广告拦截规则 |
| [`battery-saver.json`](platforms/android/battery-saver.json) | 后台常驻且更在意耗电 | RealIP，测速间隔 15 分钟，只记 error 日志 |
| [`udp-first.json`](platforms/android/udp-first.json) | 游戏、语音或实时通信优先 | 默认选择 `udp-auto` 中确认支持 UDP 的节点 |

| SFA 内核版本 | 版本化目录 | CI 固定检查器 | 关键 schema 差异 |
| --- | --- | --- | --- |
| 1.14.x | [`platforms/android/1.14/`](platforms/android/1.14/) | 1.14.0 | 使用 `http_clients`；FakeIP 可用 1.14 DNS 评估动作 |
| 1.13.x | [`platforms/android/1.13/`](platforms/android/1.13/) | 1.13.21 | 使用 `download_detour`；FakeIP 使用兼容规则 |
| 1.12.x | [`platforms/android/1.12/`](platforms/android/1.12/) | 1.12.25 | 使用 1.12/1.13 公共保守子集 |

顶层 `platforms/android/*.json` 是稳定链接，当前指向 1.14 语义；版本化目录
不会因为新版发布而偷偷换 schema。建议先按用途选一份，再按 SFA 日志或
“关于”页显示的内核版本进入对应目录。这里的 `x` 是兼容线，不是声称每个
历史补丁和每台手机都已实机验证。完整选择说明见
[`platforms/android/README.md`](platforms/android/README.md)。

iOS 与 macOS 先提供更保守的 FakeIP / RealIP 两种配置，避免把某个平台没有
实现的字段硬塞进去。

## 三分钟生成自己的配置

需要 Bash、`jq`，以及与所选配置匹配的 sing-box 检查器：

```bash
git clone https://github.com/qixuancao/sing-box-config-templates.git
cd sing-box-config-templates
cp examples/nodes.example.json nodes.json
# 编辑 nodes.json，换成你自己的标准 sing-box 出站。
./scripts/render.sh platforms/android/fakeip.json nodes.json generated/android.json
sing-box check -c generated/android.json
```

`nodes.json` 和 `generated/` 已被 Git 忽略；生成文件权限为 `0600`。完整说明见
[`docs/getting-started.md`](docs/getting-started.md) 与
[`docs/nodes.md`](docs/nodes.md)。

## 像 Clash 一样好找，但保持 sing-box 原生

所有配置都包含同一组稳定 tag：

- `select`、`auto`、`udp-auto`：手选、自动测速、UDP 可用节点；
- `streaming`、`ai`、`telegram`：流媒体、AI、Telegram；
- `microsoft`、`apple`、`google`、`github`：厂商服务；
- `direct`、`GLOBAL`：直连与最终兜底。

规则来自 MetaCubeX 的 sing-box `.srs` 分支，不把数千条静态规则复制进每份
配置。匹配顺序、默认值和 UDP 设计见
[`docs/policy-groups.md`](docs/policy-groups.md)。

## 仓库结构

```text
platforms/       按 Android、iOS、macOS、Linux、Windows 分类的可导入配置
templates/       旧版 Android Raw URL 的兼容入口（继续保留）
examples/        不含真实凭据的节点文件示例
docs/            入门、策略组、兼容性和排障文档
scripts/         私有节点注入、平台同步、审计与校验
.github/         自动校验工作流和问题模板
```

## 我们实际验证了什么

每次提交都会：

1. 校验所有 JSON 和平台差异约束；
2. 用示例节点渲染每一份配置；
3. 用官方 1.14.0 检查当前多平台配置；
4. 分别用官方 1.13.21、1.12.25 检查对应 Android 兼容目录；
5. 扫描真实凭据、私钥与私有网络标记；
6. 检查生成文件是否与模板同步，并验证八种 Android 配置的行为差异。

每周任务还会实际下载 17 个远程规则集，并让三套固定核心读取 `.srs` 二进制，
用于发现上游链接或旧核心兼容性漂移。

这证明的是“仓库结构和配置语法可复现”，不是所有型号设备、运营商和节点都
已经实机通过。边界和已知限制见
[`docs/compatibility.md`](docs/compatibility.md)。

## 来源与许可

- [sing-box 官方项目](https://github.com/SagerNet/sing-box)
- [sing-box for Android](https://github.com/SagerNet/sing-box-for-android)
- [sing-box for Apple platforms](https://github.com/SagerNet/sing-box-for-apple)
- [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR)（功能分组思路）
- [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat)（远程规则集）

本仓库代码与配置模板采用 [MIT](LICENSE)；远程加载的第三方规则数据仍遵循
各自上游许可，详见 [`THIRD_PARTY.md`](THIRD_PARTY.md)。本项目与 SagerNet、
ACL4SSR、MetaCubeX 均无隶属关系。

提交问题前请先看 [`CONTRIBUTING.md`](CONTRIBUTING.md)，并务必删除节点、
UUID、密码、域名和订阅 token。
