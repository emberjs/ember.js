import isEmpty from 'ember-metal/is_empty';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import { A as emberA } from 'ember-runtime/system/native_array';

QUnit.module('Ember.isEmpty');

QUnit.test('Ember.isEmpty', function() {
  var arrayProxy;
  expectDeprecation(function() {
    arrayProxy = ArrayProxy.create({
      content: emberA([])
    });
  }, '`Ember.ArrayProxy` is deprecated and will be removed in a future release.');

  equal(true, isEmpty(arrayProxy), 'for an ArrayProxy that has empty content');
});
