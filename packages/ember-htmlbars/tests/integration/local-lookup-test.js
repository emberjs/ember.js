import isEnabled from 'ember-metal/features';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import { helper } from 'ember-htmlbars/helper';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

function buildResolver() {
  let resolver = {
    resolve() { },
    expandLocalLookup(fullName, sourceFullName) {
      let [sourceType, sourceName ] = sourceFullName.split(':');
      let [type, name ] = fullName.split(':');

      if (type !== 'template' && sourceType === 'template' && sourceName.slice(0, 11) === 'components/') {
        sourceName = sourceName.slice(11);
      }

      if (type === 'template' && sourceType === 'template' && name.slice(0, 11) === 'components/') {
        name = name.slice(11);
      }


      let result = `${type}:${sourceName}/${name}`;

      return result;
    }
  };

  return resolver;
}

function commonSetup() {
  owner = buildOwner({
    _registryOptions: {
      resolver: buildResolver()
    }
  });
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('view', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(view);
  runDestroy(owner);
  owner = view = null;
}

function appendViewFor(template, moduleName='', hash={}) {
  let view = EmberView.extend({
    template: compile(template, { moduleName }),
    [OWNER]: owner
  }).create(hash);

  runAppend(view);

  return view;
}

function registerTemplate(moduleName, snippet) {
  owner.register(`template:${moduleName}`, compile(snippet, { moduleName }));
}

function registerComponent(name, factory) {
  owner.register(`component:${name}`, factory);
}

function registerHelper(name, helper) {
  owner.register(`helper:${name}`, helper);
}

if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('component - local lookup', {
  setup() {
    commonSetup();
  },

  teardown() {
    commonTeardown();
  }
});

if (isEnabled('ember-htmlbars-local-lookup')) {
  // jscs:disable validateIndentation

QUnit.test('local component lookup with matching template', function() {
  expect(1);

  registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');
  registerTemplate('components/x-outer/x-inner', 'Nested template says: {{yield}}');

  view = appendViewFor(`{{x-outer}}`, 'route-template');

  equal(view.$().text(), 'Nested template says: Hi!');
});

QUnit.test('local component lookup with matching component', function() {
  expect(1);

  registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');
  registerComponent('x-outer/x-inner', Component.extend({
    tagName: 'span'
  }));

  view = appendViewFor(`{{x-outer}}`, 'route-template');

  equal(view.$('span').text(), 'Hi!');
});

QUnit.test('local helper lookup', function() {
  expect(1);

  registerTemplate('components/x-outer', 'Who dat? {{x-helper}}');
  registerHelper('x-outer/x-helper', helper(() => {
    return 'Who dis?';
  }));

  view = appendViewFor(`{{x-outer}}`, 'route-template');

  equal(view.$().text(), 'Who dat? Who dis?');
});

QUnit.test('local helper lookup overrides global lookup', function() {
  expect(1);

  registerTemplate('components/x-outer', 'Who dat? {{x-helper}}');
  registerHelper('x-outer/x-helper', helper(() => 'Who dis?'));
  registerHelper('x-helper', helper(() => 'I dunno'));

  view = appendViewFor(`{{x-outer}} {{x-helper}}`, 'route-template');

  equal(view.$().text(), 'Who dat? Who dis? I dunno');
});

QUnit.test('lookup without match issues standard assertion (with local helper name)', function() {
  expect(1);

  registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');

  expectAssertion(function() {
    appendViewFor(`{{x-outer}}`, 'route-template');
  }, /A helper named 'x-inner' could not be found/);
});

QUnit.test('local lookup overrides global lookup', function() {
  expect(1);

  registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');
  registerTemplate('components/x-outer/x-inner', 'Nested template says (from local): {{yield}}');
  registerTemplate('components/x-inner', 'Nested template says (from global): {{yield}}');

  view = appendViewFor(`{{#x-inner}}Hi!{{/x-inner}} {{x-outer}} {{#x-outer/x-inner}}Hi!{{/x-outer/x-inner}}`, 'route-template');

  equal(view.$().text(), 'Nested template says (from global): Hi! Nested template says (from local): Hi! Nested template says (from local): Hi!');
});
} else {
  QUnit.test('lookup with both global and local match uses specifically invoked component', function() {
    expect(1);

    registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');
    registerTemplate('components/x-outer/x-inner', 'Nested template says (from local): {{yield}}');
    registerTemplate('components/x-inner', 'Nested template says (from global): {{yield}}');

    view = appendViewFor(`{{#x-inner}}Hi!{{/x-inner}} {{x-outer}} {{#x-outer/x-inner}}Hi!{{/x-outer/x-inner}}`, 'route-template');

    equal(view.$().text(), 'Nested template says (from global): Hi! Nested template says (from global): Hi! Nested template says (from local): Hi!');
  });
}

}
