var set = Ember.set, get = Ember.get, parentView, view;

module("Ember.View#nearest*", {
  teardown: function() {
    Ember.run(function() {
      if (parentView) { parentView.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

(function() {
  var Mixin = Ember.Mixin.create({}),
      Parent = Ember.View.extend(Mixin, {
        render: function(buffer) {
          this.appendChild( Ember.View.create() );
        }
      });

  test("nearestOfType should find the closest view by view class", function() {
    var child;

    Ember.run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Parent), parentView, "finds closest view in the hierarchy by class");
  });

  test("nearestOfType should find the closest view by mixin", function() {
    var child;

    Ember.run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Mixin), parentView, "finds closest view in the hierarchy by class");
  });

test("nearestWithProperty should search immediate parent", function() {
  var childView;

  view = Ember.View.create({
    myProp: true,

    render: function(buffer) {
      this.appendChild(Ember.View.create());
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  childView = view.get('childViews')[0];
  equal(childView.nearestWithProperty('myProp'), view);

});

}());
