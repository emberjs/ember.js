import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class WithoutTests extends AbstractTestCase {
  '@test should return new instance with item removed'() {
    let before, after, obj, ret;

    before = newFixture(3);
    after = [before[0], before[2]];
    obj = this.newObject(before);

    expectDeprecation(() => {
      ret = obj.without(before[1]);
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.deepEqual(this.toArray(ret), after, 'should have removed item');
    this.assert.deepEqual(this.toArray(obj), before, 'should not have changed original');
  }

  '@test should remove NaN value'() {
    let before, after, obj, ret;

    before = [...newFixture(2), NaN];
    after = [before[0], before[1]];
    obj = this.newObject(before);

    expectDeprecation(() => {
      ret = obj.without(NaN);
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.deepEqual(this.toArray(ret), after, 'should have removed item');
  }

  '@test should return same instance if object not found'() {
    let item, obj, ret;

    item = newFixture(1)[0];
    obj = this.newObject(newFixture(3));

    expectDeprecation(() => {
      ret = obj.without(item);
    }, /Usage of Ember.Array methods is deprecated/);

    this.assert.equal(ret, obj, 'should be same instance');
  }
}

runArrayTests('without', WithoutTests);
