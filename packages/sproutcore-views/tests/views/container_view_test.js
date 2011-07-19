module("sproutcore-views/views/container_view_test");

test("should be able to insert views after the DOM representation is created", function() {
  var container = SC.ContainerView.create({
    classNameBindings: ['name'],

    name: 'foo'
  });

  SC.run(function() {
    container.appendTo('#qunit-fixture');
  });

  var view = container.createChildView(SC.View, {
    template: function() {
      return "This is my moment";
    }
  });

  SC.run(function() {
    container.get('childViews').pushObject(view);
  });

  equals(container.$().text(), "This is my moment");

  container.destroy();
});
