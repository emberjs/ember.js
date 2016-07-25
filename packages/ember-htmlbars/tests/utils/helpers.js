import { setupApplicationRegistry, setupEngineRegistry } from 'ember-htmlbars/setup-registry';
import { default as _buildOwner } from 'container/tests/test-helpers/build-owner';
import Environment from './environment';

export {
  compile,
  precompile
} from 'ember-htmlbars-template-compiler/tests/utils/helpers';
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
export { default as makeBoundHelper } from 'ember-htmlbars/make-bound-helper';
export { htmlSafe, SafeString } from 'ember-htmlbars/utils/string';

export function buildOwner(options) {
  let owner = _buildOwner(options);
  setupEngineRegistry(owner.__registry__);
  setupApplicationRegistry(owner.__registry__);
  owner.register('service:-htmlbars-environment', new Environment(), { instantiate: false });
  owner.inject('service:-htmlbars-environment', 'dom', 'service:-dom-helper');

  owner.register('-view-registry:main', { create() { return {}; } });
  owner.inject('renderer', '_viewRegistry', '-view-registry:main');
  owner.inject('renderer', 'dom', 'service:-dom-helper');
  owner.inject('component', 'renderer', 'renderer:-dom');

  return owner;
}
