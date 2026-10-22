import {ConfigError, requireValue, fail} from './errors.mjs';

export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MAX_JSON_DEPTH = 100;
export function clone(value) {
  const depths = new WeakMap();
  try {
    return JSON.parse(JSON.stringify(value, function (key, item) {
      if (item !== null && typeof item === 'object') {
        // The replacer runs before descending, so reject deep input before V8's stack limit.
        const depth = (depths.get(this) || 0) + 1;
        requireValue(depth <= MAX_JSON_DEPTH, 'too-deep');
        depths.set(item, depth);
      }
      return item;
    }));
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    fail('json');
  }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function plain(value) { return typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value); }
