import { generateGuid } from 'ember-metal/utils';

QUnit.module('Ember.generateGuid');

QUnit.test('Prefix', function() {
  let a = {};

  ok(generateGuid(a, 'tyrell').indexOf('tyrell') > -1, 'guid can be prefixed');
});
