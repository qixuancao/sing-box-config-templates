// Public, dependency-free API shared by browsers and Node.js.
export {PLATFORMS, CORES, profilePath} from './core/catalog.mjs';
export {ConfigError, errorMessage} from './core/errors.mjs';
export {parseNodes, validateNodes} from './core/nodes.mjs';
export {renderConfig} from './core/render.mjs';
export {customizeTemplate} from './core/customize.mjs';
