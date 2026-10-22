# 隐私说明（PRIVACY）

网页生成器在浏览器内解析节点、组合配置并导出文件，不发送节点信息、不使用分析脚本，
也不自动写入浏览器持久存储。刷新或离开页面会清空节点。页面与公共模板由 GitHub Pages
提供；GitHub 对普通网站访问的处理见其隐私政策。

点击“下载 sing-box.json”“保存节点 JSON”或“复制 JSON”会按你的操作导出节点信息。
下载的文件与剪贴板由你自己的设备保存。

生成的配置交给 sing-box 运行后，默认会访问下列服务：

## 默认运行时外联

- **DNS**：
  - `223.5.5.5`（AliDNS）：`direct-dns` 与 `direct-dns-bootstrap` 默认使用，
    负责国内域名与规则集域名的解析。
  - `8.8.8.8`（Google Public DNS）：`proxy-dns` 默认使用（经 `select` 出站），
    负责国外域名与最终解析。
- **连通性探测**：
  - `https://www.gstatic.com/generate_204`：`auto` URLTest 默认每 10 分钟探测一次。
- **远程规则集**：
  - `https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/...`：
    启动与更新时下载 16 个 MetaCubeX `.srs` 规则集（详见
    [`THIRD_PARTY.md`](THIRD_PARTY.md)）。
- **本地状态**：
  - `cache_file`（含 `cache_id`）与 FakeIP 映射保存在本地，用于重启后复用
    缓存与 FakeIP 状态，不会上传到本仓库。

以上均为模板默认值。你可以在自己生成后的私有配置中更换 DNS、探测 URL 或
规则集来源，但更换后需自行承担可用性与兼容性验证。

1.14 / 1.15 的 FakeIP 响应评估会发送固定的 ECS 值 `114.114.114.0/24`，不取设备实际地址。
网页选择 Cloudflare 时，相关 DNS 请求改发往 `1.1.1.1`。直连 DNS、规则下载和本地绕行的流量不经过代理。

## 本地生成原则

- 命令行建议使用被 Git 忽略的 `nodes.json`、`nodes.txt` 与 `generated/`；
- `scripts/generate.mjs` 在本地解析节点、组合 JSON，不联网获取输入；
- 提交 Issue 前务必删除服务器、域名、IP、端口、密码、UUID、密钥和订阅
  token，详见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
