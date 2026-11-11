// Customize a generated profile without mutating its preset or user nodes.
import {requireValue} from './errors.mjs';
import {object, clone} from './values.mjs';

// These providers serve DoH at https://<IP>/dns-query with valid IP certificates.
const DNS_SERVERS = new Set(['223.5.5.5', '1.12.12.12', '1.1.1.1', '8.8.8.8']);
const ADS_RULE_SET_URL = 'https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite/category-ads-all.srs';

// Shared address space used by Tailscale, EasyTier, NetBird and carrier-internal hosts.
const CGNAT = '100.64.0.0/10';
// Exact daemon names; their peer and relay traffic must not be tunnelled through a proxy.
const OVERLAY_PROCESSES = ['tailscaled', 'tailscaled.exe', 'zerotier-one', 'zerotier-one_x64.exe',
  'zerotier-one_x86.exe', 'easytier-core', 'easytier-core.exe', 'netbird', 'netbird.exe'];

function insertAfterGlobal(rules, item) {
  const index = rules.findIndex(rule => rule.clash_mode === 'Global');
  rules.splice(index >= 0 ? index + 1 : 0, 0, item);
}

function insertBeforeModes(rules, ...items) {
  const index = rules.findIndex(rule => rule.clash_mode === 'Direct');
  requireValue(index >= 0, 'template');
  rules.splice(index, 0, ...items);
}

const isCgnatRule = rule => Array.isArray(rule.ip_cidr) && rule.ip_cidr.length === 1 && rule.ip_cidr[0] === CGNAT;

export function customizeTemplate(template, {dnsTemplate = null, systemProxy = false, listenPort = 2080,
  directDns = null, proxyDns = null, ipv6 = false, lanBypass = true,
  adblock = false, ruleSetProxy = false, clashApiPort = null, blockQuic = false, overlay = false} = {}) {
  requireValue(object(template) && Array.isArray(template.inbounds), 'template');
  const config = clone(template);
  requireValue(typeof ipv6 === 'boolean' && typeof lanBypass === 'boolean' &&
    typeof adblock === 'boolean' && typeof ruleSetProxy === 'boolean' &&
    typeof blockQuic === 'boolean' && typeof overlay === 'boolean', 'template');
  if (dnsTemplate !== null) {
    requireValue(object(dnsTemplate) && object(dnsTemplate.dns) &&
      Array.isArray(dnsTemplate.dns.servers) && Array.isArray(dnsTemplate.dns.rules), 'template');
    config.dns = clone(dnsTemplate.dns);
    const fakeIP = config.dns.servers.some(server => server.type === 'fakeip');
    const isMixed = config.inbounds.some(inbound => inbound.type === 'mixed');
    requireValue(!fakeIP || !isMixed, 'fakeip-access');
    if (config.experimental?.cache_file) {
      if (fakeIP) config.experimental.cache_file.store_fakeip = true;
      else delete config.experimental.cache_file.store_fakeip;
    }
  }
  requireValue(Number.isInteger(listenPort) && listenPort >= 1 && listenPort <= 65535, 'port');
  const mixed = config.inbounds.find(inbound => inbound.type === 'mixed');
  if (mixed) {
    mixed.listen_port = listenPort;
    mixed.set_system_proxy = Boolean(systemProxy);
  } else {
    requireValue(!systemProxy && listenPort === 2080, 'listener-access');
  }
  for (const [tag, value] of [['direct-dns', directDns], ['proxy-dns', proxyDns]]) {
    if (value === null) continue;
    requireValue(DNS_SERVERS.has(value), 'dns-server');
    const server = config.dns?.servers.find(server => server.tag === tag);
    requireValue(server && server.type === 'https', 'template');
    server.server = value;
    if (tag === 'direct-dns') {
      const bootstrap = config.dns.servers.find(server => server.tag === 'direct-dns-bootstrap');
      requireValue(bootstrap && bootstrap.type === 'udp', 'template');
      bootstrap.server = value;
    }
  }
  if (overlay) {
    // Inside TUN the overlay must be excluded from the TUN routes; otherwise an
    // unbound socket would loop back into sing-box.
    requireValue(!config.inbounds.some(inbound => inbound.type === 'tun') ||
      (lanBypass && config.inbounds.some(inbound => inbound.route_exclude_address?.includes(CGNAT))), 'overlay-lan');
    requireValue(Array.isArray(config.outbounds) && Array.isArray(config.route?.rules) &&
      Array.isArray(config.dns?.servers) && Array.isArray(config.dns?.rules), 'template');
    requireValue(config.route.rules.some(isCgnatRule), 'template');
    // auto_detect_interface binds every dial to the default interface, so a plain
    // direct outbound cannot reach tailscale0 / zt* / docker interfaces. A bind
    // address disables that default bind and lets the OS routing table choose.
    const direct = config.outbounds.findIndex(outbound => outbound.tag === 'direct');
    config.outbounds.splice(direct + 1, 0, {type: 'direct', tag: 'overlay-direct', inet4_bind_address: '0.0.0.0'});
    config.dns.servers.push({type: 'udp', tag: 'tailscale-dns', server: '100.100.100.100', inet4_bind_address: '0.0.0.0'});
    const predefined = config.dns.rules.findIndex(rule => rule.action === 'predefined');
    config.dns.rules.splice(predefined + 1, 0, {domain_suffix: ['ts.net'], action: 'route', server: 'tailscale-dns'});
    for (const rule of config.route.rules) {
      if ((rule.ip_is_private === true || isCgnatRule(rule)) && rule.outbound === 'direct') rule.outbound = 'overlay-direct';
    }
    const first = config.route.rules.findIndex(rule => rule.ip_is_private === true);
    config.route.rules.splice(first, 0,
      {process_name: [...OVERLAY_PROCESSES], action: 'route', outbound: 'direct'},
      {domain_suffix: ['ts.net'], action: 'resolve', server: 'tailscale-dns', strategy: 'ipv4_only'});
  }
  if (blockQuic) {
    requireValue(Array.isArray(config.route?.rules), 'template');
    // After LAN/overlay rules, before modes: public QUIC fails fast and apps fall back to TCP.
    insertBeforeModes(config.route.rules, {network: 'udp', port: 443, action: 'reject', method: 'default', no_drop: true});
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
    if (object(config.route.default_domain_resolver)) {
      config.route.default_domain_resolver.strategy = 'prefer_ipv4';
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
  if (adblock) {
    requireValue(Array.isArray(config.route?.rule_set) && Array.isArray(config.route?.rules) && Array.isArray(config.dns?.rules), 'template');
    if (!config.route.rule_set.some(rule => rule.tag === 'category-ads-all')) {
      const sample = config.route.rule_set.find(rule => rule.type === 'remote');
      const entry = {type: 'remote', tag: 'category-ads-all', format: 'binary', url: ADS_RULE_SET_URL};
      if (sample?.http_client) entry.http_client = sample.http_client;
      else entry.download_detour = sample?.download_detour || 'direct';
      config.route.rule_set.push(entry);
    }
    if (!config.route.rules.some(rule => rule.rule_set === 'category-ads-all')) {
      insertAfterGlobal(config.route.rules, {rule_set: 'category-ads-all', action: 'reject'});
    }
    if (!config.dns.rules.some(rule => rule.rule_set === 'category-ads-all')) {
      insertAfterGlobal(config.dns.rules, {rule_set: 'category-ads-all', action: 'reject'});
    }
  }
  if (ruleSetProxy) {
    requireValue(Array.isArray(config.route?.rule_set), 'template');
    if (Array.isArray(config.http_clients)) {
      const client = config.http_clients.find(item => item.tag === 'rule-set-direct');
      requireValue(client, 'template');
      client.detour = 'select';
    }
    for (const rule of config.route.rule_set) {
      if (rule.type === 'remote' && rule.download_detour) rule.download_detour = 'select';
    }
  }
  if (clashApiPort !== null) {
    requireValue(Number.isInteger(clashApiPort) && clashApiPort >= 1 && clashApiPort <= 65535, 'port');
    requireValue(!mixed || clashApiPort !== listenPort, 'port');
    requireValue(object(config.experimental?.clash_api), 'template');
    config.experimental.clash_api.external_controller = `127.0.0.1:${clashApiPort}`;
  }
  return config;
}
