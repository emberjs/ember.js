import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';

import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';


var owner, View, view, otherView, willDestroyCalled, originalViewKeyword;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('view', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

QUnit.module('EmberView - append() and appendTo()', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    View = EmberView.extend({});
  },

  teardown() {
    runDestroy(view);
    runDestroy(otherView);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('can call `appendTo` for multiple views #11109', function() {
  var elem;
  jQuery('#qunit-fixture').html('<div id="menu"></div><div id="other-menu"></div>');

  view = View.create();
  otherView = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');
  ok(!get(otherView, 'element'), 'precond - should not have an element');

  run(function() {
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

  run(function() {
    view.appendTo('#menu');
  });

  var viewElem = jQuery('#menu').children();
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

test('should be added to the document body when calling append()', function() {
  view = View.create({
    template: compile('foo bar baz')
  });

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(function() {
    view.append();
  });

  var viewElem = jQuery(document.body).find(':contains("foo bar baz")');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

QUnit.test('raises an assert when a target does not exist in the DOM', function() {
  view = View.create();

  expectAssertion(function() {
    run(function() {
      view.appendTo('does-not-exist-in-dom');
    });
  });
});

test('append calls willInsertElement and didInsertElement callbacks', function() {
  var willInsertElementCalled = false;
  var willInsertElementCalledInChild = false;
  var didInsertElementCalled = false;

  var ViewWithCallback = View.extend({
    willInsertElement() {
      willInsertElementCalled = true;
    },
    didInsertElement() {
      didInsertElementCalled = true;
    },
    childView: EmberView.create({
      willInsertElement() {
        willInsertElementCalledInChild = true;
      }
    }),
    template: compile('{{view view.childView}}')
  });

  view = ViewWithCallback.create();

  run(function() {
    view.append();
  });

  ok(willInsertElementCalled, 'willInsertElement called');
  ok(willInsertElementCalledInChild, 'willInsertElement called in child');
  ok(didInsertElementCalled, 'didInsertElement called');
});

test('a view calls its children\'s willInsertElement and didInsertElement', function() {
  var parentView;
  var willInsertElementCalled = false;
  var didInsertElementCalled = false;
  var didInsertElementSawElement = false;

  parentView = EmberView.create({
    ViewWithCallback: EmberView.extend({
      template: compile('<div id="do-i-exist"></div>'),

      willInsertElement() {
        willInsertElementCalled = true;
      },
      didInsertElement() {
        didInsertElementCalled = true;
        didInsertElementSawElement = (this.$('div').length === 1);
      }
    }),

    template: compile('{{#if view.condition}}{{view view.ViewWithCallback}}{{/if}}'),
    condition: false
  });

  run(function() {
    parentView.append();
  });
  run(function() {
    parentView.set('condition', true);
  });

  ok(willInsertElementCalled, 'willInsertElement called');
  ok(didInsertElementCalled, 'didInsertElement called');
  ok(didInsertElementSawElement, 'didInsertElement saw element');

  run(function() {
    parentView.destroy();
  });
});

test('replacing a view should invalidate childView elements', function() {
  var elementOnDidInsert;

  view = EmberView.create({
    show: false,

    CustomView: EmberView.extend({
      init() {
        this._super(...arguments);
        // This will be called in preRender
        // We want it to cache a null value
        // Hopefully it will be invalidated when `show` is toggled
        this.get('element');
      },

      didInsertElement() {
        elementOnDidInsert = this.get('element');
      }
    }),

    template: compile('{{#if view.show}}{{view view.CustomView}}{{/if}}')
  });

  run(function() { view.append(); });

  run(function() { view.set('show', true); });

  ok(elementOnDidInsert, 'should have an element on insert');

  run(function() { view.destroy(); });
});

test('trigger rerender of parent and SimpleBoundView', function () {
  var view = EmberView.create({
    show: true,
    foo: 'bar',
    template: compile('{{#if view.show}}{{#if view.foo}}{{view.foo}}{{/if}}{{/if}}')
  });

  run(function() { view.append(); });

  equal(view.$().text(), 'bar');

  run(function() {
    view.set('foo', 'baz'); // schedule render of simple bound
    view.set('show', false); // destroy tree
  });

  equal(view.$().text(), '');

  run(function() {
    view.destroy();
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

  run(function() {
    view.append();
  });

  ok(jQuery('#' + get(view, 'elementId')).length === 1, 'precond - element was inserted');

  run(function() {
    view.remove();
  });

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

  run(function() {
    view.append();
  });

  ok(jQuery('#' + get(view, 'elementId')).length === 1, 'precond - element was inserted');

  run(function() {
    view.destroy();
  });

  ok(jQuery('#' + get(view, 'elementId')).length === 0, 'destroy removes an element from the DOM');
  ok(EmberView.views[get(view, 'elementId')] === undefined, 'destroy removes a view from the global views hash');
  equal(get(view, 'isDestroyed'), true, 'the view is marked as destroyed');
  ok(!get(view, 'element'), 'the view no longer has an element');
  equal(willDestroyCalled, 1, 'the willDestroyElement hook was called once');
});

testModule('EmberView - append() and appendTo() in a view hierarchy', {
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

test('should be added to the specified element when calling appendTo()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  run(function() {
    view.appendTo('#menu');
  });

  var viewElem = jQuery('#menu #child');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});

test('should be added to the document body when calling append()', function() {
  jQuery('#qunit-fixture').html('<div id="menu"></div>');

  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  runAppend(view);

  var viewElem = jQuery('#child');
  ok(viewElem.length > 0, 'creates and appends the view\'s element');
});
