import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';

import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

QUnit.module('component - attrs lookup', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('component', { singleton: false });
    owner.registerOptionsForType('view', { singleton: false });
    owner.registerOptionsForType('template', { instantiate: false });
    owner.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(owner);
    runDestroy(view);
    owner = view = null;
  }
});

QUnit.test('should be able to lookup attrs without `attrs.` - template access', function() {
  owner.register('template:components/foo-bar', compile('{{first}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{foo-bar first="first attr"}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'first attr');
});

QUnit.test('should be able to lookup attrs without `attrs.` - component access', function() {
  var component;

  owner.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{foo-bar first="first attr"}}')
  }).create();

  runAppend(view);

  equal(component.get('first'), 'first attr');
});

QUnit.test('should be able to modify a provided attr into local state #11571 / #11559', function() {
  var component;

  owner.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    },

    didReceiveAttrs() {
      this.set('first', this.getAttr('first').toUpperCase());
    }
  }));
  owner.register('template:components/foo-bar', compile('{{first}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{foo-bar first="first attr"}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'FIRST ATTR', 'template lookup uses local state');
  equal(component.get('first'), 'FIRST ATTR', 'component lookup uses local state');
});

QUnit.test('should be able to access unspecified attr #12035', function() {
  var component;

  owner.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    },

    didReceiveAttrs() {
      equal(this.get('woot'), 'yes', 'found attr in didReceiveAttrs');
    }
  }));
  // owner.register('template:components/foo-bar', compile('{{first}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{foo-bar woot="yes"}}')
  }).create();

  runAppend(view);

  // equal(view.$().text(), 'FIRST ATTR', 'template lookup uses local state');
  equal(component.get('woot'), 'yes', 'component found attr');
});

QUnit.test('should not need to call _super in `didReceiveAttrs` (GH #11992)', function() {
  expect(12);
  var firstValue = 'first';
  var secondValue = 'second';

  owner.register('component:foo-bar', Component.extend({
    didReceiveAttrs() {
      let rootFirst = this.get('first');
      let rootSecond = this.get('second');
      let attrFirst = this.getAttr('first');
      let attrSecond = this.getAttr('second');

      equal(rootFirst, attrFirst, 'root property matches attrs value');
      equal(rootSecond, attrSecond, 'root property matches attrs value');

      equal(rootFirst, firstValue, 'matches known value');
      equal(rootSecond, secondValue, 'matches known value');
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    first: firstValue,
    second: secondValue,
    template: compile('{{foo-bar first=view.first second=view.second}}')
  }).create();

  runAppend(view);

  firstValue = 'asdf';
  run(view, 'set', 'first', firstValue);

  secondValue = 'jkl;';
  run(view, 'set', 'second', secondValue);
});
