# 节点文件格式

`render.sh` 接受一个小型 JSON 文档：

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

上面仍是格式示例，不是真实节点。`outbounds` 中每个对象就是标准 sing-box
出站；可使用 Hysteria2、VLESS、Trojan 等官方支持类型，但具体字段应以当前
[官方出站文档](https://sing-box.sagernet.org/configuration/outbound/) 为准。

## 两个数组分别做什么

- `outbounds`：所有节点。tag 必须唯一且非空。
- `udp_outbounds`：确认能承载 UDP 的节点 tag；省略时默认把所有节点都当作
  支持 UDP。

如果某些节点只支持 TCP，请显式填写 `udp_outbounds`。否则自动选择器可能把
QUIC、语音或 DNS 流量送到不支持 UDP 的节点。

## 保留 tag

节点不能使用这些内部 tag：

```text
select auto udp-auto streaming ai telegram microsoft apple google github direct GLOBAL
```

脚本遇到重复 tag、保留 tag、空数组或不存在的 UDP tag 会直接退出，不会生成
一份半坏配置。

## 订阅与节点文件不是一回事

本仓库的远程链接是“完整 sing-box 配置链接”。`render.sh` 接受的是已经整理成
标准出站对象的本地 JSON，并不会联网抓取、解析或转换机场订阅。这样做可以让
渲染过程可审计，也避免把订阅 token 意外写入日志或 Git 历史。

## 最低安全要求

1. 只在被 Git 忽略的 `nodes.json` 中放真实凭据；
2. 生成后执行 `git status --short`，确认没有私有文件进入暂存区；
3. 不要把含 token 的远程 URL 发到公开 Issue；
4. 凭据一旦进入公开 Git 历史，删除文件不够，必须立刻轮换凭据。
