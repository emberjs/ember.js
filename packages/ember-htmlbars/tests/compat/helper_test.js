import {
  registerHandlebarsCompatibleHelper
} from 'ember-htmlbars/compat/helper';

import EmberView from 'ember-views/views/view';
import Component from 'ember-views/views/component';

import makeViewHelper from 'ember-htmlbars/system/make-view-helper';
import helpers from 'ember-htmlbars/helpers';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import Registry from 'container/registry';
import ComponentLookup from 'ember-views/component_lookup';
import HandlebarsCompatibleHelper from 'ember-htmlbars/compat/helper';

var view, registry, container;

QUnit.module('ember-htmlbars: compat - Handlebars compatible helpers', {
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

    delete helpers.test;
    delete helpers['view-helper'];
  }
});

QUnit.test('wraps provided function so that original path params are provided to the helper', function() {
  expect(2);

  function someHelper(param1, param2, options) {
    equal(param1, 'blammo');
    equal(param2, 'blazzico');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{test "blammo" "blazzico"}}')
  });

  runAppend(view);
});

QUnit.test('combines `env` and `options` for the wrapped helper', function() {
  expect(1);

  function someHelper(options) {
    equal(options.data.view, view);
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{test}}')
  });

  runAppend(view);
});

QUnit.test('combines `env` and `options` for the wrapped helper', function() {
  expect(1);

  function someHelper(options) {
    equal(options.data.view, view);
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{test}}')
  });

  runAppend(view);
});

QUnit.test('has the correct options.data.view within a components layout', function() {
  expect(1);
  var component;

  registry.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      component = this;
    }
  }));

  registry.register('template:components/foo-bar', compile('{{my-thing}}'));
  registry.register('helper:my-thing', new HandlebarsCompatibleHelper(function(options) {
    equal(options.data.view, component, 'passed in view should match the current component');
  }));

  view = EmberView.create({
    container,
    template: compile('{{foo-bar}}')
  });

  runAppend(view);
});

QUnit.test('adds `hash` into options `options` for the wrapped helper', function() {
  expect(1);

  function someHelper(options) {
    equal(options.hash.bestFriend, 'Jacquie');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{test bestFriend="Jacquie"}}')
  });

  runAppend(view);
});

QUnit.test('bound `hash` params are provided with their original paths', function() {
  expect(1);

  function someHelper(options) {
    equal(options.hash.bestFriend, 'value');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'Jacquie'
    },
    template: compile('{{test bestFriend=value}}')
  });

  runAppend(view);
});

QUnit.test('bound ordered params are provided with their original paths', function() {
  expect(2);

  function someHelper(param1, param2, options) {
    equal(param1, 'first');
    equal(param2, 'second');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      first: 'blammo',
      second: 'blazzico'
    },
    template: compile('{{test first second}}')
  });

  runAppend(view);
});

QUnit.test('allows unbound usage within an element', function() {
  expect(4);

  function someHelper(param1, param2, options) {
    equal(param1, 'blammo');
    equal(param2, 'blazzico');

    return 'class=\'foo\'';
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('<div {{test "blammo" "blazzico"}}>Bar</div>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Returning a string of attributes from a helper inside an element is deprecated.');

  equal(view.$('.foo').length, 1, 'class attribute was added by helper');
});

QUnit.test('registering a helper created from `Ember.Handlebars.makeViewHelper` does not double wrap the helper', function() {
  expect(1);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });

  var helper = makeViewHelper(ViewHelperComponent);
  registerHandlebarsCompatibleHelper('view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});

QUnit.test('makes helpful assertion when called with invalid arguments', function() {
  expect(1);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });

  ViewHelperComponent.toString = function() { return 'Some Random Class'; };

  var helper = makeViewHelper(ViewHelperComponent);
  registerHandlebarsCompatibleHelper('view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper "hello"}}')
  }).create();

  expectAssertion(function() {
    runAppend(view);
  }, 'You can only pass attributes (such as name=value) not bare values to a helper for a View found in \'Some Random Class\'');
});

QUnit.test('does not add `options.fn` if no block was specified', function() {
  expect(1);

  function someHelper(options) {
    ok(!options.fn, '`options.fn` is not present when block is not specified');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{test}}')
  });

  runAppend(view);
});

QUnit.test('does not return helper result if block was specified', function() {
  expect(1);

  function someHelper(options) {
    return 'asdf';
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{#test}}lkj;{{/test}}')
  });

  runAppend(view);

  equal(view.$().text(), '');
});

QUnit.test('allows usage of the template fn', function() {
  expect(1);

  function someHelper(options) {
    options.fn();
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{#test}}{{value}}{{/test}}')
  });

  runAppend(view);

  equal(view.$().text(), 'foo');
});

QUnit.test('allows usage of the template inverse', function() {
  expect(1);

  function someHelper(options) {
    options.inverse();
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'foo'
    },
    template: compile('{{#test}}Nothing to see here.{{else}}{{value}}{{/test}}')
  });

  runAppend(view);

  equal(view.$().text(), 'foo');
});

QUnit.test('ordered param types are added to options.types', function() {
  expect(3);

  function someHelper(param1, param2, param3, options) {
    equal(options.types[0], 'NUMBER');
    equal(options.types[1], 'ID');
    equal(options.types[2], 'STRING');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      first: 'blammo',
      second: 'blazzico'
    },
    template: compile('{{test 1 two "3"}}')
  });

  runAppend(view);
});

QUnit.test('`hash` params are to options.hashTypes', function() {
  expect(3);

  function someHelper(options) {
    equal(options.hashTypes.string, 'STRING');
    equal(options.hashTypes.number, 'NUMBER');
    equal(options.hashTypes.id, 'ID');
  }

  registerHandlebarsCompatibleHelper('test', someHelper);

  view = EmberView.create({
    controller: {
      value: 'Jacquie'
    },
    template: compile('{{test string="foo" number=42 id=someBoundThing}}')
  });

  runAppend(view);
});
