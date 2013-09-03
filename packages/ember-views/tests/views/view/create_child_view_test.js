var set = Ember.set, get = Ember.get;

var view, myViewClass, newView, container;

module("Ember.View#createChildView", {
  setup: function() {
    container = { };

    view = Ember.View.create({
      container: container
    });

    myViewClass = Ember.View.extend({ isMyView: true, foo: 'bar' });
  },

  teardown: function() {
    Ember.run(function() {
      view.destroy();
      if(newView) { newView.destroy(); }
    });
  }
});

test("should create view from class with any passed attributes", function() {
  var attrs = {
    foo: "baz"
  };

  newView = view.createChildView(myViewClass, attrs);

  equal(newView.container, container, 'expects to share container with parent');
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

test("should set newView.parentView to receiver", function() {
  newView = view.createChildView(myViewClass) ;

  equal(newView.container, container, 'expects to share container with parent');
  equal(get(newView, 'parentView'), view, 'newView.parentView == view');
});

test("should create property on parentView to a childView instance if provided a viewName", function() {
  var attrs = {
    viewName: "someChildView"
  };

  newView = view.createChildView(myViewClass, attrs);
  equal(newView.container, container, 'expects to share container with parent');

  equal(get(view, 'someChildView'), newView);
});

test("should update a view instances attributes, including the _parentView and container properties", function() {
  var attrs = {
    foo: "baz"
  };

  var myView = myViewClass.create();
  newView = view.createChildView(myView, attrs);

  equal(newView.container,  container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
  equal(get(newView, 'foo'), 'baz', 'view did get custom attributes');

  deepEqual(newView, myView);
});

test("should create from string via container lookup", function() {
  var ChildViewClass = Ember.View.extend(),
  fullName = 'view:bro';

  view.container.lookupFactory = function(viewName) {
    equal(fullName, viewName);

    return ChildViewClass.extend({
      container: container
    });
  };

  newView = view.createChildView('bro');

  equal(newView.container,  container, 'expects to share container with parent');
  equal(newView._parentView, view, 'expects to have the correct parent');
});

test("should assert when trying to create childView from string, but no such view is registered", function() {
  view.container.lookupFactory = function() {};

  expectAssertion(function(){
    view.createChildView('bro');
  });
});

