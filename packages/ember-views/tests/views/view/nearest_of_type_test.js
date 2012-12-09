var set = Ember.set, get = Ember.get;

module("Ember.View#nearest*");

(function() {
  var Mixin = Ember.Mixin.create({}),
      Parent = Ember.View.extend(Mixin, {
        render: function(buffer) {
          this.appendChild( Ember.View.create() );
        }
      });

  test("nearestOfType should find the closest view by view class", function() {
    var parent, child;

    Ember.run(function() {
      parent = Parent.create();
      parent.appendTo('#qunit-fixture');
    });

    child = parent.get('childViews')[0];
    equal(child.nearestOfType(Parent), parent, "finds closest view in the hierarchy by class");
  });

  test("nearestOfType should find the closest view by mixin", function() {
    var parent, child;

    Ember.run(function() {
      parent = Parent.create();
      parent.appendTo('#qunit-fixture');
    });

    child = parent.get('childViews')[0];
    equal(child.nearestOfType(Mixin), parent, "finds closest view in the hierarchy by class");
  });

test("nearestWithProperty should search immediate parent", function(){
  var childView;

  var view = Ember.View.create({
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
