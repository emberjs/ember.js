/*global Test:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.View - Attribute Bindings", {
  setup: function() {
    Ember.lookup = lookup = {};
  },
  teardown: function() {
    if (view) {
      Ember.run(function(){
        view.destroy();
      });
      view = null;
    }
    Ember.lookup = originalLookup;
  }
});

test("should render attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'submit',
    isDisabled: true,
    exploded: false,
    destroyed: false,
    exists: true,
    nothing: null,
    notDefined: undefined,
    notNumber: NaN
  });

  Ember.run(function(){
    view.createElement();
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(view.$().attr('disabled'), "supports customizing attribute name for Boolean values");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should update attribute bindings", function() {
  view = Ember.View.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified', 'canIgnore'],
    attributeBindings: ['type', 'isDisabled:disabled', 'exploded', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'reset',
    isDisabled: true,
    exploded: true,
    destroyed: true,
    exists: false,
    nothing: true,
    notDefined: true,
    notNumber: true,
    explosions: 15
  });

  Ember.run(function(){
    view.createElement();
  });

  equal(view.$().attr('type'), 'reset', "adds type attribute");
  ok(view.$().attr('disabled'), "adds disabled attribute when true");
  ok(view.$().attr('exploded'), "adds exploded attribute when true");
  ok(view.$().attr('destroyed'), "adds destroyed attribute when true");
  ok(!view.$().attr('exists'), "does not add exists attribute when false");
  ok(view.$().attr('nothing'), "adds nothing attribute when true");
  ok(view.$().attr('notDefined'), "adds notDefined attribute when true");
  ok(view.$().attr('notNumber'), "adds notNumber attribute when true");
  equal(view.$().attr('explosions'), "15", "adds integer attributes");

  Ember.run(function(){
    view.set('type', 'submit');
    view.set('isDisabled', false);
    view.set('exploded', false);
    view.set('destroyed', false);
    view.set('exists', true);
    view.set('nothing', null);
    view.set('notDefined', undefined);
    view.set('notNumber', NaN);
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(!view.$().attr('disabled'), "removes disabled attribute when false");
  ok(!view.$().attr('exploded'), "removes exploded attribute when false");
  ok(!view.$().attr('destroyed'), "removes destroyed attribute when false");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  ok(!view.$().attr('notDefined'), "removes notDefined attribute when undefined");
  ok(!view.$().attr('notNumber'), "removes notNumber attribute when NaN");
});

test("should throw if attributes are changed in the inBuffer state", function() {
  var parentView, Test;
  Ember.run(function() {
    lookup.Test = Test = Ember.Namespace.create();
    Test.controller = Ember.Object.create({
      foo: 'bar'
    });

    parentView = Ember.ContainerView.create();

    parentView.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        return "foo";
      },

      fooBinding: 'Test.controller.foo',
      attributeBindings: ['foo']
    }));

    parentView.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        Test.controller.set('foo', 'baz');
        return "bar";
      }
    }));

    parentView.pushObject(parentView.createChildView(Ember.View, {
      template: function() {
        return "bat";
      }
    }));
  });

  raises(function() {
    Ember.run(function() {
      parentView.append();
    });
  }, /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./);

  Ember.run(function(){
    parentView.destroy();
    Test.destroy();
  });

});

// This comes into play when using the {{#each}} helper. If the
// passed array item is a String, it will be converted into a
// String object instead of a normal string.
test("should allow binding to String objects", function() {
  view = Ember.View.create({
    attributeBindings: ['foo'],
    // JSHint doesn't like `new String` so we'll create it the same way it gets created in practice
    foo: (function(){ return this; }).call("bar")
  });

  Ember.run(function(){
    view.createElement();
  });


  equal(view.$().attr('foo'), 'bar', "should convert String object to bare string");
});

test("should teardown observers on rerender", function() {
  view = Ember.View.create({
    attributeBindings: ['foo'],
    classNameBindings: ['foo'],
    foo: 'bar'
  });

  appendView();

  equal(Ember.observersFor(view, 'foo').length, 2);

  Ember.run(function() {
    view.rerender();
  });

  equal(Ember.observersFor(view, 'foo').length, 2);
});
