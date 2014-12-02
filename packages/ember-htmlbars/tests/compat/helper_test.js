import {
  registerHandlebarsCompatibleHelper
} from "ember-htmlbars/compat/helper";

import EmberView from "ember-views/views/view";

import helpers from "ember-htmlbars/helpers";
import compile from "ember-htmlbars/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

QUnit.module('ember-htmlbars: Handlebars compatible helpers', {
  teardown: function() {
    runDestroy(view);

    delete helpers.test;
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

}
