import { ENV } from '@ember/-internals/environment';
import { FEATURES } from '@ember/canary-features';
import VERSION from 'ember/version';
import require from 'require';

declare global {
  interface NodeRequire {
    has(name: string): boolean;
  }

  function define(path: string, deps: string[], module: () => void): void;
}

export let _Ember: unknown;

try {
  // tslint:disable-next-line: no-require-imports
  _Ember = require('ember');
} catch (e) {
  _Ember = {
    ENV,
    FEATURES,
    VERSION,
  };
}

export { default as precompile } from './lib/system/precompile';
export { default as compile } from './lib/system/compile';
export {
  default as compileOptions,
  registerPlugin,
  unregisterPlugin,
} from './lib/system/compile-options';
export { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from './lib/plugins/index';
export { EmberPrecompileOptions } from './lib/types';

// used to bootstrap templates
import './lib/system/bootstrap';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './lib/system/initializer';
