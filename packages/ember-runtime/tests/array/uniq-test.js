import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class UniqTests extends AbstractTestCase {
  '@test should return new instance with duplicates removed'() {
    let before, after, obj, ret;

    after  = newFixture(3);
    before = [after[0], after[1], after[2], after[1], after[0]];
    obj    = this.newObject(before);
    before = obj.toArray(); // in case of set before will be different...

    ret = obj.uniq();
    this.assert.deepEqual(this.toArray(ret), after, 'should have removed item');
    this.assert.deepEqual(this.toArray(obj), before, 'should not have changed original');
  }

  '@test should return duplicate of same content if no duplicates found'() {
    let item, obj, ret;
    obj = this.newObject(newFixture(3));
    ret = obj.uniq(item);
    this.assert.ok(ret !== obj, 'should not be same object');
    this.assert.deepEqual(this.toArray(ret), this.toArray(obj), 'should be the same content');
  }
}

runArrayTests('uniq', UniqTests);