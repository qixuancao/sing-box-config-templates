import {requireValue} from '../errors.mjs';
import {plain, UUID} from '../values.mjs';
import {decode, parameters, tls, transport} from './common.mjs';

export function parseV2Ray(url, node) {
  const params = parameters(url, ['security', 'sni', 'peer', 'alpn', 'fp', 'insecure', 'allowInsecure', 'type', 'headerType', 'host', 'path', 'serviceName', 'mode', 'encryption', 'flow', 'pbk', 'sid', 'packetEncoding']);
  requireValue(!url.password, 'credentials');
  if (node.type === 'vless') {
    node.uuid = decode(url.username); requireValue(UUID.test(node.uuid), 'uuid');
    requireValue(params.encryption === undefined || params.encryption === 'none', 'parameters');
    if (params.flow) { requireValue(params.flow === 'xtls-rprx-vision', 'flow'); node.flow = params.flow; }
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
