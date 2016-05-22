import { compile as compiler } from 'ember-htmlbars-template-compiler';
import assign from 'ember-metal/assign';
import { defaultCompileOptions } from 'ember-template-compiler';

export * from 'ember-htmlbars-template-compiler';
export { removePlugin } from 'ember-htmlbars-template-compiler/system/compile-options';

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}
export const packageName = 'htmlbars';
export const engineName = 'HTMLBars';
