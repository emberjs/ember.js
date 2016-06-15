import assign from 'ember-metal/assign';
import {
  compile as compiler,
  precompile as precompiler
} from 'ember-htmlbars-template-compiler';
import { defaultCompileOptions } from 'ember-htmlbars-template-compiler';

export { template } from 'ember-htmlbars-template-compiler';
export { default as Helper, helper } from 'ember-htmlbars/helper';
export { INVOKE } from 'ember-htmlbars/keywords/closure-action';
export { default as DOMHelper } from 'ember-htmlbars/system/dom-helper';
export { default as Component } from 'ember-htmlbars/component';
export { default as Checkbox } from 'ember-htmlbars/components/checkbox';
export { default as TextArea } from 'ember-htmlbars/components/text_area';
export { default as TextField } from 'ember-htmlbars/components/text_field';
export { InteractiveRenderer, InertRenderer } from 'ember-htmlbars/renderer';

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}

export function precompile(string, options) {
  return precompiler(string, assign({}, defaultCompileOptions(), options));
}
