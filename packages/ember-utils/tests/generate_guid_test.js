import { generateGuid } from '../index';

QUnit.module('Ember.generateGuid');

QUnit.test('Prefix', function() {
  let a = {};

  ok(generateGuid(a, 'tyrell').indexOf('tyrell') > -1, 'guid can be prefixed');
});
