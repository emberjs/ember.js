/*global Test:true*/
var set = Ember.set, get = Ember.get;

var originalLookup = Ember.lookup, lookup, view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

if (Ember.FEATURES.isEnabled('ember-views-bindable-attributes')) {
  module("Ember.BindableAttributesMixin - Lazy Bound Attributes", {
    setup: function(){
      Ember.lookup = lookup = {};

      view = Ember.View.extend(Ember.BindableAttributesMixin, {
        bindableAttributes: ['fuzzy','wuzzy','wassa','bear']
      }).create({
        fuzzy: 'bingo',
        wassa: 'dog'
      });
    },
    teardown: function(){
      if (view) {
        Ember.run(function() {
          view.destroy();
        });
        view = null;
      }
      Ember.lookup = originalLookup;
    }
  });

  test("should render attribute bindings if the property exists at render time", function() {
    Ember.run(function() {
      view.createElement();
    });

    equal(view.$().attr('fuzzy'), 'bingo', "property that was present is bound");
    equal(view.$().attr('wassa'), 'dog', "property that was present is bound");
  });

  test("should update when properties that were present are updated", function(){
    Ember.run(function() {
      view.createElement();
    });

    Ember.run(function(){
      view.set('fuzzy', 'blanket');
    });
    equal(view.$().attr('fuzzy'), 'blanket', "property that was present is updated properly");
  });

  test("should not create observers for properties that did not exist", function(){
    Ember.run(function() {
      view.createElement();
    });

    equal(view.$().attr('wuzzy'), undefined, "attribute is not created when property is missing");

    Ember.run(function(){
      view.set('wuzzy', 'Lucy');
    });

    equal(view.$().attr('wuzzy'), undefined, "attribute is not updated because no observers were created");
  });

  test("should not pick up new properties during subsequent renderings", function(){
    // mock the _appliedBindableAttributes for this test only
    view._appliedBindableAttributes = [''];

    Ember.run(function() {
      view.createElement();
    });

    equal(view.$().attr('fuzzy'), undefined, "attribute is not created if it did not exist at first render");
  });
}
