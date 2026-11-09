import { checkHasSuper } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'checkHasSuper',
  class extends TestCase {
    ['@test does not super wrap needlessly [GH #12462]'](assert) {
      assert.notOk(
        checkHasSuper(function () {}),
        'empty function does not have super'
      );
    }
  }
);
