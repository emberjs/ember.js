import {get} from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import {View as EmberView} from "ember-views/views/view";

var view ;
module("EmberView#$", {
  setup: function() {
    view = EmberView.extend({
      render: function(context, firstTime) {
        context.push('<span></span>');
      }
    }).create();

    run(function() {
      view.append();
    });
  },

  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

test("returns undefined if no element", function() {
  var view = EmberView.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equal(view.$(), undefined, 'should return undefined');
  equal(view.$('span'), undefined, 'should undefined if filter passed');

  run(function() {
    view.destroy();
  });
});

test("returns jQuery object selecting element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0], get(view, 'element'), 'element should be element');
});

test("returns jQuery object selecting element inside element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

test("returns empty jQuery object if filter passed that does not match item in parent", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equal(jquery.length, 0, 'view.$(body) should have no elements');
});

