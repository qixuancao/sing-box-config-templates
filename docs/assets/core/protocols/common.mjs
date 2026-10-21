import {requireValue, fail} from '../errors.mjs';
import {plain} from '../values.mjs';

export function decode(value) {
  try { return decodeURIComponent(value); } catch { fail('encoding'); }
}
export function base64(value) {
  requireValue(/^[A-Za-z0-9+/_-]*={0,2}$/.test(value) && value.length % 4 !== 1, 'encoding');
  try {
    const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(raw, c => c.charCodeAt(0)));
  } catch { fail('encoding'); }
}
export function checkedURL(text) {
  requireValue(!/[\s\\\u0000-\u001f\u007f]/u.test(text) && !/%(?![0-9a-f]{2})/i.test(text), 'link');
  let url;
  try { url = new URL(text); } catch { fail('link'); }
  requireValue(url.hostname && (!url.pathname || url.pathname === '/'), 'link');
  return url;
}
export function parameters(url, allowed) {
  const result = Object.create(null);
  for (const [key, value] of url.searchParams) {
    requireValue(allowed.includes(key) && !Object.hasOwn(result, key), 'parameters');
    result[key] = value;
  }
  return result;
}
export function host(url) { return url.hostname.replace(/^\[|\]$/g, ''); }
export function port(url) {
  const value = url.port ? Number(url.port) : 443;
  requireValue(Number.isInteger(value) && value >= 1 && value <= 65535, 'port');
  return value;
}
export function boolean(value) {
  requireValue(['0', '1', 'true', 'false'].includes(value), 'parameters');
  return value === '1' || value === 'true';
}

export function tls(url, params, security = 'tls') {
  if (security === 'none') return undefined;
  requireValue(['tls', 'reality'].includes(security), 'security');
  requireValue(!(params.sni && params.peer && params.sni !== params.peer), 'parameters');
  const result = {enabled: true, server_name: params.sni || params.peer || host(url), insecure: false};
  if (params.insecure !== undefined || params.allowInsecure !== undefined) {
    requireValue(!(params.insecure !== undefined && params.allowInsecure !== undefined), 'parameters');
    result.insecure = boolean(params.insecure ?? params.allowInsecure);
  }
  if (params.alpn) {
    result.alpn = params.alpn.split(',');
    requireValue(result.alpn.every(plain), 'parameters');
  }
  if (params.fp) result.utls = {enabled: true, fingerprint: params.fp};
  if (security === 'reality') {
    requireValue(params.pbk && /^[A-Za-z0-9_-]{43}=?$/.test(params.pbk), 'reality');
    requireValue(params.sid === undefined || /^(?:[0-9a-f]{2}){0,8}$/i.test(params.sid), 'reality');
    requireValue(!result.insecure, 'reality');
    result.utls = {enabled: true, fingerprint: params.fp || 'chrome'};
    result.reality = {enabled: true, public_key: params.pbk, short_id: params.sid || ''};
  } else requireValue(params.pbk === undefined && params.sid === undefined, 'reality');
  return result;
}
export function transport(params) {
  const type = params.type || 'tcp';
  requireValue(params.headerType === undefined || params.headerType === 'none', 'transport');
  if (type === 'tcp') {
    requireValue(params.path === undefined && params.host === undefined && params.serviceName === undefined && params.mode === undefined, 'transport');
    return undefined;
  }
  requireValue(['ws', 'grpc', 'httpupgrade'].includes(type), 'transport');
  if (type === 'grpc') {
    requireValue(params.path === undefined && params.host === undefined && (params.mode === undefined || params.mode === 'gun'), 'transport');
    return {type: 'grpc', service_name: params.serviceName || ''};
  }
  requireValue(params.serviceName === undefined && params.mode === undefined, 'transport');
  const result = {type, path: params.path || '/'};
  if (params.host) {
    if (type === 'ws') result.headers = {Host: params.host};
    else result.host = params.host;
  }
  return result;
}
