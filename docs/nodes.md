# 节点链接与 JSON 格式

网页和 `scripts/generate.mjs` 接受每行一个分享链接，或原生 sing-box 节点 JSON。
也可输入出站数组或单个出站对象。推荐保存为下面的节点文档，方便明确选择 UDP 节点：

```json
{
  "outbounds": [
    {
      "type": "hysteria2",
      "tag": "my-node",
      "server": "your-server.example",
      "server_port": 443,
      "password": "your-password",
      "tls": {
        "enabled": true,
        "server_name": "your-server.example",
        "insecure": false
      }
    }
  ],
  "udp_outbounds": [
    "my-node"
  ]
}
```

上面是格式示例，请替换为自己的节点。`outbounds` 接受生成器支持的 sing-box
出站类型，如 Hysteria2、VLESS、Trojan；完整字段以对应内核版本的
[官方出站文档](https://sing-box.sagernet.org/configuration/outbound/) 为准。

输入上限为 1 MB、200 个节点；标准化后的节点文档与模板最多嵌套 100 层对象或数组。
超过深度上限会返回明确错误，不生成配置。WebSocket / HTTPUpgrade 的 Host 不能包含
换行或其他 ASCII 控制字符；分享链接与原生节点 JSON 使用同一套检查。

## 两个数组分别做什么

- `outbounds`：所有节点。tag 必须唯一且非空。
- `udp_outbounds`：确认能承载 UDP 的节点 tag；省略时按节点类型和 `network` 字段推断。
  Naive、HTTP 等默认不加入 UDP；`network: "tcp"` 的节点同样排除。

生成器只能识别配置所声明的能力，不能替你确认服务端是否启用了 UDP。
需要进一步限制时显式填写 `udp_outbounds`；其名称必须存在且不重复。

自动选择组在非空 `udp_outbounds` 中选择，保持 TCP/UDP 出口一致；其他节点仍可手选。
全部节点只支持 TCP 时，使用 `"udp_outbounds": []`，自动组使用全部节点。
生成器保留同一套应用及直连规则；代理 UDP 是否可用取决于选中的出站能力，不会静默回退直连。
依赖 UDP 的游戏和通话需要支持 UDP 的节点；能力列表不等于网络实测结果。

Naive 默认使用 HTTP/2 承载 TCP；配置 `udp_over_tcp` 还需要服务端支持对应协议，
不能仅凭节点类型或启用 QUIC 就把它列入 `udp_outbounds`。Naive 从 1.13 起提供，
应使用支持该出站的构建；官方 Linux / Windows purego 发行包还需保留随包的
Cronet 库。详见 [Naive 官方文档](https://sing-box.sagernet.org/configuration/outbound/naive/)
和 [UDP over TCP](https://sing-box.sagernet.org/configuration/shared/udp-over-tcp/)。

## 保留 tag

节点不能使用这些内部 tag：

```text
select auto streaming ai telegram microsoft apple google github direct GLOBAL
```

脚本遇到重复 tag、保留 tag、空的 `outbounds` 或不存在的 UDP tag 会直接退出。

## 分享链接支持范围

| 类型 | 支持的设置 |
| --- | --- |
| `naive+https://` | 用户名、密码、SNI；默认按 TCP 处理 |
| `hy2://` / `hysteria2://` | 密码、SNI、证书校验选项、Salamander 混淆 |
| `trojan://` | TLS、SNI、ALPN、TCP / WebSocket / gRPC / HTTPUpgrade |
| `vless://` | UUID、TLS / Reality、Vision、上述传输与 packetEncoding |
| `ss://` | SIP002 与旧版 Base64 格式、常见 AEAD / 2022 加密 |

未支持的参数会报错，例如 SS 插件、XHTTP 或 Hysteria2 证书 pin，避免转换时悄悄丢失设置。
这类配置可使用原生 sing-box 节点 JSON，再用实际内核检查。HTTP(S) 订阅地址不是节点
分享链接，请从客户端导出节点后输入。

字段依据：[sing-box 出站](https://sing-box.sagernet.org/configuration/outbound/)、
[Hysteria2 URI](https://v2.hysteria.network/docs/developers/URI-Scheme/)。

## 保存与更新

网页的“保存节点 JSON”导出本节的节点文档，“下载 sing-box.json”导出完整配置。
命令行建议使用已被 Git 忽略的 `nodes.json` / `nodes.txt`，输出放在 `generated/`。
更新步骤见[更换节点](update-nodes.md)。
