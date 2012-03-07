var set = Ember.set, get = Ember.get;

module("Ember.View#destroy");

test("should teardown viewName on parentView when childView is destroyed", function() {
  var viewName = "someChildView",
      parentView = Ember.View.create(),
      childView = parentView.createChildView(Ember.View, {viewName: viewName});

  equal(get(parentView, viewName), childView, "Precond - child view was registered on parent");

  childView.destroy();
  equal(get(parentView, viewName), null, "viewName reference was removed on parent");
});

