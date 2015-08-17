import isEnabled from 'ember-metal/features';
import ComponentLookup from 'ember-views/component_lookup';
import Registry from 'container/registry';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var view, registry, container;

if (isEnabled('ember-htmlbars-component-generation')) {
  QUnit.module('ember-htmlbars: dasherized components that are not in the container ("web components")', {
    setup() {
      registry = new Registry();
      container = registry.container();

      registry.optionsForType('template', { instantiate: false });
      registry.register('component-lookup:main', ComponentLookup);
    },

    teardown() {
      runDestroy(view);
      runDestroy(container);
      registry = container = view = null;
    }
  });

  QUnit.test('non-component dasherized elements can be used as top-level elements', function() {
    registry.register('template:components/foo-bar', compile('<baz-bat>yippie!</baz-bat>'));

    view = EmberView.create({
      container: container,
      template: compile('<foo-bar />')
    });

    runAppend(view);

    equal(view.$('baz-bat').length, 1, 'regular element fallback occurred');
  });

  QUnit.test('falls back to web component when invoked with angles', function() {
    view = EmberView.create({
      container: container,
      template: compile('<foo-bar />')
    });

    runAppend(view);

    equal(view.$('foo-bar').length, 1, 'regular element fallback occurred');
  });
}
