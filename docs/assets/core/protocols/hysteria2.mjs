import {requireValue} from '../errors.mjs';
import {plain} from '../values.mjs';
import {decode, parameters, tls} from './common.mjs';

export function parseHysteria2(url, node) {
  const params = parameters(url, ['sni', 'insecure', 'obfs', 'obfs-password', 'pinSHA256']);
  requireValue(params.pinSHA256 === undefined, 'parameters');
  node.password = decode(url.username) + (url.password ? `:${decode(url.password)}` : '');
  requireValue(plain(node.password), 'credentials');
  node.tls = tls(url, params);
  if (params.obfs) {
    requireValue(params.obfs === 'salamander' && plain(params['obfs-password']), 'obfs');
    node.obfs = {type: 'salamander', password: params['obfs-password']};
  } else requireValue(params['obfs-password'] === undefined, 'obfs');

  return node;
}
