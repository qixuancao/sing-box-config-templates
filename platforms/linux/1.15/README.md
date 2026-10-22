# Linux 1.15 · 实验版

**实验版：仅按官方 sing-box 1.15.0-alpha.12 验证，稳定默认仍为 1.14。**

提供 [mixed](mixed.json) 和 [TUN](tun.json)。TUN 不再设置 `stack`，
仍启用 `strict_route` 与 Linux `auto_redirect`，运行时需要相应系统权限。

使用与权限说明见[上级 Linux 文档](../README.md)，
版本依据和验证边界见[1.15 实验版说明](../../../docs/experimental-1.15.md)。
