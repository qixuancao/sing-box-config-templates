# sing-box Android configuration templates

面向 sing-box for Android（SFA）的可审计配置模板。目标不是堆很多规则，
而是提供四份只改变一个关键策略的配置，让问题可以被逐项定位。

> 本仓库不是机场或节点订阅。公开模板只含 `example.com` 和
> `CHANGE_ME`，可以检查、导入和二次生成，但不能直接提供代理连接。

## 四种模板

| 模板 | 适合场景 | 核心区别 | 代价 |
| --- | --- | --- | --- |
| [`fakeip.json`](templates/fakeip.json) | 日常首选 | 国外域名使用 FakeIP，国内域名直连解析 | 少数应用可能不兼容 FakeIP |
| [`realip.json`](templates/realip.json) | 排查兼容问题 | 全部返回真实 IP，国内/国外分流解析 | 首次解析通常略慢 |
| [`tcp-stable.json`](templates/tcp-stable.json) | UDP/QUIC 不稳定网络 | 在 RealIP 基础上拦截 DoT、QUIC 和 STUN | 失去 QUIC，部分实时功能可能降级 |
| [`privacy-strict.json`](templates/privacy-strict.json) | 更重视 DNS 隔离 | 普通 A 查询走代理 DNS，并拦截 DoT、QUIC 和 STUN | 速度和兼容性最保守 |

建议按表格顺序测试，每次只换一个模板。四份模板都采用：

- TUN `strict_route` 和 DNS 53 端口劫持；
- 国内规则直连、国外规则走代理；
- `urltest` 的 150 ms 容差，减少节点频繁跳换；
- 固定的 sing-box 1.14 配置语法与自动校验；
- 不启用普通非 root SFA 无法完整利用的 `auto_redirect`。

## 生成自己的私有配置

需要 Bash、`jq` 和 sing-box 1.14.x：

```bash
cp examples/nodes.example.json nodes.json
# 只在本地编辑 nodes.json，填入你自己的出站；该文件已被 Git 忽略。
./scripts/render.sh templates/fakeip.json nodes.json generated/sing-box.json
sing-box check -c generated/sing-box.json
```

`nodes.json` 的 `outbounds` 是标准 sing-box 出站数组；`udp_outbounds`
只写支持 UDP 的出站 tag。生成结果权限为 `0600`，也在 Git 忽略范围内。

不要把真实节点直接写回 `templates/` 或 `examples/`。更详细的边界见
[`SECURITY.md`](SECURITY.md)。

## 安卓远程配置

公开 Raw URL 和 SFA 一键导入链接见 [`SUBSCRIPTIONS.md`](SUBSCRIPTIONS.md)。
这些链接只演示远程配置机制；真正可用的私有配置应放在你控制且需要认证
的存储中，不要提交到公开仓库。

## 本地验证

```bash
SING_BOX=/path/to/sing-box ./scripts/check.sh
./scripts/audit-public.sh
```

CI 固定下载 sing-box 1.14.0，并校验官方发布包的 SHA-256 后检查全部模板。

## 设计来源

- [sing-box 官方项目](https://github.com/SagerNet/sing-box)
- [sing-box for Android](https://github.com/SagerNet/sing-box-for-android)
- [官方客户端配置手册](https://github.com/SagerNet/sing-box/blob/testing/docs/manual/proxy/client.md)
- [社区 1.11.x 客户端模板讨论](https://linux.do/t/topic/595112)

本项目是非官方模板集合，与 SagerNet 无隶属关系。配置应随 sing-box 的
弃用与迁移说明持续更新。

## License

[MIT](LICENSE)
