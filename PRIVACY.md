# 隐私说明（PRIVACY）

本仓库提供的是 sing-box 配置模板。模板本身不会收集你的信息，也没有统计、
上报或外部分析脚本。但 sing-box 在运行时会按配置产生以下默认外联，
使用前请知悉。

## 默认运行时外联

- **DNS**：
  - `223.5.5.5`（AliDNS）：`direct-dns` 与 `direct-dns-bootstrap` 默认使用，
    负责国内域名与规则集域名的解析。
  - `8.8.8.8`（Google Public DNS）：`proxy-dns` 默认使用（经 `select` 出站），
    负责国外域名与最终解析。
- **连通性探测**：
  - `https://www.gstatic.com/generate_204`：普通版两个 `urltest`（`auto`、
    `udp-auto`）默认每 3 分钟探测一次，用于自动测速与故障切换。
- **远程规则集**：
  - `https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/...`：
    启动与更新时下载 17 个 MetaCubeX `.srs` 二进制规则集（详见
    [`THIRD_PARTY.md`](THIRD_PARTY.md)）。
- **本地状态**：
  - `cache_file`（含 `cache_id`）与 FakeIP 映射保存在本地，用于重启后复用
    缓存与 FakeIP 状态，不会上传到本仓库。

以上均为模板默认值。你可以在自己生成后的私有配置中更换 DNS、探测 URL 或
规则集来源，但更换后需自行承担可用性与兼容性验证。

## `privacy-strict` 的真实含义

`privacy-strict.json` 是“更严格的 DNS 隔离”，不是零第三方、零日志或完全匿名：

- A 查询统一经代理 DNS，不发送 ECS（`client_subnet`），并阻断 DoT、QUIC 与 STUN；
- 但它仍然会访问上述默认 DNS、探测地址与规则集 CDN，本地仍会写
  `cache_file`，sing-box 与系统仍可能产生常规日志；
- 它不能替代 Tor、不能保证运营商或服务端不可见，也不能保证第三方 CDN
  不记录请求元数据。

## 本地生成原则

- 真实节点、密码、UUID、密钥与订阅 Token 只放在被 Git 忽略的 `nodes.json`
  与 `generated/`，绝不提交到公开仓库；
- `render.sh` 只在本地做 JSON 合并，不上传、不解密、不转换远程订阅；
- 提交 Issue 前务必删除服务器、域名、IP、端口、密码、UUID、密钥和订阅
  token，详见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
