import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class PushObjectsTests extends AbstractTestCase {
  '@test should raise exception if not Ember.Enumerable is passed to pushObjects'() {
    let obj = this.newObject([]);

    expectAssertion(() => obj.pushObjects('string'));
  }
}

runArrayTests('pushObjects', PushObjectsTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
