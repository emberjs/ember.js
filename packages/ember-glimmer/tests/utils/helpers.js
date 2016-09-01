import dictionary from 'ember-metal/dictionary';
import {
  setupApplicationRegistry,
  setupEngineRegistry
} from 'ember-glimmer';
import { default as _buildOwner } from 'container/tests/test-helpers/build-owner';
import jQuery from 'ember-views/system/jquery';

export {
  compile,
  precompile
} from 'ember-glimmer-template-compiler/tests/utils/helpers';

export {
  INVOKE,
  Helper,
  helper,
  Component,
  TextArea,
  LinkComponent,
  TextField,
  InteractiveRender,
  InertRenderer,
  makeBoundHelper,
  htmlSafe,
  SafeString,
  DOMChanges,
  isHTMLSafe
} from 'ember-glimmer';

export function buildOwner(options) {
  let owner = _buildOwner(options);
  setupEngineRegistry(owner.__registry__);
  setupApplicationRegistry(owner.__registry__);

  owner.register('service:-document', document, { instantiate: false });
  owner.register('-environment:main', {
    isInteractive: true,
    hasDOM: true,
    options: { jQuery }
  }, { instantiate: false });
  owner.inject('view', '_environment', '-environment:main');
  owner.inject('component', '_environment', '-environment:main');
  owner.inject('service:-dom-helper', 'document', 'service:-document');
  owner.inject('view', 'renderer', 'renderer:-dom');
  owner.inject('component', 'renderer', 'renderer:-dom');
  owner.inject('template', 'env', 'service:-glimmer-environment');

  owner.register('-view-registry:main', { create() { return dictionary(null); } });
  owner.inject('renderer', '_viewRegistry', '-view-registry:main');

  return owner;
}
