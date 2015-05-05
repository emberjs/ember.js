import { get } from "ember-metal/property_get";
import EmberView from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";

var view;
QUnit.module("EmberView#$", {
  setup() {
    view = EmberView.extend({
      template: compile('<span></span>')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
  }
});

QUnit.test("returns undefined if no element", function() {
  var view = EmberView.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equal(view.$(), undefined, 'should return undefined');
  equal(view.$('span'), undefined, 'should undefined if filter passed');

  runDestroy(view);
});

QUnit.test("returns jQuery object selecting element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0], get(view, 'element'), 'element should be element');
});

QUnit.test("returns jQuery object selecting element inside element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equal(jquery.length, 1, 'view.$() should have one element');
  equal(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

QUnit.test("returns empty jQuery object if filter passed that does not match item in parent", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equal(jquery.length, 0, 'view.$(body) should have no elements');
});

QUnit.test("asserts for tagless views", function() {
  var view = EmberView.create({
    tagName: ''
  });

  runAppend(view);

  expectAssertion(function() {
    view.$();
  }, /You cannot access this.\$\(\) on a component with `tagName: \'\'` specified/);

  runDestroy(view);
});
