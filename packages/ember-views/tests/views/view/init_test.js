/*global TestApp:true*/
var set = Ember.set, get = Ember.get;

module("Ember.View.create");

test("registers view in the global views hash using layerId for event targeted", function() {
  var v = Ember.View.create();
  equal(Ember.View.views[get(v, 'elementId')], v, 'registers view');
});

test("registers itself with a controller if the viewController property is set", function() {
  window.TestApp = {};
  TestApp.fooController = Ember.Object.create();

  var v = Ember.View.create({
    viewController: 'TestApp.fooController'
  });

  equal(TestApp.fooController.get('view'), v, "sets the view property of the controller");
});

test("should warn if a non-array is used for classNames", function() {
  raises(function() {
    Ember.View.create({
      classNames: Ember.computed(function() {
        return ['className'];
      }).property().volatile()
    });
  }, /Only arrays are allowed/i, 'should warn that an array was not used');
});

test("should warn if a non-array is used for classNamesBindings", function() {
  raises(function() {
    Ember.View.create({
      classNameBindings: Ember.computed(function() {
        return ['className'];
      }).property().volatile()
    });
  }, /Only arrays are allowed/i, 'should warn that an array was not used');
});
