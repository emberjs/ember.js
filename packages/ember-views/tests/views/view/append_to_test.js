import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';

import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-htmlbars-template-compiler';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

let owner, View, view, otherView, willDestroyCalled;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('view', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

QUnit.module('EmberView - append() and appendTo()', {
  setup() {
    View = EmberView.extend({});
  },

  teardown() {
    runDestroy(view);
    runDestroy(otherView);
  }
});

QUnit.test('can call `appendTo` for multiple views #11109', function() {
  let elem;
  jQuery('#qunit-fixture').html('<div id="menu"></div><div id="other-menu"></div>');

  view = View.create();
  otherView = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');
  ok(!get(otherView, 'element'), 'precond - should not have an element');

  run(() => {
    view.appendTo('#menu');
    otherView.appendTo('#other-menu');
  });

  elem = jQuery('#menu').children();
  ok(elem.length > 0, 'creates and appends the first view\'s element');

  elem = jQuery('#other-menu').children();
  ok(elem.length > 0, 'creates and appends the second view\'s element');
});

QUnit.test('should be added to the specified element when calling appendTo()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(() => view.appendTo('#menu'));

  let viewElem = jQuery('#menu').children();
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

QUnit.test('should be added to the document body when calling append()', function() {
  view = View.create({
    template: compile('foo bar baz')
  });

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(() => view.append());

  let viewElem = jQuery(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

QUnit.test('raises an assert when a target does not exist in the DOM', function() {
  view = View.create();

  expectAssertion(() => {
    run(() => view.appendTo('does-not-exist-in-dom'));
  });
});


QUnit.test('remove removes an element from the DOM', function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(() => view.append());

  ok(jQuery('#' + get(view, 'elementId')).length === 1, 'precond - element was inserted');

  run(() => view.destroyElement());

  ok(jQuery('#' + get(view, 'elementId')).length === 0, 'remove removes an element from the DOM');
  ok(EmberView.views[get(view, 'elementId')] === undefined, 'remove does not remove the view from the view hash');
  ok(!get(view, 'element'), 'remove nulls out the element');
  equal(willDestroyCalled, 1, 'the willDestroyElement hook was called once');
});

QUnit.test('destroy more forcibly removes the view', function() {
  willDestroyCalled = 0;

  view = View.create({
    willDestroyElement() {
      willDestroyCalled++;
    }
  });

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(() => view.append());

  ok(jQuery('#' + get(view, 'elementId')).length === 1, 'precond - element was inserted');

  run(() => view.destroy());

  ok(jQuery('#' + get(view, 'elementId')).length === 0, 'destroy removes an element from the DOM');
  ok(EmberView.views[get(view, 'elementId')] === undefined, 'destroy removes a view from the global views hash');
  equal(get(view, 'isDestroyed'), true, 'the view is marked as destroyed');
  ok(!get(view, 'element'), 'the view no longer has an element');
  equal(willDestroyCalled, 1, 'the willDestroyElement hook was called once');
});

QUnit.module('EmberView - append() and appendTo() in a view hierarchy', {
  setup() {
    commonSetup();

    owner.register('component:x-foo', Component.extend({
      elementId: 'child'
    }));

    View = Component.extend({
      [OWNER]: owner,
      layout: compile('{{x-foo}}')
    });
  },

  teardown() {
    runDestroy(view);
  }
});

QUnit.test('should be added to the specified element when calling appendTo()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(() => view.appendTo('#menu'));

  let viewElem = jQuery('#menu #child');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

QUnit.test('should be added to the document body when calling append()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  runAppend(view);

  let viewElem = jQuery('#child');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});
