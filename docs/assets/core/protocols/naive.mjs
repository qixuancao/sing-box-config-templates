import {requireValue} from '../errors.mjs';
import {plain} from '../values.mjs';
import {decode, parameters, tls} from './common.mjs';

export function parseNaive(url, node) {
  const params = parameters(url, ['sni', 'security', 'type', 'headerType']);
  requireValue((params.security === undefined || params.security === 'tls') && (params.type === undefined || params.type === 'tcp') && (params.headerType === undefined || params.headerType === 'none'), 'parameters');
  node.username = decode(url.username); node.password = decode(url.password);
  requireValue(plain(node.username) && plain(node.password), 'credentials');
  node.tls = tls(url, params);

  return node;
}
