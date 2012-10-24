var originalLookup = Ember.lookup, lookup,
    MyView = Ember.View.extend({ isMyView: true });

module("Ember.Handlebars.ViewHelper.viewClass", {
  setup: function() {
    Ember.lookup = lookup = {
      Ember: Ember,
      Foo: {
        MyView: MyView
      }
    };
  },

  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

test("it updates the view if an item is added", function() {
  var viewClass = Ember.Handlebars.ViewHelper.viewClass({}, 'Foo.MyView');
  equal( MyView, viewClass );
});
