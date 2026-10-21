import {requireValue} from './errors.mjs';
// Supported presets; independent of UI and node parsing.
export const PLATFORMS = Object.freeze({
  android: ['fakeip', 'realip', 'tcp-stable', 'privacy-strict', 'dual-stack', 'no-adblock', 'battery-saver', 'udp-first'],
  ios: ['fakeip', 'realip'], macos: ['fakeip', 'realip', 'mixed'],
  linux: ['mixed', 'tun'], windows: ['mixed', 'tun'],
});
export const CORES = Object.freeze(['1.14', '1.13']);

export function profilePath(platform, core = '1.14', scenario = '') {
  requireValue(Object.hasOwn(PLATFORMS, platform) && CORES.includes(core), 'profile');
  const selected = scenario || PLATFORMS[platform][0];
  requireValue(PLATFORMS[platform].includes(selected), 'profile');
  return `platforms/${platform}/${core}/${selected}.json`;
}
