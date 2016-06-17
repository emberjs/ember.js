import assign from 'ember-metal/assign';
import {
  compile as compiler,
  precompile as precompiler,
  defaultCompileOptions,
  template
} from 'ember-glimmer-template-compiler';
import { setupApplicationRegistry } from 'ember-glimmer/setup-registry';
import { default as _buildOwner } from 'container/tests/test-helpers/build-owner';

export { default as Helper, helper } from 'ember-glimmer/helper';
export { INVOKE } from 'ember-glimmer/helpers/action';
export { default as Component } from 'ember-glimmer/component';
export { default as Checkbox } from 'ember-glimmer/components/checkbox';
export { default as TextArea } from 'ember-glimmer/components/text_area';
export { default as TextField } from 'ember-glimmer/components/text_field';
export { default as LinkTo } from 'ember-glimmer/components/link-to';
export { DOMHelper } from 'glimmer-runtime';
export { InteractiveRenderer, InertRenderer } from 'ember-glimmer/renderer';

export function buildOwner(options) {
  let owner = _buildOwner(options);
  setupApplicationRegistry(owner.__registry__);
  owner.register('service:-document', document, { instantiate: false });
  owner.inject('service:-dom-helper', 'document', 'service:-document');
  owner.inject('component', 'renderer', 'renderer:-dom');
  owner.inject('template', 'env', 'service:-glimmer-environment');
  return owner;
}

export function precompile(string) {
  return template(precompiler(string));
}

export function compile(string, options) {
  return compiler(string, assign({}, defaultCompileOptions(), options));
}
