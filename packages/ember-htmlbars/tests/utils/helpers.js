import assign from 'ember-metal/assign';
import {
  compile as compiler,
  precompile as precompiler
} from 'ember-htmlbars-template-compiler';
import { defaultCompileOptions } from 'ember-htmlbars-template-compiler';
import { setupApplicationRegistry } from 'ember-htmlbars/setup-registry';
import { default as _buildOwner } from 'container/tests/test-helpers/build-owner';
import Environment from './environment';

export { template } from 'ember-htmlbars-template-compiler';
export { default as Helper, helper } from 'ember-htmlbars/helper';
export { INVOKE } from 'ember-htmlbars/keywords/closure-action';
export { default as DOMHelper } from 'ember-htmlbars/system/dom-helper';
export { default as Component } from 'ember-htmlbars/component';
export { default as Checkbox } from 'ember-htmlbars/components/checkbox';
export { default as TextArea } from 'ember-htmlbars/components/text_area';
export { default as TextField } from 'ember-htmlbars/components/text_field';
export { default as LinkTo } from 'ember-htmlbars/components/link-to';
export { InteractiveRenderer, InertRenderer } from 'ember-htmlbars/renderer';

export function buildOwner(options) {
  let owner = _buildOwner(options);
  setupApplicationRegistry(owner.__registry__);
  owner.register('service:-htmlbars-environment', new Environment(), { instantiate: false });
  owner.inject('service:-htmlbars-environment', 'dom', 'service:-dom-helper');
  return owner;
}

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}

export function precompile(string, options) {
  return precompiler(string, assign({}, defaultCompileOptions(), options));
}
