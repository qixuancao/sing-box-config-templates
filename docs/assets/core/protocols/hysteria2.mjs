import {requireValue} from '../errors.mjs';
import {plain, UUID} from '../values.mjs';
import {boolean, decode, parameters, tls} from './common.mjs';

function parsePortRanges(spec) {
  requireValue(typeof spec === 'string' && spec.length > 0, 'port');
  return spec.split(',').map(part => {
    const match = part.trim().match(/^(\d+)(?:[-:](\d+))?$/);
    requireValue(match, 'port');
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    requireValue(Number.isInteger(start) && Number.isInteger(end) && start >= 1 && start <= end && end <= 65535, 'port');
    return `${start}:${end}`;
  });
}

function positiveMbps(value) {
  const num = Number(value);
  requireValue(/^[1-9]\d*$/.test(value) && Number.isInteger(num) && num <= 100000, 'parameters');
  return num;
}

export function parseHysteria2(url, node) {
  const params = parameters(url, ['sni', 'peer', 'alpn', 'insecure', 'allowInsecure', 'obfs', 'obfs-password', 'mport', 'ports', 'upmbps', 'downmbps', 'pinSHA256']);
  requireValue(params.pinSHA256 === undefined, 'parameters');
  requireValue(!(params.mport !== undefined && params.ports !== undefined), 'parameters');
  node.password = decode(url.username) + (url.password ? `:${decode(url.password)}` : '');
  requireValue(plain(node.password), 'credentials');
  node.tls = tls(url, params);
  if (params.obfs && params.obfs !== 'none') {
    requireValue(params.obfs === 'salamander' && plain(params['obfs-password']), 'obfs');
    node.obfs = {type: 'salamander', password: params['obfs-password']};
  } else requireValue(params['obfs-password'] === undefined, 'obfs');
  const mport = params.mport ?? params.ports;
  if (mport !== undefined) node.server_ports = parsePortRanges(mport);
  if (params.upmbps !== undefined) node.up_mbps = positiveMbps(params.upmbps);
  if (params.downmbps !== undefined) node.down_mbps = positiveMbps(params.downmbps);

  return node;
}

export function parseTuic(url, node) {
  const params = parameters(url, ['sni', 'peer', 'alpn', 'insecure', 'allowInsecure', 'congestion_control', 'udp_relay_mode', 'zero_rtt_handshake', 'reduce_rtt']);
  let uuid = decode(url.username), password = decode(url.password);
  if (!url.password && uuid.includes(':')) {
    const colon = uuid.indexOf(':');
    password = uuid.slice(colon + 1);
    uuid = uuid.slice(0, colon);
  }
  requireValue(UUID.test(uuid), 'uuid');
  requireValue(plain(password), 'credentials');
  node.uuid = uuid;
  node.password = password;
  node.tls = tls(url, params);
  if (params.congestion_control !== undefined) {
    requireValue(['cubic', 'new_reno', 'bbr'].includes(params.congestion_control), 'parameters');
    node.congestion_control = params.congestion_control;
  }
  if (params.udp_relay_mode !== undefined) {
    requireValue(['native', 'quic'].includes(params.udp_relay_mode), 'parameters');
    node.udp_relay_mode = params.udp_relay_mode;
  }
  if (params.zero_rtt_handshake !== undefined || params.reduce_rtt !== undefined) {
    requireValue(!(params.zero_rtt_handshake !== undefined && params.reduce_rtt !== undefined), 'parameters');
    node.zero_rtt_handshake = boolean(params.zero_rtt_handshake ?? params.reduce_rtt);
  }
  return node;
}

export function parseAnyTLS(url, node) {
  const params = parameters(url, ['sni', 'peer', 'alpn', 'fp', 'insecure', 'allowInsecure']);
  node.password = decode(url.username) + (url.password ? `:${decode(url.password)}` : '');
  requireValue(plain(node.password), 'credentials');
  node.tls = tls(url, params);
  return node;
}
