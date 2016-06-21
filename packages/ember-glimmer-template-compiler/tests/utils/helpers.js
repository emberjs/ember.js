import {
  template,
  precompile as precompiler,
  compile as compiler,
  defaultCompileOptions
} from 'ember-glimmer-template-compiler';
import assign from 'ember-metal/assign';

export * from 'ember-glimmer-template-compiler';
export { removePlugin } from 'ember-glimmer-template-compiler/system/compile-options';
export const packageName = 'glimmer';
export const engineName = 'Glimmer';

export function precompile(string) {
  return template(precompiler(string));
}

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}
