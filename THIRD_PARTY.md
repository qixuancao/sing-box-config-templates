# Third-party sources

This repository does not vendor the projects below, but it relies on or credits
them. Their own licenses remain authoritative.

| Project | Use here | Upstream license |
| --- | --- | --- |
| [SagerNet/sing-box](https://github.com/SagerNet/sing-box) | Configuration schema and validation binary | See upstream `LICENSE` |
| [SagerNet/sing-box-for-android](https://github.com/SagerNet/sing-box-for-android) | Android client behavior | See upstream repository |
| [SagerNet/sing-box-for-apple](https://github.com/SagerNet/sing-box-for-apple) | Apple client behavior | See upstream repository |
| [ACL4SSR/ACL4SSR](https://github.com/ACL4SSR/ACL4SSR) | Credited inspiration for task-oriented groups; no rule files copied | CC BY-SA 4.0 |
| [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) | Runtime URLs for remote `.srs` rule sets; no rule data vendored | GPL-3.0 |
| [jsDelivr / testingcf.jsdelivr.net](https://www.jsdelivr.com/) | Runtime CDN for 16 MetaCubeX `.srs` files | See CDN terms |
| [Google Connectivity Check (gstatic)](https://www.gstatic.com/generate_204) | `urltest` target (every 10 minutes by default) | See Google terms |
| [AliDNS (223.5.5.5)](https://www.alidns.com/) | Default `direct-dns` / bootstrap resolver | See provider terms |
| [Google Public DNS (8.8.8.8)](https://developers.google.com/speed/public-dns) | Default `proxy-dns` resolver | See provider terms |
| [Cloudflare DNS (1.1.1.1)](https://developers.cloudflare.com/1.1.1.1/) | Optional DNS provider in the generator | See provider terms |

The repository's [MIT license](LICENSE) covers original templates, scripts, and
documentation only. Downloading a remote rule set does not change that rule
set's upstream license.
