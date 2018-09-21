import { generateGuid } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.generateGuid',
  class extends TestCase {
    ['@test Prefix'](assert) {
      let a = {};

      assert.ok(generateGuid(a, 'tyrell').indexOf('tyrell') > -1, 'guid can be prefixed');
    }
  }
);
