# 更换节点与更新配置

## 网页操作

1. 打开[配置生成器](https://qixuancao.github.io/sing-box-config-templates/)。
2. 粘贴新的节点分享链接，或读取上次保存的 `nodes.json`。
3. 增删节点；使用 JSON 时，同步调整明确填写的 `udp_outbounds`。
4. 选择设备，在高级设置里核对内核版本，重新生成并下载 `sing-box.json`。
5. 在客户端替换本地配置，重新启用连接。

“保存节点 JSON”只保存节点和 UDP 节点选择，便于下次重新生成。它与包含 DNS、
路由和入站设置的完整 `sing-box.json` 是两种文件。

模板更新后也可沿用同一个节点文件。重新生成会采用当前模板的默认设置；若你
手工改过完整配置，请先保留自己的改动。

## 命令行操作

把分享链接逐行存入已被 Git 忽略的 `nodes.txt`，或使用 `nodes.json`：

```bash
git pull --ff-only
node scripts/generate.mjs --platform android --core 1.14 \
  --input nodes.txt --output generated/sing-box.json
sing-box check -c generated/sing-box.json
```

修改了客户端内核版本时，同步调整 `--core`。脚本共用网页的解析与生成逻辑，
校验失败时保留原有输出文件。
