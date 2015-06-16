import View from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import Registry from "container/registry";
import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";
import { observer } from "ember-metal/mixin";
import { on } from "ember-metal/events";
import { computed } from "ember-metal/computed";

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
  // TODO: attrs
  // expectDeprecation();

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

QUnit.test('an observer on an attribute in the root of the component is fired when attrs are set', function() {
  expect(2);

  registry.register('view:foo', View.extend({
    observerFiredCount: 0,

    barObserver: on('init', observer('bar', function() {
      var count = get(this, 'observerFiredCount');

      set(this, 'observerFiredCount', count + 1);
    })),

    template: compile('{{view.bar}} - {{view.observerFiredCount}}')
  }));

  view = View.extend({
    container: registry.container(),
    baz: 'baz',
    template: compile('{{view "foo" bar=view.baz}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'baz - 1', 'observer is fired on initial set');

  run(function() {
    set(view, 'baz', 'qux');
  });

  equal(view.$().text(), 'qux - 2', 'observer is fired on update');
});

QUnit.test('a two way binding flows upstream through a CP', function() {
  expect(3);

  var innerView;
  registry.register('view:foo', View.extend({
    init() {
      this._super.apply(this, arguments);
      innerView = this;
    },
    template: compile(''),
    bar: computed({
      get() {
        return this._bar;
      },
      set(key, value) {
        this._bar = value;
        return this._bar;
      }
    })
  }));

  view = View.extend({
    container: registry.container(),
    baz: 'baz',
    template: compile('{{view "foo" bar=view.baz}}')
  }).create();

  runAppend(view);

  equal(view.get('baz'), 'baz', 'precond - initial CP value is baz');

  run(function() {
    set(innerView, 'bar', 'qux');
  });

  equal(innerView.get('bar'), 'qux', 'set CP is set');
  equal(view.get('baz'), 'qux', 'set CP propagates upstream');
});
