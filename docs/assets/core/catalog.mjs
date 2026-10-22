import {requireValue} from './errors.mjs';
import {PRESETS} from '../presets.mjs';
// Supported presets; independent of UI and node parsing.
export const PLATFORMS = Object.freeze(PRESETS.platforms);
export const CORES = Object.freeze(Object.keys(PRESETS.versions));

export function profilePath(platform, core = '1.14', scenario = '') {
  requireValue(Object.hasOwn(PLATFORMS, platform) && CORES.includes(core), 'profile');
  const selected = scenario || PLATFORMS[platform][0];
  requireValue(PLATFORMS[platform].includes(selected), 'profile');
  return `platforms/${platform}/${core}/${selected}.json`;
}
