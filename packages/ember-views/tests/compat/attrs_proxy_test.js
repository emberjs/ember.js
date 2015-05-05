import View from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import Registry from "container/registry";
import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";

var view, registry, container;

QUnit.module("ember-views: attrs-proxy", {
  setup() {
    registry = new Registry();
    container = registry.container();
  },

  teardown() {
    runDestroy(view);
  }
});

QUnit.test('works with properties setup in root of view', function() {
  registry.register('view:foo', View.extend({
    bar: 'qux',

    template: compile('{{view.bar}}')
  }));

  view = View.extend({
    container: registry.container(),
    template: compile('{{view "foo" bar="baz"}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'baz', 'value specified in the template is used');
});

QUnit.test('works with undefined attributes', function() {
  expectDeprecation();

  var childView;
  registry.register('view:foo', View.extend({
    init: function() {
      this._super(...arguments);

      childView = this;
    },

    template: compile('{{bar}}')
  }));

  view = View.extend({
    container: registry.container(),

    template: compile('{{view "foo" bar=undefined}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), '', 'precond - value is used');

  run(function() {
    set(childView, 'bar', 'stuff');
  });

  equal(get(view, 'bar'), undefined, 'value is updated upstream');
});
