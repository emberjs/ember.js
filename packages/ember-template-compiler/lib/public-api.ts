export * as _GlimmerSyntax from '@glimmer/syntax';
export { default as VERSION } from 'ember/version';

export { default as precompile } from './system/precompile';
export { default as compile } from './system/compile';
export {
  default as compileOptions,
  buildCompileOptions as _buildCompileOptions,
  transformsFor as _transformsFor,
} from './system/compile-options';
export { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from './plugins';
export { type EmberPrecompileOptions } from './types';

export { preprocess as _preprocess, print as _print } from '@glimmer/syntax';
export { precompile as _precompile } from '@glimmer/compiler';
