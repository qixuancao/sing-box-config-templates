// Customize a generated profile without mutating its preset or user nodes.
import {requireValue} from './errors.mjs';
import {object, clone} from './values.mjs';

// These providers serve DoH at https://<IP>/dns-query with valid IP certificates.
const DNS_SERVERS = new Set(['223.5.5.5', '1.1.1.1', '8.8.8.8']);

export function customizeTemplate(template, {dnsTemplate = null, systemProxy = false, listenPort = 2080,
  directDns = null, proxyDns = null, ipv6 = false, lanBypass = true} = {}) {
  requireValue(object(template) && Array.isArray(template.inbounds), 'template');
  const config = clone(template);
  requireValue(typeof ipv6 === 'boolean' && typeof lanBypass === 'boolean', 'template');
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
    requireValue(DNS_SERVERS.has(value), 'template');
    const server = config.dns?.servers.find(server => server.tag === tag);
    requireValue(server && server.type === 'https', 'template');
    server.server = value;
    if (tag === 'direct-dns') {
      const bootstrap = config.dns.servers.find(server => server.tag === 'direct-dns-bootstrap');
      requireValue(bootstrap && bootstrap.type === 'udp', 'template');
      bootstrap.server = value;
    }
  }
  if (ipv6) {
    config.dns.strategy = 'prefer_ipv4';
    for (const rule of config.dns.rules) {
      if (rule.action === 'predefined' && Array.isArray(rule.query_type)) {
        rule.query_type = rule.query_type.filter(type => type !== 'AAAA');
      }
      if (rule.server === 'fakeip' && Array.isArray(rule.query_type) && !rule.query_type.includes('AAAA')) {
        rule.query_type.push('AAAA');
      }
    }
    config.dns.rules = config.dns.rules.filter(rule => !Array.isArray(rule.query_type) || rule.query_type.length);
    for (const server of config.dns.servers) {
      if (server.type === 'fakeip') server.inet6_range = 'fc00::/18';
    }
    config.route.rules = config.route.rules.filter(rule => !(rule.ip_version === 6 && rule.action === 'reject'));
    for (const rule of config.route.rules) {
      if (rule.action === 'resolve') rule.strategy = 'prefer_ipv4';
    }
    for (const inbound of config.inbounds) {
      if (inbound.type !== 'tun') continue;
      requireValue(Array.isArray(inbound.address), 'template');
      if (!inbound.address.some(address => address.includes(':'))) inbound.address.push('fdfe:dcba:9876::1/126');
      // Keep ULA in TUN: splitting it around virtual DNS and FakeIP produces
      // excessive OS routes. Existing private-IP rules still route real LAN IPs directly.
      if (inbound.route_exclude_address) {
        inbound.route_exclude_address = inbound.route_exclude_address.filter(address => !/^f[cd]/i.test(address));
      }
    }
  }
  if (!lanBypass) {
    for (const inbound of config.inbounds) delete inbound.route_exclude_address;
  }
  return config;
}
