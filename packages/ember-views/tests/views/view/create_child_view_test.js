import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import { on } from 'ember-metal/events';
import { observer } from 'ember-metal/mixin';

import { getOwner, OWNER } from 'container/owner';

let view, myViewClass, newView, owner;

QUnit.module('EmberView#createChildView', {
  setup() {
    owner = {};
    view = EmberView.create({
      [OWNER]: owner
    });

    myViewClass = EmberView.extend({ isMyView: true, foo: 'bar' });
  },

  teardown() {
    run(() => {
      view.destroy();
      if (newView) { newView.destroy(); }
    });
  }
});

QUnit.test('should create view from class with any passed attributes', function() {
  let attrs = {
    foo: 'baz'
  };

  newView = view.createChildView(myViewClass, attrs);

  equal(getOwner(newView), owner, 'expects to share container with parent');
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
});

QUnit.test('creating a childView, (via createChildView) should make parentView initial state and not emit change events nore helper actions', function() {
  expect(2);

  newView = view.createChildView(EmberView.extend({
    init() {
      this._super(...arguments);
      ok(true, 'did init');
    },
    parentViewDidReallyChange: on('parentViewDidChange', function() {
      ok(false, 'expected to NOT emit parentViewDidChange');
    }),
    controllerDidChange: observer('controller', function() {
      ok(false, 'expected to NOT expect controller to change');
    }),
    parentViewDidChange: observer('parentView', function() {
      ok(false, 'expected to NOT expect  parentViewto change');
    })
  }));

  equal(newView.get('parentView'), view, 'expected the correct parentView');
});

QUnit.test('should set newView.parentView to receiver', function() {
  newView = view.createChildView(myViewClass);

  equal(getOwner(newView), owner, 'expects to share container with parent');
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

QUnit.test('should create property on parentView to a childView instance if provided a viewName', function() {
  let attrs = {
    viewName: 'someChildView'
  };

  newView = view.createChildView(myViewClass, attrs);
  equal(getOwner(newView), owner, 'expects to share container with parent');

  equal(get(view, 'someChildView'), newView);
});

QUnit.test('should update a view instances attributes, including the parentView and container properties', function() {
  let attrs = {
    foo: 'baz'
  };

  let myView = myViewClass.create();
  newView = view.createChildView(myView, attrs);

  equal(getOwner(newView), owner, 'expects to share container with parent');
  equal(newView.parentView, view, 'expects to have the correct parent');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');

  deepEqual(newView, myView);
});

QUnit.test('should create from string via container lookup', function() {
  let ChildViewClass = EmberView.extend();
  let fullName = 'view:bro';

  owner._lookupFactory = function(viewName) {
    equal(fullName, viewName);

    return ChildViewClass.extend();
  };

  newView = view.createChildView('bro');

  equal(getOwner(newView), owner, 'expects to share container with parent');
  equal(newView.parentView, view, 'expects to have the correct parent');
});

QUnit.test('should assert when trying to create childView from string, but no such view is registered', function() {
  owner._lookupFactory = function() {};

  expectAssertion(() => view.createChildView('bro'));
});
