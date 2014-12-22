import {
  registerHandlebarsCompatibleHelper
} from "ember-htmlbars/compat/helper";

import EmberView from "ember-views/views/view";
import Component from "ember-views/views/component";

import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import helpers from "ember-htmlbars/helpers";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
// jscs:disable validateIndentation

QUnit.module('ember-htmlbars: Handlebars compatible helpers', {
  teardown: function() {
    runDestroy(view);

    delete helpers.test;
    delete helpers['view-helper'];
  }
});

test('wraps provided function so that original path params are provided to the helper', function() {
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

test('combines `env` and `options` for the wrapped helper', function() {
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

test('adds `hash` into options `options` for the wrapped helper', function() {
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

test('bound `hash` params are provided with their original paths', function() {
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

test('bound ordered params are provided with their original paths', function() {
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

test('allows unbound usage within an element', function() {
  expect(4);

  function someHelper(param1, param2, options) {
    equal(param1, 'blammo');
    equal(param2, 'blazzico');

    return "class='foo'";
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

test('registering a helper created from `Ember.Handlebars.makeViewHelper` does not double wrap the helper', function() {
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

// jscs:enable validateIndentation
}
