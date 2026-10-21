export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const clone = value => JSON.parse(JSON.stringify(value));
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function plain(value) { return typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value); }
