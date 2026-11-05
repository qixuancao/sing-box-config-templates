import {ConfigError, fail, requireValue} from '../errors.mjs';
import {object, plain, UUID} from '../values.mjs';
import {base64, checkedURL, decode, host, parameters, port, tls, transport} from './common.mjs';

const VMESS_CIPHERS = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'];

export function parseV2Ray(url, node) {
  const params = parameters(url, ['security', 'sni', 'peer', 'alpn', 'fp', 'insecure', 'allowInsecure', 'type', 'headerType', 'host', 'path', 'serviceName', 'mode', 'ed', 'encryption', 'flow', 'pbk', 'sid', 'packetEncoding']);
  requireValue(!url.password, 'credentials');
  if (node.type === 'vless') {
    node.uuid = decode(url.username); requireValue(UUID.test(node.uuid), 'uuid');
    requireValue(params.encryption === undefined || params.encryption === 'none', 'parameters');
    if (params.flow) { requireValue(params.flow === 'xtls-rprx-vision', 'flow'); node.flow = params.flow; }
    if (params.packetEncoding) { requireValue(['xudp', 'packetaddr'].includes(params.packetEncoding), 'parameters'); node.packet_encoding = params.packetEncoding; }
  } else if (node.type === 'vmess') {
    node.uuid = decode(url.username); requireValue(UUID.test(node.uuid), 'uuid');
    const cipher = params.encryption || 'auto';
    requireValue(VMESS_CIPHERS.includes(cipher), 'method');
    node.security = cipher;
    requireValue(params.flow === undefined, 'flow');
    if (params.packetEncoding) { requireValue(['xudp', 'packetaddr'].includes(params.packetEncoding), 'parameters'); node.packet_encoding = params.packetEncoding; }
  } else {
    node.password = decode(url.username); requireValue(plain(node.password), 'credentials');
    requireValue(params.flow === undefined && params.encryption === undefined && params.packetEncoding === undefined, 'parameters');
  }
  const security = params.security || (node.type === 'trojan' ? 'tls' : 'none');
  if (node.type === 'trojan') requireValue(security === 'tls', 'security');
  if (security === 'none') requireValue(!['sni', 'peer', 'alpn', 'fp', 'insecure', 'allowInsecure', 'pbk', 'sid'].some(k => params[k] !== undefined), 'security');
  node.tls = tls(url, params, security); node.transport = transport(params);
  if (node.flow) requireValue(!node.transport && node.tls?.enabled, 'flow');
  if (node.tls === undefined) delete node.tls;
  if (node.transport === undefined) delete node.transport;
  return node;
}

export function parseVMess(text) {
  const rest = text.slice(8);
  if (rest.includes('@')) {
    const url = checkedURL(text);
    return parseV2Ray(url, {type: 'vmess', tag: decode(url.hash.slice(1)), server: host(url), server_port: port(url)});
  }
  const hashIndex = rest.indexOf('#');
  const encoded = hashIndex >= 0 ? rest.slice(0, hashIndex) : rest;
  const hash = hashIndex >= 0 ? rest.slice(hashIndex + 1) : '';
  requireValue(encoded.length > 0 && !encoded.includes('?') && !hash.includes('#'), 'link');
  let item;
  try { item = JSON.parse(base64(encoded)); } catch (error) {
    if (error instanceof ConfigError) throw error;
    fail('link');
  }
  requireValue(object(item), 'link');
  const allowedKeys = new Set(['v', 'ps', 'add', 'port', 'id', 'aid', 'scy', 'security', 'net', 'type', 'host', 'path', 'tls', 'sni', 'alpn', 'fp', 'insecure', 'allowInsecure']);
  requireValue(Object.keys(item).every(key => allowedKeys.has(key)), 'parameters');
  requireValue(item.v === undefined || String(item.v) === '2', 'parameters');
  const server = typeof item.add === 'string' ? item.add.trim().replace(/^\[|\]$/g, '') : '';
  requireValue(plain(server) && !/[\s/@?#\\]/u.test(server), 'server');
  const serverPort = Number(item.port);
  requireValue((typeof item.port === 'number' || typeof item.port === 'string' && /^\d+$/.test(item.port.trim())) &&
    Number.isInteger(serverPort) && serverPort >= 1 && serverPort <= 65535, 'port');
  const uuid = typeof item.id === 'string' ? item.id.trim() : '';
  requireValue(UUID.test(uuid), 'uuid');
  const aid = item.aid === undefined || item.aid === '' ? 0 : Number(item.aid);
  requireValue((typeof item.aid === 'number' || typeof item.aid === 'string' || item.aid === undefined) &&
    Number.isInteger(aid) && aid >= 0 && aid <= 64, 'parameters');
  requireValue(!(item.scy && item.security && item.scy !== item.security), 'method');
  const cipher = item.scy || item.security || 'auto';
  requireValue(VMESS_CIPHERS.includes(cipher), 'method');
  const tag = hash ? decode(hash) : (typeof item.ps === 'string' ? item.ps.trim() : '');
  const node = {type: 'vmess', tag, server, server_port: serverPort, uuid, security: cipher};
  if (aid > 0) node.alter_id = aid;
  const tlsMode = !item.tls || item.tls === 'none' ? 'none' : item.tls;
  const str = value => value === undefined || value === '' ? undefined : String(value);
  requireValue([item.sni, item.alpn, item.fp, item.host, item.path, item.net, item.type].every(v => v === undefined || typeof v === 'string'), 'parameters');
  const params = Object.create(null);
  if (str(item.sni)) params.sni = str(item.sni);
  if (str(item.alpn)) params.alpn = str(item.alpn);
  if (str(item.fp)) params.fp = str(item.fp);
  if (item.insecure !== undefined && item.insecure !== '') params.insecure = String(item.insecure);
  if (item.allowInsecure !== undefined && item.allowInsecure !== '') params.allowInsecure = String(item.allowInsecure);
  if (tlsMode === 'none') {
    requireValue(!['sni', 'alpn', 'fp', 'insecure', 'allowInsecure'].some(k => params[k] !== undefined), 'security');
  }
  const tlsConfig = tls({hostname: server}, params, tlsMode);
  const net = !item.net ? 'tcp' : item.net;
  const transportParams = Object.create(null);
  transportParams.type = net;
  if (str(item.type)) transportParams.headerType = str(item.type);
  if (str(item.host)) transportParams.host = str(item.host);
  if (str(item.path)) {
    if (net === 'grpc') transportParams.serviceName = str(item.path);
    else transportParams.path = str(item.path);
  }
  const transportConfig = transport(transportParams);
  if (tlsConfig !== undefined) node.tls = tlsConfig;
  if (transportConfig !== undefined) node.transport = transportConfig;
  return node;
}

export function parseSocks(text) {
  const url = checkedURL(text);
  requireValue(url.port, 'port');
  parameters(url, []);
  const node = {type: 'socks', tag: decode(url.hash.slice(1)), server: host(url), server_port: port(url), version: '5'};
  if (url.username || url.password) {
    let username = decode(url.username), password = decode(url.password);
    if (!url.password && !username.includes(':')) {
      const decoded = base64(username);
      const colon = decoded.indexOf(':');
      requireValue(colon > 0 && colon < decoded.length - 1, 'credentials');
      username = decoded.slice(0, colon);
      password = decoded.slice(colon + 1);
    } else if (!url.password) {
      const colon = username.indexOf(':');
      password = username.slice(colon + 1);
      username = username.slice(0, colon);
    }
    requireValue(plain(username) && plain(password), 'credentials');
    node.username = username;
    node.password = password;
  }
  return node;
}
