// The main entrypoint of ember-template-compiler is the fairly-crufty
// backward-compatible API. In contrast, this is the subset of that that's
// actually used by babel-plugin-ember-template-compilation.
//
// This module exists so that ember-source can build itself -- the
// ember-template-compiler.js bundle it an output of the build, but the build
// needs to compile templates. Unlike the full ./index.ts, this module can be
// directly evaluted in node because it doesn't try to pull in the whole kitchen
// sink.
export { default as precompile } from './lib/system/precompile';
export { buildCompileOptions as _buildCompileOptions } from './lib/system/compile-options';
export { preprocess as _preprocess, print as _print } from '@glimmer/syntax';
