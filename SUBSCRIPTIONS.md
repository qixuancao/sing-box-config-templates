# 远程配置链接

这些是**完整配置模板**的 Raw URL / 导入链接，不是机场节点订阅。公开文件只含
`example.com` 与 `CHANGE_ME`，用于预览、校验和二次生成，不能直接提供代理
连接。

真正可用的远程配置应先用 `render.sh` 注入自己的节点，再放到你控制且需要
认证的 HTTPS 存储。把私有配置放进公开 GitHub 仓库会泄露全部凭据。

## Android / SFA

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP 推荐 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Ffakeip.json#Android%20FakeIP> |
| RealIP 兼容 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Frealip.json#Android%20RealIP> |
| TCP 稳定 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Ftcp-stable.json#Android%20TCP%20Stable> |
| 隐私严格 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Fprivacy-strict.json#Android%20Privacy%20Strict> |
| 双栈 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Fdual-stack.json#Android%20Dual%20Stack> |
| 无广告拦截 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Fno-adblock.json#Android%20No%20Adblock> |
| 省电 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Fbattery-saver.json#Android%20Battery%20Saver> |
| UDP 优先 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2Fudp-first.json#Android%20UDP%20First> |

顶层链接会跟随当前版。若需要锁定旧内核 schema，请订阅下面对应的版本化路径，
不要给 1.12/1.13 客户端使用顶层链接。

<details>
<summary>Android 1.14.x 固定路径（CI：1.14.0）</summary>

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Ffakeip.json#Android%201.14%20FakeIP> |
| RealIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Frealip.json#Android%201.14%20RealIP> |
| TCP 稳定 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Ftcp-stable.json#Android%201.14%20TCP%20Stable> |
| 隐私严格 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fprivacy-strict.json#Android%201.14%20Privacy%20Strict> |
| 双栈 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fdual-stack.json#Android%201.14%20Dual%20Stack> |
| 无广告拦截 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fno-adblock.json#Android%201.14%20No%20Adblock> |
| 省电 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fbattery-saver.json#Android%201.14%20Battery%20Saver> |
| UDP 优先 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fudp-first.json#Android%201.14%20UDP%20First> |

</details>

<details>
<summary>Android 1.13.x 固定路径（CI：1.13.21）</summary>

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Ffakeip.json#Android%201.13%20FakeIP> |
| RealIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Frealip.json#Android%201.13%20RealIP> |
| TCP 稳定 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Ftcp-stable.json#Android%201.13%20TCP%20Stable> |
| 隐私严格 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fprivacy-strict.json#Android%201.13%20Privacy%20Strict> |
| 双栈 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fdual-stack.json#Android%201.13%20Dual%20Stack> |
| 无广告拦截 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fno-adblock.json#Android%201.13%20No%20Adblock> |
| 省电 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fbattery-saver.json#Android%201.13%20Battery%20Saver> |
| UDP 优先 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fudp-first.json#Android%201.13%20UDP%20First> |

</details>

<details>
<summary>Android 1.12.x 固定路径（CI：1.12.25）</summary>

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Ffakeip.json#Android%201.12%20FakeIP> |
| RealIP | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Frealip.json#Android%201.12%20RealIP> |
| TCP 稳定 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Ftcp-stable.json#Android%201.12%20TCP%20Stable> |
| 隐私严格 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Fprivacy-strict.json#Android%201.12%20Privacy%20Strict> |
| 双栈 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Fdual-stack.json#Android%201.12%20Dual%20Stack> |
| 无广告拦截 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Fno-adblock.json#Android%201.12%20No%20Adblock> |
| 省电 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Fbattery-saver.json#Android%201.12%20Battery%20Saver> |
| UDP 优先 | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.12/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.12%2Fudp-first.json#Android%201.12%20UDP%20First> |

</details>

## iOS / iPadOS / SFI

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP 推荐 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2Ffakeip.json#iOS%20FakeIP> |
| RealIP 兼容 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2Frealip.json#iOS%20RealIP> |

## macOS / SFM

| 配置 | Raw URL | 一键导入 |
| --- | --- | --- |
| FakeIP 推荐 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2Ffakeip.json#macOS%20FakeIP> |
| RealIP 兼容 | [查看 JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2Frealip.json#macOS%20RealIP> |

命令行 mixed 配置：

```text
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/mixed.json
```

## Linux

```text
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/mixed.json
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/tun.json
```

## Windows

```text
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/mixed.json
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/tun.json
```

## 旧链接兼容

最早发布的四个 Android Raw URL 继续保留，现由 CI 检查并与新版策略布局同步：

```text
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/templates/fakeip.json
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/templates/realip.json
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/templates/tcp-stable.json
https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/templates/privacy-strict.json
```

`sing-box://import-remote-profile` 只是让图形客户端记录一个 HTTPS 配置地址。
远程更新是否启用、更新间隔以及证书信任仍由客户端设置决定。
