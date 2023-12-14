declare module 'ember-template-compiler/minimal' {
  export { default as precompile } from 'ember-template-compiler/lib/system/precompile';
  export { buildCompileOptions as _buildCompileOptions } from 'ember-template-compiler/lib/system/compile-options';
  export { preprocess as _preprocess, print as _print } from '@glimmer/syntax';
}
