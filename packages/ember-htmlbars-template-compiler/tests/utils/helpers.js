import { compile as compiler, defaultCompileOptions } from 'ember-htmlbars-template-compiler';
import assign from 'ember-metal/assign';

export * from 'ember-htmlbars-template-compiler';
export { removePlugin } from 'ember-htmlbars-template-compiler/system/compile-options';

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}
export const packageName = 'htmlbars';
export const engineName = 'HTMLBars';
