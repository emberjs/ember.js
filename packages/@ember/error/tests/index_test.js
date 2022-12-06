import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Error Throwing',
  class extends TestCase {
    ['@test new EmberError displays provided message'](assert) {
      assert.throws(
        () => {
          throw new Error('A Message');
        },
        function (e) {
          return e.message === 'A Message';
        },
        'the assigned message was displayed'
      );
    }
  }
);
