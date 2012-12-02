/*global TestApp:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup;

module("Ember.View.create", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("registers view in the global views hash using layerId for event targeted", function() {
  var v = Ember.View.create();
  equal(Ember.View.views[get(v, 'elementId')], v, 'registers view');
});

test("registers itself with a controller if the viewController property is set", function() {
  lookup.TestApp = {};
  lookup.TestApp.fooController = Ember.Object.create();

  var v = Ember.View.create({
    viewController: 'TestApp.fooController'
  });

  equal(lookup.TestApp.fooController.get('view'), v, "sets the view property of the controller");
});

module("Ember.View.createWithMixins");

test("should warn if a non-array is used for classNames", function() {
  raises(function() {
    Ember.View.createWithMixins({
      classNames: Ember.computed(function() {
        return ['className'];
      }).property().volatile()
    });
  }, /Only arrays are allowed/i, 'should warn that an array was not used');
});

test("should warn if a non-array is used for classNamesBindings", function() {
  raises(function() {
    Ember.View.createWithMixins({
      classNameBindings: Ember.computed(function() {
        return ['className'];
      }).property().volatile()
    });
  }, /Only arrays are allowed/i, 'should warn that an array was not used');
});
