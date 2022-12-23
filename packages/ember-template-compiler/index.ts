import { ENV } from '@ember/-internals/environment';
import { FEATURES } from '@ember/canary-features';
import * as _GlimmerSyntax from '@glimmer/syntax';
import VERSION from 'ember/version';
import require from 'require';

export let _Ember: unknown;

try {
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
  buildCompileOptions as _buildCompileOptions,
  transformsFor as _transformsFor,
} from './lib/system/compile-options';
export { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from './lib/plugins';
export { EmberPrecompileOptions } from './lib/types';

export { preprocess as _preprocess, print as _print } from '@glimmer/syntax';
export { precompile as _precompile } from '@glimmer/compiler';

export { _GlimmerSyntax, VERSION };

// used to bootstrap templates
import './lib/system/bootstrap';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './lib/system/initializer';
