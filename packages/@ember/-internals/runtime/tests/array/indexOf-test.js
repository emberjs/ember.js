import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class IndexOfTests extends AbstractTestCase {
  '@test should return index of object'() {
    let expected = newFixture(3);
    let obj = this.newObject(expected);
    let len = 3;

    for (let idx = 0; idx < len; idx++) {
      this.assert.equal(
        obj.indexOf(expected[idx]),
        idx,
        `obj.indexOf(${expected[idx]}) should match idx`
      );
    }
  }

  '@test should return -1 when requesting object not in index'() {
    let obj = this.newObject(newFixture(3));
    let foo = {};

    this.assert.equal(obj.indexOf(foo), -1, 'obj.indexOf(foo) should be < 0');
  }
}

runArrayTests('indexOf', IndexOfTests);
