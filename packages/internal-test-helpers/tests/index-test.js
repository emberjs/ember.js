import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'internal-test-helpers',
  class extends AbstractTestCase {
    ['@test module present'](assert) {
      assert.ok(
        true,
        'each package needs at least one test to be able to run through `npm test`'
      );
    }
  }
);
