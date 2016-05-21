import assign from 'ember-metal/assign';
import { defaultCompileOptions } from 'ember-template-compiler';
import { compile as compiler } from 'ember-glimmer-template-compiler';

export { default as Helper, helper } from 'ember-glimmer/helper';
export { default as Component } from 'ember-glimmer/component';
export { default as Checkbox } from 'ember-glimmer/components/checkbox';
export { default as TextArea } from 'ember-glimmer/components/text_area';
export { default as TextField } from 'ember-glimmer/components/text_field';
export { DOMHelper } from 'glimmer-runtime';
export { InteractiveRenderer, InertRenderer } from 'ember-glimmer/renderer';

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}
