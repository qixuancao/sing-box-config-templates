// Customize a generated profile without mutating its preset or user nodes.
import {requireValue} from './errors.mjs';
import {object, clone} from './values.mjs';

const validIPv4 = value => typeof value === 'string' &&
  /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
  value.split('.').every(octet => Number(octet) <= 255);

export function customizeTemplate(template, {dnsTemplate = null, systemProxy = false, listenPort = 2080,
  directDns = null, proxyDns = null} = {}) {
  requireValue(object(template) && Array.isArray(template.inbounds), 'template');
  const config = clone(template);
  if (dnsTemplate !== null) {
    requireValue(object(dnsTemplate) && object(dnsTemplate.dns) &&
      Array.isArray(dnsTemplate.dns.servers) && Array.isArray(dnsTemplate.dns.rules), 'template');
    config.dns = clone(dnsTemplate.dns);
    const fakeIP = config.dns.servers.some(server => server.type === 'fakeip');
    const isMixed = config.inbounds.some(inbound => inbound.type === 'mixed');
    requireValue(!fakeIP || !isMixed, 'template');
    if (config.experimental?.cache_file) {
      if (fakeIP) config.experimental.cache_file.store_fakeip = true;
      else delete config.experimental.cache_file.store_fakeip;
    }
  }
  requireValue(Number.isInteger(listenPort) && listenPort >= 1 && listenPort <= 65535, 'template');
  const mixed = config.inbounds.find(inbound => inbound.type === 'mixed');
  if (mixed) {
    mixed.listen_port = listenPort;
    mixed.set_system_proxy = Boolean(systemProxy);
  } else {
    requireValue(!systemProxy && listenPort === 2080, 'template');
  }
  for (const [tag, value] of [['direct-dns', directDns], ['proxy-dns', proxyDns]]) {
    if (value === null) continue;
    requireValue(validIPv4(value), 'template');
    const server = config.dns?.servers.find(server => server.tag === tag);
    requireValue(server && server.type === 'https', 'template');
    server.server = value;
    if (tag === 'direct-dns') {
      const bootstrap = config.dns.servers.find(server => server.tag === 'direct-dns-bootstrap');
      requireValue(bootstrap && bootstrap.type === 'udp', 'template');
      bootstrap.server = value;
    }
  }
  return config;
}
