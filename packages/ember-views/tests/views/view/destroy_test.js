var set = Ember.set, get = Ember.get;

module("Ember.View#destroy");

test("should teardown viewName on parentView when childView is destroyed", function() {
  var viewName = "someChildView",
      parentView = Ember.View.create(),
      childView = parentView.createChildView(Ember.View, {viewName: viewName});

  equal(get(parentView, viewName), childView, "Precond - child view was registered on parent");

  Ember.run(function(){
    childView.destroy();
  });

  equal(get(parentView, viewName), null, "viewName reference was removed on parent");

  Ember.run(function() {
    parentView.destroy();
  });
});

module("Ember.View#destroy - synchronous synthesised event edge-case", {
  setup: function() {
    dispatcher = Ember.run(Ember.EventDispatcher, 'create');
    dispatcher.setup({}, '#qunit-fixture');
  },

  teardown: function() {
    Ember.run(dispatcher, 'destroy');

    if (parentView) {
      Ember.run(parentView, 'destroy');
    }
  }
});

var parentView, dispatcher;

test("focusOut event caused by removal of an in-focus text field should fire on the actions queue", function() {
  expect(3);

  var focusOutCount = 0;

  parentView = Ember.View.create({
    focusOut: function(e) {
      focusOutCount++;
    },
    render: function(buffer) {
      buffer.push("<input>");
    }
  });

  Ember.run(parentView, 'appendTo', '#qunit-fixture');

  parentView.$('input').focus();

  Ember.run(function(){
    parentView.$('input').remove();
    equal(focusOutCount, 0, 'focusOut was not called yet');
  });

  equal(focusOutCount, 1, 'focusOut event was fired once, on next tick');

  equal(Ember.$(':focus')[0], undefined, 'nothing is in focus');
});

