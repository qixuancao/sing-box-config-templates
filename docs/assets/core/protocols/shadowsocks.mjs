import {requireValue} from '../errors.mjs';
import {base64, checkedURL, decode, host, port, parameters} from './common.mjs';

export function parseShadowsocks(text) {
  // SIP002 userinfo and the older whole-authority Base64 form.
  let url, credential;
  const body = text.slice(5).split('#')[0].split('?')[0];
  if (!body.includes('@')) {
    const authority = base64(body);
    const separator = authority.lastIndexOf('@');
    requireValue(separator > 0, 'credentials');
    // Legacy credentials are already plaintext, not percent-encoded URL data.
    credential = authority.slice(0, separator);
    const address = authority.slice(separator + 1);
    requireValue(!/[/?#]/u.test(address), 'link');
    const tail = text.slice(5 + body.length);
    url = checkedURL(`ss://${address}${tail}`);
  } else {
    url = checkedURL(text);
    credential = decode(url.username);
    if (url.password) credential += `:${decode(url.password)}`;
    else credential = base64(credential);
  }
  requireValue(url.port, 'port');
  parameters(url, []); // Plugins need native JSON; never silently discard one.
  const colon = credential.indexOf(':');
  requireValue(colon > 0 && colon < credential.length - 1, 'credentials');
  const method = credential.slice(0, colon);
  requireValue(['aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'chacha20-ietf-poly1305', 'xchacha20-ietf-poly1305', '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305'].includes(method), 'method');
  return {type: 'shadowsocks', tag: decode(url.hash.slice(1)), server: host(url), server_port: port(url), method, password: credential.slice(colon + 1)};
}
