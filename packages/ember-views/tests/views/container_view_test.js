module("ember-views/views/container_view_test");

test("should be able to insert views after the DOM representation is created", function() {
  var container = Ember.ContainerView.create({
    classNameBindings: ['name'],

    name: 'foo'
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = container.createChildView(Ember.View, {
    template: function() {
      return "This is my moment";
    }
  });

  Ember.run(function() {
    container.get('childViews').pushObject(view);
  });

  equals(container.$().text(), "This is my moment");

  container.destroy();
});

test("should be able to observe properties that contain child views", function() {
  var container;

  Ember.run(function() {
    container = Ember.ContainerView.create({
      childViews: ['displayView'],
      displayIsDisplayedBinding: 'displayView.isDisplayed',

      displayView: Ember.View.extend({
        isDisplayed: true
      })
    });

    container.appendTo('#qunit-fixture');
  });

  ok(container.get('displayIsDisplayed'), "can bind to child view");
});
