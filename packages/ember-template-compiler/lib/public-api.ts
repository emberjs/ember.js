export { default as _Ember } from 'ember';

import VERSION from 'ember/version';
import * as _GlimmerSyntax from '@glimmer/ember/syntax';

export { default as precompile } from './system/precompile';
export { default as compile } from './system/compile';
export {
  default as compileOptions,
  buildCompileOptions as _buildCompileOptions,
  transformsFor as _transformsFor,
} from './system/compile-options';
export {
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_TRANSFORMS,
} from '@ember/template-compiler/-internal-primitives';
export type { EmberPrecompileOptions } from './types';

export { preprocess as _preprocess, print as _print } from '@glimmer/ember/syntax';
export { precompile as _precompile } from '@glimmer/ember/compiler';

export { _GlimmerSyntax, VERSION };
