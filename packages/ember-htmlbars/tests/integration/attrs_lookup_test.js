import Registry from 'container/registry';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import EmberView from 'ember-views/views/view';

var registry, container, view;

QUnit.module('component - attrs lookup', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('should be able to lookup attrs without `attrs.` - template access', function() {
  registry.register('template:components/foo-bar', compile('{{first}}'));

  view = EmberView.extend({
    template: compile('{{foo-bar first="first attr"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'first attr');
});

QUnit.test('should be able to lookup attrs without `attrs.` - component access', function() {
  var component;

  registry.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    }
  }));

  view = EmberView.extend({
    template: compile('{{foo-bar first="first attr"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(component.get('first'), 'first attr');
});

QUnit.test('should be able to modify a provided attr into local state #11571 / #11559', function() {
  var component;

  registry.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    },

    didReceiveAttrs() {
      this.set('first', this.getAttr('first').toUpperCase());
    }
  }));
  registry.register('template:components/foo-bar', compile('{{first}}'));

  view = EmberView.extend({
    template: compile('{{foo-bar first="first attr"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'FIRST ATTR', 'template lookup uses local state');
  equal(component.get('first'), 'FIRST ATTR', 'component lookup uses local state');
});
