import run from 'ember-metal/run_loop';
import { compile, Component } from '../utils/helpers';
import { set } from 'ember-metal/property_set';
import Controller from 'ember-runtime/controllers/controller';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberObject from 'ember-runtime/system/object';
import ComponentLookup from 'ember-views/component_lookup';
import LinkComponent from 'ember-htmlbars/components/link-to';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

let owner, component;

QUnit.module('ember-htmlbars: link-to helper', {
  setup() {
    owner = buildOwner();

    // These tests don't rely on the routing service, but LinkComponent makes
    // some assumptions that it will exist. This small stub service ensures
    // that the LinkComponent can render without raising an exception.
    //
    // TODO: Add tests that test actual behavior. Currently, all behavior
    // is tested integration-style in the `ember` package.
    owner.register('service:-routing', EmberObject.extend({
      availableRoutes() { return ['index']; },
      hasRoute(name) { return name === 'index'; },
      isActiveForRoute() { return true; },
      generateURL() { return '/'; }
    }));

    owner.register('component-lookup:main', ComponentLookup);
    owner.register('component:link-to', LinkComponent);
    owner.register('component:custom-link-to', LinkComponent.extend());
  },

  teardown() {
    runDestroy(component);
    runDestroy(owner);
  }
});

QUnit.test('should be able to be inserted in DOM when the router is not present', function() {
  let template = '{{#link-to \'index\'}}Go to Index{{/link-to}}';
  component = Component.create({
    [OWNER]: owner,
    layout: compile(template)
  });

  runAppend(component);

  equal(component.$().text(), 'Go to Index');
});

QUnit.test('re-renders when title changes', function() {
  let template = '{{link-to title routeName}}';

  component = Component.create({
    [OWNER]: owner,
    title: 'foo',
    routeName: 'index',
    layout: compile(template)
  });

  runAppend(component);

  equal(component.$().text(), 'foo');

  run(() => set(component, 'title', 'bar'));

  equal(component.$().text(), 'bar');
});

QUnit.test('can read bound title', function() {
  let template = '{{link-to title routeName}}';
  component = Component.create({
    [OWNER]: owner,
    title: 'foo',
    routeName: 'index',
    layout: compile(template)
  });

  runAppend(component);

  equal(component.$().text(), 'foo');
});

QUnit.test('escaped inline form (double curlies) escapes link title', function() {
  component = Component.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    layout: compile('{{link-to title "index"}}')
  });

  runAppend(component);

  equal(component.$('b').length, 0, 'no <b> were found');
});

QUnit.test('escaped inline form with (-html-safe) does not escape link title', function() {
  component = Component.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    layout: compile('{{link-to (-html-safe title) "index"}}')
  });

  runAppend(component);

  equal(component.$('b').length, 1, '<b> was found');
});

QUnit.test('unescaped inline form (triple curlies) does not escape link title', function() {
  component = Component.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    layout: compile('{{{link-to title "index"}}}')
  });

  runAppend(component);

  equal(component.$('b').length, 1, '<b> was found');
});

QUnit.test('unwraps controllers', function() {
  let template = '{{#link-to \'index\' otherController}}Text{{/link-to}}';

  component = Component.create({
    [OWNER]: owner,
    otherController: Controller.create({
      model: 'foo'
    }),
    layout: compile(template)
  });

  expectDeprecation(() => {
    runAppend(component);
  }, /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./);

  equal(component.$().text(), 'Text');
});

QUnit.test('able to safely extend the built-in component and use the normal path', function() {
  component = Component.create({
    [OWNER]: owner,
    title: 'my custom link-to component',
    layout: compile('{{#custom-link-to \'index\'}}{{title}}{{/custom-link-to}}')
  });

  runAppend(component);

  equal(component.$().text(), 'my custom link-to component', 'rendered a custom-link-to component');
});

QUnit.test('[GH#13432] able to safely extend the built-in component and invoke it inline', function() {
  component = Component.create({
    [OWNER]: owner,
    title: 'my custom link-to component',
    layout: compile('{{custom-link-to title \'index\'}}')
  });

  runAppend(component);

  equal(component.$().text(), 'my custom link-to component', 'rendered a custom-link-to component');
});
