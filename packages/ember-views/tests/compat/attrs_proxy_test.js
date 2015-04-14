import View from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import Registry from "container/registry";

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
