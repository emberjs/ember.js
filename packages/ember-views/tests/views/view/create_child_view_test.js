var set = Ember.set, get = Ember.get;

var view, myViewClass, newView;

module("Ember.View#createChildView", {
  setup: function() {
    view = Ember.View.create();
    myViewClass = Ember.View.extend({ isMyView: true, foo: 'bar' });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      newView.destroy();
    });
  }
});

test("should create view from class with any passed attributes", function() {
  var attrs = { foo: "baz" };
  newView = view.createChildView(myViewClass, attrs);
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

test("should set newView.parentView to receiver", function() {
  newView = view.createChildView(myViewClass) ;
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

test("should create property on parentView to a childView instance if provided a viewName", function() {
  var attrs = { viewName: "someChildView" };
  newView = view.createChildView(myViewClass, attrs);

  equal(get(view, 'someChildView'), newView);
});
