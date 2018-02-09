export { default as precompile } from './system/precompile';
export { default as compile } from './system/compile';
export {
  default as compileOptions,
  registerPlugin,
  unregisterPlugin
} from './system/compile-options';
export { default as defaultPlugins } from './plugins';

// used to bootstrap templates
import './system/bootstrap';
