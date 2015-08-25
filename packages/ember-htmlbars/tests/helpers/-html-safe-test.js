/* globals EmberDev */

import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import { Registry } from 'ember-runtime/system/container';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';

import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var component, registry, container, warnings, originalWarn;

QUnit.module('ember-htmlbars: {{-html-safe}} helper', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('helper', { instantiate: false });

    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function(message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  },

  teardown() {
    runDestroy(container);
    runDestroy(component);
    setDebugFunction('warn', originalWarn);
  }
});

QUnit.test('adds the attribute to the element', function() {
  component = Component.create({
    container,

    layout: compile(`<div style={{-html-safe "display: none;"}}></div>`)
  });

  runAppend(component);

  equal(component.$('div').css('display'), 'none', 'attribute was set');
});

if (!EmberDev.runningProdBuild) {
  QUnit.test('no warnings are triggered from setting style attribute', function() {
    component = Component.create({
      container,

      layout: compile(`<div style={{-html-safe "display: none;"}}></div>`)
    });

    runAppend(component);

    deepEqual(warnings, [], 'no warnings were triggered');
  });
}
