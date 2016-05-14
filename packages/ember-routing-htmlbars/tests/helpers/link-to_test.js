import 'ember-routing-htmlbars';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { set } from 'ember-metal/property_set';
import Controller from 'ember-runtime/controllers/controller';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberObject from 'ember-runtime/system/object';
import ComponentLookup from 'ember-views/component_lookup';
import LinkComponent from 'ember-htmlbars/components/link-to';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

QUnit.module('ember-routing-htmlbars: link-to helper', {
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
    runDestroy(view);
    runDestroy(owner);
  }
});

import { test } from 'ember-glimmer/tests/utils/skip-if-glimmer';

test('should be able to be inserted in DOM when the router is not present', function() {
  var template = '{{#link-to \'index\'}}Go to Index{{/link-to}}';
  view = EmberView.create({
    [OWNER]: owner,
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'Go to Index');
});

test('re-renders when title changes', function() {
  var template = '{{link-to title routeName}}';
  view = EmberView.create({
    [OWNER]: owner,
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'foo');

  run(function() {
    set(view, 'controller.title', 'bar');
  });

  equal(view.$().text(), 'bar');
});

test('can read bound title', function() {
  var template = '{{link-to title routeName}}';
  view = EmberView.create({
    [OWNER]: owner,
    controller: {
      title: 'foo',
      routeName: 'index'
    },
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'foo');
});

test('escaped inline form (double curlies) escapes link title', function() {
  view = EmberView.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    template: compile('{{link-to view.title "index"}}')
  });

  runAppend(view);

  equal(view.$('b').length, 0, 'no <b> were found');
});

test('escaped inline form with (-html-safe) does not escape link title', function() {
  view = EmberView.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    template: compile('{{link-to (-html-safe view.title) "index"}}')
  });

  runAppend(view);

  equal(view.$('b').length, 1, '<b> was found');
});

test('unescaped inline form (triple curlies) does not escape link title', function() {
  view = EmberView.create({
    [OWNER]: owner,
    title: '<b>blah</b>',
    template: compile('{{{link-to view.title "index"}}}')
  });

  runAppend(view);

  equal(view.$('b').length, 1, '<b> was found');
});

test('unwraps controllers', function() {
  var template = '{{#link-to \'index\' view.otherController}}Text{{/link-to}}';

  view = EmberView.create({
    [OWNER]: owner,
    otherController: Controller.create({
      model: 'foo'
    }),
    template: compile(template)
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./);

  equal(view.$().text(), 'Text');
});

test('able to safely extend the built-in component and use the normal path', function() {
  view = EmberView.create({
    [OWNER]: owner,
    title: 'my custom link-to component',
    template: compile('{{#custom-link-to \'index\'}}{{view.title}}{{/custom-link-to}}')
  });

  runAppend(view);

  equal(view.$().text(), 'my custom link-to component', 'rendered a custom-link-to component');
});

test('[GH#13432] able to safely extend the built-in component and invoke it inline', function() {
  view = EmberView.create({
    [OWNER]: owner,
    title: 'my custom link-to component',
    template: compile('{{custom-link-to view.title \'index\'}}')
  });

  runAppend(view);

  equal(view.$().text(), 'my custom link-to component', 'rendered a custom-link-to component');
});

