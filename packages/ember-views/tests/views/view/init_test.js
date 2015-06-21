import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';

var originalLookup = Ember.lookup;
var lookup, view;

QUnit.module('EmberView.create', {
  setup() {
    Ember.lookup = lookup = {};
  },
  teardown() {
    run(function() {
      view.destroy();
    });

    Ember.lookup = originalLookup;
  }
});

QUnit.test('registers view in the global views hash using layerId for event targeted', function() {
  view = EmberView.create();
  run(function() {
    view.appendTo('#qunit-fixture');
  });
  equal(EmberView.views[get(view, 'elementId')], view, 'registers view');
});

QUnit.module('EmberView.extend');

QUnit.test('should warn if a computed property is used for classNames', function() {
  expectAssertion(function() {
    EmberView.extend({
      elementId: 'test',
      classNames: computed(function() {
        return ['className'];
      }).volatile()
    }).create();
  }, /Only arrays of static class strings.*For dynamic classes/i);
});

QUnit.test('should warn if a non-array is used for classNameBindings', function() {
  expectAssertion(function() {
    EmberView.extend({
      elementId: 'test',
      classNameBindings: computed(function() {
        return ['className'];
      }).volatile()
    }).create();
  }, /Only arrays are allowed/i);
});

QUnit.test('creates a renderer if one is not provided', function() {
  var childView;

  childView = EmberView.create({
    template: compile('ber')
  });

  view = EmberView.create({
    childView: childView,
    template: compile('Em{{view.childView}}')
  });

  run(function() {
    view.append();
  });

  run(function() {
    ok(get(view, 'renderer'), 'view created without container receives a renderer');
    strictEqual(get(view, 'renderer'), get(childView, 'renderer'), 'parent and child share a renderer');
  });


  run(function() {
    view.destroy();
    childView.destroy();
  });
});
