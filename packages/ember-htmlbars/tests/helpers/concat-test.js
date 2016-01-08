import run from 'ember-metal/run_loop';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import { helper as makeHelper } from 'ember-htmlbars/helper';

import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var component, owner;

QUnit.module('ember-htmlbars: {{concat}} helper', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('helper', { instantiate: false });
  },

  teardown() {
    runDestroy(owner);
    runDestroy(component);
  }
});

QUnit.test('concats provided params', function() {
  component = Component.create({
    [OWNER]: owner,
    layout: compile(`{{concat "foo" " " "bar" " " "baz"}}`)
  });

  runAppend(component);

  equal(component.$().text(), 'foo bar baz');
});

QUnit.test('updates for bound params', function() {
  component = Component.create({
    [OWNER]: owner,
    firstParam: 'one',
    secondParam: 'two',
    layout: compile(`{{concat firstParam secondParam}}`)
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
  owner.register('helper:x-eq', makeHelper(eq));

  component = Component.create({
    [OWNER]: owner,
    firstParam: 'one',
    secondParam: 'two',

    layout: compile(`{{#if (x-eq (concat firstParam secondParam) "onetwo")}}Truthy!{{else}}False{{/if}}`)
  });

  runAppend(component);

  equal(component.$().text(), 'Truthy!');

  run(function() {
    component.set('firstParam', 'three');
  });

  equal(component.$().text(), 'False');
});
