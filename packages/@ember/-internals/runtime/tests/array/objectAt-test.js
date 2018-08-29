import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class ObjectAtTests extends AbstractTestCase {
  '@test should return object at specified index'() {
    let expected = newFixture(3);
    let obj = this.newObject(expected);
    let len = expected.length;

    for (let idx = 0; idx < len; idx++) {
      this.assert.equal(obj.objectAt(idx), expected[idx], `obj.objectAt(${idx}) should match`);
    }
  }

  '@test should return undefined when requesting objects beyond index'() {
    let obj;

    obj = this.newObject(newFixture(3));
    this.assert.equal(
      obj.objectAt(obj, 5),
      undefined,
      'should return undefined for obj.objectAt(5) when len = 3'
    );

    obj = this.newObject([]);
    this.assert.equal(
      obj.objectAt(obj, 0),
      undefined,
      'should return undefined for obj.objectAt(0) when len = 0'
    );
  }
}

runArrayTests('objectAt', ObjectAtTests);
