import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class PushObjectsTests extends AbstractTestCase {
  '@test should raise exception if not Ember.Enumerable is passed to pushObjects'() {
    let obj = this.newObject([]);

    expectDeprecation(() => {
      expectAssertion(() => obj.pushObjects('string'));
    }, /Usage of Ember.Array methods is deprecated/);
  }
}

runArrayTests('pushObjects', PushObjectsTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
