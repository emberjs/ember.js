import Registry from 'container/registry';
import run from 'ember-metal/run_loop';
import ComponentLookup from 'ember-views/component_lookup';
import View from 'ember-views/views/view';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var registry, container, view;

QUnit.module('ember-htmlbars: block params', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
  }
});

QUnit.test('should raise error if helper not available', function() {
  view = View.create({
    container: container,
    template: compile('{{#shouldfail}}{{/shouldfail}}')
  });

  expectAssertion(function() {
    runAppend(view);
  }, `A helper named 'shouldfail' could not be found`);
});

QUnit.test('basic block params usage', function() {
  view = View.create({
    committer: { name: 'rwjblue' },
    template: compile('{{#with view.committer.name as |name|}}name: {{name}}, length: {{name.length}}{{/with}}')
  });

  runAppend(view);

  equal(view.$().text(), 'name: rwjblue, length: 7');

  run(function() {
    view.set('committer.name', 'krisselden');
  });

  equal(view.$().text(), 'name: krisselden, length: 10');
});

QUnit.test('nested block params shadow correctly', function() {
  view = View.create({
    context: { name: 'ebryn' },
    committer1: { name: 'trek' },
    committer2: { name: 'machty' },
    template: compile(
      '{{name}}' +
      '{{#with view.committer1.name as |name|}}' +
        '[{{name}}' +
        '{{#with view.committer2.name as |name|}}' +
          '[{{name}}]' +
        '{{/with}}' +
        '{{name}}]' +
      '{{/with}}' +
      '{{name}}' +
      '{{#with view.committer2.name as |name|}}' +
        '[{{name}}' +
        '{{#with view.committer1.name as |name|}}' +
          '[{{name}}]' +
        '{{/with}}' +
        '{{name}}]' +
      '{{/with}}' +
      '{{name}}'
    )
  });

  runAppend(view);

  equal(view.$().text(), 'ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');
});

QUnit.test('components can yield values', function() {
  registry.register('template:components/x-alias', compile('{{yield attrs.param.name}}'));

  view = View.create({
    container: container,
    context: { name: 'ebryn' },
    committer1: { name: 'trek' },
    committer2: { name: 'machty' },
    template: compile(
      '{{name}}' +
      '{{#x-alias param=view.committer1 as |name|}}' +
        '[{{name}}' +
        '{{#x-alias param=view.committer2 as |name|}}' +
          '[{{name}}]' +
        '{{/x-alias}}' +
        '{{name}}]' +
      '{{/x-alias}}' +
      '{{name}}' +
      '{{#x-alias param=view.committer2 as |name|}}' +
        '[{{name}}' +
        '{{#x-alias param=view.committer1 as |name|}}' +
          '[{{name}}]' +
        '{{/x-alias}}' +
        '{{name}}]' +
      '{{/x-alias}}' +
      '{{name}}'
    )
  });

  runAppend(view);

  equal(view.$().text(), 'ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

  run(function() {
    view.set('committer1', { name: 'wycats' });
  });

  equal(view.$().text(), 'ebryn[wycats[machty]wycats]ebryn[machty[wycats]machty]ebryn');
});

QUnit.test('#11519 - block param infinite loop', function(assert) {
  // To trigger this case, a component must 1) consume a KeyStream and then yield that KeyStream
  // into a parent light scope.
  registry.register('template:components/block-with-yield', compile('{{danger}} {{yield danger}}'));

  var component;
  registry.register('component:block-with-yield', Component.extend({
    init() {
      component = this;
      return this._super(...arguments);
    },

    danger: 0
  }));

  view = View.create({
    container: container,
    template: compile('{{#block-with-yield as |dangerBlockParam|}} {{/block-with-yield}}')
  });

  // On initial render, create streams. The bug will not have manifested yet, but at this point
  // we have created streams that create a circular invalidation.
  runAppend(view);

  // Trigger a revalidation, which will cause an infinite loop without the fix
  // in place.  Note that we do not see the infinite loop is in testing mode,
  // because a deprecation warning about re-renders is issued, which Ember
  // treats as an exception.
  run(() => { component.set('danger', 1); });

  assert.equal(view.$().text().trim(), '1');
});
