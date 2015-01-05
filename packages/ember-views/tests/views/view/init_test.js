import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import { computed } from "ember-metal/computed";
import EmberView from "ember-views/views/view";

var originalLookup = Ember.lookup;
var lookup, view;

QUnit.module("EmberView.create", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    if (view) {
      run(view, 'destroy');
    }

    Ember.lookup = originalLookup;
  }
});

test("registers view in the global views hash using layerId for event targeted", function() {
  view = EmberView.create();
  run(function() {
    view.appendTo('#qunit-fixture');
  });
  equal(EmberView.views[get(view, 'elementId')], view, 'registers view');
});

test("should warn if a non-array is used for classNames", function() {
  expectAssertion(function() {
    view = EmberView.createWithMixins({
      elementId: 'test',
      classNames: computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

test("should warn if a non-array is used for classNamesBindings", function() {
  expectAssertion(function() {
    view = EmberView.createWithMixins({
      elementId: 'test',
      classNameBindings: computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

test("setting classNameBindings does not trigger a mandatory-setter assertion", function() {
  view = EmberView.create({
    elementId: 'test',
    classNameBindings: ['foo'],
    foo: true
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().hasClass('foo'), 'proper class was applied');
});

test("setting classNames does not trigger a mandatory-setter assertion", function() {
  view = EmberView.create({
    elementId: 'test',
    classNames: ['foo']
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  ok(view.$().hasClass('foo'), 'proper class was applied');
});
