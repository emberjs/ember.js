/* globals EmberDev */

import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import Component from 'ember-views/views/view';
import { SafeString } from 'ember-htmlbars/utils/string';
import { styleWarning } from 'ember-htmlbars/morphs/attr-morph';
import { moduleForComponent, test } from 'ember-qunit';

var originalWarn, warnings;

moduleForComponent('ember-htmlbars: style attribute', {
  integration: true,

  setup() {
    warnings = [];
    originalWarn = getDebugFunction('warn');
    setDebugFunction('warn', function(message, test) {
      if (!test) {
        warnings.push(message);
      }
    });
  },

  teardown() {
    setDebugFunction('warn', originalWarn);
  }
});

if (!EmberDev.runningProdBuild) {
  test('specifying `<div style={{userValue}}></div>` generates a warning', function(assert) {
    this.set('userValue', 'width: 42px');

    this.render('<div style={{view.userValue}}></div>');

    assert.deepEqual(warnings, [styleWarning]);
  });

  test('specifying `attributeBindings: ["style"]` generates a warning', function(assert) {
    this.set('userValue', 'width: 42px');

    this.registry.register('component:foo-bar', Component.extend({
      attributeBindings: ['style'],
      style: 'width: 42px'
    }));

    this.render('{{foo-bar}}');

    assert.deepEqual(warnings, [styleWarning]);
  });
}

test('specifying `<div style={{{userValue}}}></div>` works properly without a warning', function(assert) {
  this.set('userValue', 'width: 42px');

  this.render('<div style={{{userValue}}}></div>');

  assert.deepEqual(warnings, [ ]);
});

test('specifying `<div style={{userValue}}></div>` works properly with a SafeString', function(assert) {
  this.set('userValue', new SafeString('width: 42px'));

  this.render('<div style={{userValue}}></div>');

  assert.deepEqual(warnings, [ ]);
});
