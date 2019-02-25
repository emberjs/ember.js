import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class CopyTest extends AbstractTestCase {
  '@test should return an equivalent copy'() {
    let obj = this.newObject();
    let copy = obj.copy();
    this.assert.ok(this.isEqual(obj, copy), 'old object and new object should be equivalent');
  }
}

runArrayTests('copy', CopyTest, 'CopyableNativeArray', 'CopyableArray');
