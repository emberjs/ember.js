import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class IncludesTests extends AbstractTestCase {
  '@test includes returns correct value if startAt is positive'() {
    let data = newFixture(3);
    let obj = this.newObject(data);

    this.assert.equal(obj.includes(data[1], 1), true, 'should return true if included');
    this.assert.equal(obj.includes(data[0], 1), false, 'should return false if not included');
  }

  '@test includes returns correct value if startAt is negative'() {
    let data = newFixture(3);
    let obj = this.newObject(data);

    this.assert.equal(obj.includes(data[1], -2), true, 'should return true if included');
    this.assert.equal(obj.includes(data[0], -2), false, 'should return false if not included');
  }

  '@test includes returns true if startAt + length is still negative'() {
    let data = newFixture(1);
    let obj = this.newObject(data);

    this.assert.equal(obj.includes(data[0], -2), true, 'should return true if included');
    this.assert.equal(
      obj.includes(newFixture(1), -2),
      false,
      'should return false if not included'
    );
  }

  '@test includes returns false if startAt out of bounds'() {
    let data = newFixture(1);
    let obj = this.newObject(data);

    this.assert.equal(obj.includes(data[0], 2), false, 'should return false if startAt >= length');
    this.assert.equal(
      obj.includes(newFixture(1), 2),
      false,
      'should return false if startAt >= length'
    );
  }
}

runArrayTests('includes', IncludesTests);
