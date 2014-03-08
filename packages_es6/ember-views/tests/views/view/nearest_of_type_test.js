import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import {Mixin as EmberMixin} from "ember-metal/mixin";
import {View} from "ember-views/views/view";

var parentView, view;

module("View#nearest*", {
  teardown: function() {
    run(function() {
      if (parentView) { parentView.destroy(); }
      if (view) { view.destroy(); }
    });
  }
});

(function() {
  var Mixin = EmberMixin.create({}),
      Parent = View.extend(Mixin, {
        render: function(buffer) {
          this.appendChild( View.create() );
        }
      });

  test("nearestOfType should find the closest view by view class", function() {
    var child;

    run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Parent), parentView, "finds closest view in the hierarchy by class");
  });

  test("nearestOfType should find the closest view by mixin", function() {
    var child;

    run(function() {
      parentView = Parent.create();
      parentView.appendTo('#qunit-fixture');
    });

    child = parentView.get('childViews')[0];
    equal(child.nearestOfType(Mixin), parentView, "finds closest view in the hierarchy by class");
  });

test("nearestWithProperty should search immediate parent", function() {
  var childView;

  view = View.create({
    myProp: true,

    render: function(buffer) {
      this.appendChild(View.create());
    }
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  childView = view.get('childViews')[0];
  equal(childView.nearestWithProperty('myProp'), view);

});

}());
