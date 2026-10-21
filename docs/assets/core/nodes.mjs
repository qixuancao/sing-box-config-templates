import {ConfigError, requireValue, fail} from './errors.mjs';
import {object, clone, UUID, plain} from './values.mjs';
import {parseLink} from './share-links.mjs';

const RESERVED = new Set(['select', 'auto', 'udp-auto', 'streaming', 'ai', 'telegram', 'microsoft', 'apple', 'google', 'github', 'direct', 'GLOBAL']);
const TCP_ONLY = new Set(['naive', 'http', 'ssh', 'shadowtls', 'tor']);
const UDP_TYPES = new Set(['shadowsocks', 'trojan', 'vless', 'vmess', 'hysteria2', 'hysteria', 'tuic', 'anytls']);
const TYPES = new Set([...TCP_ONLY, ...UDP_TYPES, 'socks']);
function inferredUDP(node) {
  if (node.network === 'tcp' || TCP_ONLY.has(node.type)) return false;
  if (node.type === 'socks') return node.version === '5' || node.version === undefined;
  return UDP_TYPES.has(node.type);
}

export function validateNodes(document) {
  requireValue(object(document) && Array.isArray(document.outbounds) && document.outbounds.length > 0, 'nodes');
  requireValue(document.outbounds.length <= 200, 'too-many');
  const nodes = clone(document); const tags = new Set();
  nodes.outbounds.forEach((node, index) => {
    try {
      requireValue(object(node) && TYPES.has(node.type), 'node-type');
      requireValue(plain(node.tag) && node.tag.trim().length > 0 && node.tag.length <= 100 && !RESERVED.has(node.tag) && !tags.has(node.tag), 'tag');
      requireValue(plain(node.server) && !/[\s/@?#\\]/u.test(node.server), 'server');
      requireValue(Number.isInteger(node.server_port) && node.server_port > 0 && node.server_port <= 65535, 'port');
      if (['naive', 'hysteria2', 'hysteria', 'trojan', 'shadowsocks', 'tuic', 'anytls'].includes(node.type)) requireValue(plain(node.password), 'credentials');
      if (node.type === 'naive') requireValue(plain(node.username), 'credentials');
      if (['vless', 'vmess', 'tuic'].includes(node.type)) requireValue(UUID.test(node.uuid), 'uuid');
      if (node.type === 'shadowsocks') requireValue(plain(node.method), 'method');
      if (['naive', 'hysteria2', 'trojan', 'tuic', 'anytls'].includes(node.type)) requireValue(node.tls?.enabled === true, 'security');
      if (node.tls?.server_name !== undefined) requireValue(plain(node.tls.server_name), 'server');
      requireValue(node.network === undefined || ['tcp', 'udp'].includes(node.network), 'network');
      tags.add(node.tag);
    } catch (error) { if (error instanceof ConfigError) error.position = index + 1; throw error; }
  });
  const udp = nodes.udp_outbounds === undefined ? nodes.outbounds.filter(inferredUDP).map(node => node.tag) : nodes.udp_outbounds;
  requireValue(Array.isArray(udp) && new Set(udp).size === udp.length && udp.every(tag => tags.has(tag)), 'udp');
  requireValue(!nodes.outbounds.some(node => udp.includes(node.tag) &&
    (TCP_ONLY.has(node.type) && !(node.type === 'naive' && (node.udp_over_tcp === true || object(node.udp_over_tcp) && node.udp_over_tcp.enabled !== false)) || node.network === 'tcp')), 'udp-tcp');
  return {outbounds: nodes.outbounds, udp_outbounds: [...udp]};
}
export function parseNodes(input) {
  requireValue(typeof input === 'string' && input.trim().length > 0, 'empty');
  requireValue(input.length <= 1024 * 1024 && new TextEncoder().encode(input).length <= 1024 * 1024, 'too-large');
  const text = input.trim();
  if (text.startsWith('{') || text.startsWith('[')) {
    let document;
    try { document = JSON.parse(text); } catch { fail('json'); }
    if (Array.isArray(document)) document = {outbounds: document};
    else if (object(document) && document.type && !document.outbounds) document = {outbounds: [document]};
    return validateNodes(document);
  }
  const outbounds = []; const tags = new Set();
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const node = parseLink(line.trim());
      const requested = node.tag || `${node.type}-${outbounds.length + 1}`;
      requireValue(plain(requested) && requested.trim().length > 0 && requested.length <= 90, 'tag');
      let tag = requested; let suffix = 2;
      while (tags.has(tag) || RESERVED.has(tag)) tag = `${requested}-${suffix++}`;
      tags.add(tag); node.tag = tag; outbounds.push(node);
    } catch (error) {
      if (error instanceof ConfigError) error.position = index + 1;
      else throw new ConfigError('link', index + 1);
      throw error;
    }
  });
  return validateNodes({outbounds});
}
