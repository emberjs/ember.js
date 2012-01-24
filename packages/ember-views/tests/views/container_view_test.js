var get = Ember.get;

module("ember-views/views/container_view_test");

test("should be able to insert views after the DOM representation is created", function() {
  var container = Ember.ContainerView.create({
    classNameBindings: ['name'],

    name: 'foo'
  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = Ember.View.create({
    template: function() {
      return "This is my moment";
    }
  });

  Ember.run(function() {
    container.get('childViews').pushObject(view);
  });

  equal(container.$().text(), "This is my moment");
  equal(view.get('parentView'), container, "sets the parent view after the childView is appended");

  Ember.run(function() {
    get(container, 'childViews').removeObject(view);
  });

  equal(view.get('parentView'), null, "sets parentView to null when a view is removed");

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


test("childViewsDidChangeElementEnd get called when updated the content", function() {

  var container;
  var isCalled = false;

  container = Ember.ContainerView.create({
    childViews: ['child'],

    childViewsDidChangeElementEnd: function() {
      isCalled = true;
    },
    child: Ember.View

  });

  Ember.run(function() {
    container.appendTo('#qunit-fixture');
  });

  ok(!isCalled, "after being the element inserted in the DOM, the method is NOT called");


  var view = Ember.View.create({});

  Ember.run(function() {
    container.get('childViews').pushObject(view);
  });



  ok(isCalled, "when new views are inserted, the method is called");


  isCalled = false;


  Ember.run(function() {
    container.get('childViews').popObject();
    container.get('childViews').popObject();
  });

  ok(isCalled, "after removing all the elements , the method is called");


});
