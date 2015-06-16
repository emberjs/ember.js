import Ember from 'ember-metal/core';
import isEmpty from 'ember-metal/is_empty';
import ArrayProxy from 'ember-runtime/system/array_proxy';

QUnit.module('Ember.isEmpty');

QUnit.test('Ember.isEmpty', function() {
  var arrayProxy = ArrayProxy.create({ content: Ember.A() });

  equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
});
