/*global TestApp:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, view;

module("Ember.View.create", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    Ember.run(function() {
      view.destroy();
    });

    Ember.lookup = originalLookup;
  }
});

test("registers view in the global views hash using layerId for event targeted", function() {
  view = Ember.View.create();
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
  equal(Ember.View.views[get(view, 'elementId')], view, 'registers view');
});

module("Ember.View.createWithMixins");

test("should warn if a non-array is used for classNames", function() {
  expectAssertion(function() {
    Ember.View.createWithMixins({
      elementId: 'test',
      classNames: Ember.computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});

test("should warn if a non-array is used for classNamesBindings", function() {
  expectAssertion(function() {
    Ember.View.createWithMixins({
      elementId: 'test',
      classNameBindings: Ember.computed(function() {
        return ['className'];
      }).volatile()
    });
  }, /Only arrays are allowed/i);
});
