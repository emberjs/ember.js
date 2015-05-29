import EmberView from "ember-views/views/view";
import helpers from "ember-htmlbars/helpers";
import {
  registerHelper
} from "ember-htmlbars/helpers";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";

var view;

QUnit.module('ember-htmlbars: element hook', {
  teardown() {
    runDestroy(view);
    delete helpers.test;
  }
});

QUnit.test('allows unbound usage within an element', function() {
  expect(4);

  function someHelper(params, hash, options, env) {
    equal(params[0], 'blammo');
    equal(params[1], 'blazzico');

    return "class='foo'";
  }

  registerHelper('test', someHelper);

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

QUnit.test('allows unbound usage within an element from property', function() {
  expect(2);

  view = EmberView.create({
    controller: {
      someProp: 'class="foo"'
    },
    template: compile('<div {{someProp}}>Bar</div>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Returning a string of attributes from a helper inside an element is deprecated.');

  equal(view.$('.foo').length, 1, 'class attribute was added by helper');
});

QUnit.test('allows unbound usage within an element creating multiple attributes', function() {
  expect(2);

  view = EmberView.create({
    controller: {
      someProp: 'class="foo" data-foo="bar"'
    },
    template: compile('<div {{someProp}}>Bar</div>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Returning a string of attributes from a helper inside an element is deprecated.');

  equal(view.$('.foo[data-foo="bar"]').length, 1, 'attributes added by helper');
});

QUnit.test('allows unbound usage within an element creating multiple attributes with spaces #11243', function() {
  expect(2);

  view = EmberView.create({
    controller: {
      someProp: 'class="foo" data-foo="bar baz biff"'
    },
    template: compile('<div {{someProp}}>Bar</div>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Returning a string of attributes from a helper inside an element is deprecated.');

  equal(view.$('.foo').attr('data-foo'), 'bar baz biff', 'attributes added by helper');
});
