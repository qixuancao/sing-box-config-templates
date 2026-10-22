# 远程配置链接

先按实际 sing-box 内核选择 **1.14** 或 **1.13**，再选平台与配置。所有文件均使用明确版本路径。
**1.15 · 实验版** 同样位于 `platforms/<平台>/1.15/`，配置入口与固定 alpha
验证说明见[实验版文档](docs/experimental-1.15.md)；下表列出稳定版本链接。

公开 JSON 含占位节点；用 `node scripts/generate.mjs` 在本地注入自己的节点后，再导入客户端。

## Android / SFA

### 1.14.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Ffakeip.json#Android%20%2F%20SFA%201.14%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Frealip.json#Android%20%2F%20SFA%201.14%20realip> |
| `tcp-stable.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Ftcp-stable.json#Android%20%2F%20SFA%201.14%20tcp-stable> |
| `privacy-strict.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fprivacy-strict.json#Android%20%2F%20SFA%201.14%20privacy-strict> |
| `dual-stack.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fdual-stack.json#Android%20%2F%20SFA%201.14%20dual-stack> |
| `no-adblock.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fno-adblock.json#Android%20%2F%20SFA%201.14%20no-adblock> |
| `battery-saver.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fbattery-saver.json#Android%20%2F%20SFA%201.14%20battery-saver> |
| `udp-first.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.14/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.14%2Fudp-first.json#Android%20%2F%20SFA%201.14%20udp-first> |

### 1.13.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Ffakeip.json#Android%20%2F%20SFA%201.13%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Frealip.json#Android%20%2F%20SFA%201.13%20realip> |
| `tcp-stable.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/tcp-stable.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Ftcp-stable.json#Android%20%2F%20SFA%201.13%20tcp-stable> |
| `privacy-strict.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/privacy-strict.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fprivacy-strict.json#Android%20%2F%20SFA%201.13%20privacy-strict> |
| `dual-stack.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/dual-stack.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fdual-stack.json#Android%20%2F%20SFA%201.13%20dual-stack> |
| `no-adblock.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/no-adblock.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fno-adblock.json#Android%20%2F%20SFA%201.13%20no-adblock> |
| `battery-saver.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/battery-saver.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fbattery-saver.json#Android%20%2F%20SFA%201.13%20battery-saver> |
| `udp-first.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/android/1.13/udp-first.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fandroid%2F1.13%2Fudp-first.json#Android%20%2F%20SFA%201.13%20udp-first> |

## iOS / iPadOS / SFI

### 1.14.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/1.14/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2F1.14%2Ffakeip.json#iOS%20%2F%20iPadOS%20%2F%20SFI%201.14%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/1.14/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2F1.14%2Frealip.json#iOS%20%2F%20iPadOS%20%2F%20SFI%201.14%20realip> |

### 1.13.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/1.13/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2F1.13%2Ffakeip.json#iOS%20%2F%20iPadOS%20%2F%20SFI%201.13%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/ios/1.13/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fios%2F1.13%2Frealip.json#iOS%20%2F%20iPadOS%20%2F%20SFI%201.13%20realip> |

## macOS / SFM

### 1.14.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.14/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2F1.14%2Ffakeip.json#macOS%20%2F%20SFM%201.14%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.14/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2F1.14%2Frealip.json#macOS%20%2F%20SFM%201.14%20realip> |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.14/mixed.json) | — |

### 1.13.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `fakeip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.13/fakeip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2F1.13%2Ffakeip.json#macOS%20%2F%20SFM%201.13%20fakeip> |
| `realip.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.13/realip.json) | <sing-box://import-remote-profile?url=https%3A%2F%2Fraw.githubusercontent.com%2Fqixuancao%2Fsing-box-config-templates%2Fmain%2Fplatforms%2Fmacos%2F1.13%2Frealip.json#macOS%20%2F%20SFM%201.13%20realip> |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/macos/1.13/mixed.json) | — |

## Linux

### 1.14.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/1.14/mixed.json) | — |
| `tun.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/1.14/tun.json) | — |

### 1.13.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/1.13/mixed.json) | — |
| `tun.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/linux/1.13/tun.json) | — |

## Windows

### 1.14.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/1.14/mixed.json) | — |
| `tun.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/1.14/tun.json) | — |

### 1.13.x

| 配置 | Raw JSON | 一键导入 |
| --- | --- | --- |
| `mixed.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/1.13/mixed.json) | — |
| `tun.json` | [JSON](https://raw.githubusercontent.com/qixuancao/sing-box-config-templates/main/platforms/windows/1.13/tun.json) | — |

`sing-box://import-remote-profile` 让图形客户端记录 HTTPS 配置地址，更新间隔由客户端设置决定。
