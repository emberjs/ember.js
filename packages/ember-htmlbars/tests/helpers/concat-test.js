import run from "ember-metal/run_loop";
import { Registry } from "ember-runtime/system/container";
import Component from "ember-views/views/component";
import compile from "ember-template-compiler/system/compile";

import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var component, registry, container;

QUnit.module("ember-htmlbars: {{concat}} helper", {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('helper', { instantiate: false });
  },

  teardown() {
    runDestroy(container);
    runDestroy(component);
  }
});

QUnit.test('concats provided params', function() {
  component = Component.create({
    container,

    template: compile(`{{concat "foo" " " "bar" " " "baz"}}`)
  });

  runAppend(component);

  equal(component.$().text(), 'foo bar baz');
});

QUnit.test('updates for bound params', function() {
  component = Component.create({
    container,

    firstParam: 'one',
    secondParam: 'two',

    template: compile(`{{concat firstParam secondParam}}`)
  });

  runAppend(component);

  equal(component.$().text(), 'onetwo');

  run(function() {
    component.set('firstParam', 'three');
  });

  equal(component.$().text(), 'threetwo');

  run(function() {
    component.set('secondParam', 'four');
  });

  equal(component.$().text(), 'threefour');
});

QUnit.test('can be used as a sub-expression', function() {
  function eq([ actual, expected ]) {
    return actual === expected;
  }
  eq.isHTMLBars = true;
  registry.register('helper:x-eq', eq);

  component = Component.create({
    container,

    firstParam: 'one',
    secondParam: 'two',

    template: compile(`{{#if (x-eq (concat firstParam secondParam) "onetwo")}}Truthy!{{else}}False{{/if}}`)
  });

  runAppend(component);

  equal(component.$().text(), 'Truthy!');

  run(function() {
    component.set('firstParam', 'three');
  });

  equal(component.$().text(), 'False');
});
