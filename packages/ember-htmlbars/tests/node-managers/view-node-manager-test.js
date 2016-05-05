import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-htmlbars: node-managers - ViewNodeManager');

test('create method should assert if component hasn\'t been found', assert => {
  assert.expect(1);

  let found = {
    component: null,
    layout: null
  };

  let path;

  expectAssertion(() => {
    ViewNodeManager.create(null, null, null, found, null, path);
  }, 'HTMLBars error: Could not find component named "' + path + '" (no component or template with that name was found)');
});

test('create method shouldn\'t assert if `found.component` is truthy', assert => {
  assert.expect(1);

  let found = {
    component: {},
    layout: null
  };
  let attrs = {};
  let renderNode = {};

  let env = {
    renderer: {
      componentUpdateAttrs() {
        assert.ok('env.renderer.componentUpdateAttrs called');
      }
    }
  };

  ViewNodeManager.create(renderNode, env, attrs, found);
});

test('create method shouldn\'t assert if `found.layout` is truthy', assert => {
  assert.expect(0);

  let found = {
    component: null,
    layout: true
  };

  ViewNodeManager.create(null, null, null, found);
});

test('create method shouldn\'t assert if `path` is falsy and `contentTemplate` is truthy', assert => {
  assert.expect(0);

  let found = {
    component: null,
    layout: null
  };
  let path = null;
  let contentTemplate = true;

  ViewNodeManager.create(null, null, null, found, null, path, null, contentTemplate);
});
