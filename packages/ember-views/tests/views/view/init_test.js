import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import { computed } from "ember-metal/computed";
import EmberView from "ember-views/views/view";

var originalLookup = Ember.lookup;
var lookup, view;

QUnit.module("EmberView.create", {
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

QUnit.test("registers view in the global views hash using layerId for event targeted", function() {
  view = EmberView.create();
  run(function() {
    view.appendTo('#qunit-fixture');
  });
  equal(EmberView.views[get(view, 'elementId')], view, 'registers view');
});

QUnit.module("EmberView.createWithMixins");

QUnit.test("should warn if a computed property is used for classNames", function() {
  expectAssertion(function() {
    EmberView.createWithMixins({
      elementId: 'test',
      classNames: computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays of static class strings.*For dynamic classes/i);
});

QUnit.test("should warn if a non-array is used for classNameBindings", function() {
  expectAssertion(function() {
    EmberView.createWithMixins({
      elementId: 'test',
      classNameBindings: computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

QUnit.test("creates a renderer if one is not provided", function() {
  var childView;

  view = EmberView.create({
    render(buffer) {
      buffer.push('Em');
      this.appendChild(childView);
    }
  });

  childView = EmberView.create({
    template() { return 'ber'; }
  });

  run(function() {
    view.append();
  });

  run(function() {
    ok(get(view, 'renderer'), "view created without container receives a renderer");
    strictEqual(get(view, 'renderer'), get(childView, 'renderer'), "parent and child share a renderer");
  });


  run(function() {
    view.destroy();
    childView.destroy();
  });
});
