import View from 'ember-views/views/view';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import run from 'ember-metal/run_loop';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { observer } from 'ember-metal/mixin';
import { on } from 'ember-metal/events';
import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var view, owner, originalViewKeyword;

QUnit.module('ember-views: attrs-proxy', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    owner = buildOwner();
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('works with properties setup in root of view', function() {
  owner.register('view:foo', View.extend({
    bar: 'qux',

    template: compile('{{view.bar}}')
  }));

  view = View.extend({
    [OWNER]: owner,
    template: compile('{{view "foo" bar="baz"}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'baz', 'value specified in the template is used');
});

QUnit.test('works with undefined attributes', function() {
  // TODO: attrs
  // expectDeprecation();

  var childView;
  owner.register('view:foo', View.extend({
    init: function() {
      this._super(...arguments);

      childView = this;
    },

    template: compile('{{bar}}')
  }));

  view = View.extend({
    [OWNER]: owner,
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

  owner.register('view:foo', View.extend({
    observerFiredCount: 0,

    barObserver: on('init', observer('bar', function() {
      var count = get(this, 'observerFiredCount');
      set(this, 'observerFiredCount', count + 1);
    })),

    template: compile('{{view.bar}} - {{view.observerFiredCount}}')
  }));

  view = View.extend({
    [OWNER]: owner,
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
