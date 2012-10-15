var set = Ember.set, get = Ember.get;

var view, myViewClass ;

module("Ember.View#createChildView", {
  setup: function() {
    view = Ember.View.create();
    myViewClass = Ember.View.extend({ isMyView: true, foo: 'bar' });
  }
});

test("should create view from class with any passed attributes", function() {
  var attrs = { foo: "baz" };
  var newView = view.createChildView(myViewClass, attrs);
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

test("should set newView.parentView to receiver", function() {
  var newView = view.createChildView(myViewClass) ;
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

test("should create property on parentView to a childView instance if provided a viewName", function() {
  var attrs = { viewName: "someChildView" };
  var newView = view.createChildView(myViewClass, attrs);

  equal(get(view, 'someChildView'), newView);
});
