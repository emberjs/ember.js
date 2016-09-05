import { isEmpty } from 'ember-metal';
import ArrayProxy from '../../system/array_proxy';
import { A as emberA } from '../../system/native_array';

QUnit.module('Ember.isEmpty');

QUnit.test('Ember.isEmpty', function() {
  let arrayProxy = ArrayProxy.create({ content: emberA() });

  equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
});
