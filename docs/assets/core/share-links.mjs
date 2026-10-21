// Add protocol adapters here; UI and config composition need no changes.
import {requireValue} from './errors.mjs';
import {checkedURL, decode, host, port} from './protocols/common.mjs';
import {parseShadowsocks} from './protocols/shadowsocks.mjs';
import {parseNaive} from './protocols/naive.mjs';
import {parseHysteria2} from './protocols/hysteria2.mjs';
import {parseV2Ray} from './protocols/v2ray.mjs';

function fromURL(type, parse) {
  return text => {
    const url = checkedURL(text);
    return parse(url, {type, tag: decode(url.hash.slice(1)), server: host(url), server_port: port(url)});
  };
}
const ADAPTERS = new Map([
  ['ss', parseShadowsocks],
  ['naive+https', fromURL('naive', parseNaive)],
  ['hy2', fromURL('hysteria2', parseHysteria2)],
  ['hysteria2', fromURL('hysteria2', parseHysteria2)],
  ['trojan', fromURL('trojan', parseV2Ray)],
  ['vless', fromURL('vless', parseV2Ray)],
]);

export function parseLink(text) {
  const scheme = text.split('://')[0].toLowerCase();
  const adapter = ADAPTERS.get(scheme);
  requireValue(adapter, 'scheme');
  return adapter(text);
}
