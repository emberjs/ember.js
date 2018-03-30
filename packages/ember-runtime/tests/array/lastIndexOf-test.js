import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class LastIndexOfTests extends AbstractTestCase {
  "@test should return index of object's last occurrence"() {
    let expected = newFixture(3);
    let obj = this.newObject(expected);
    let len = 3;

    for (let idx = 0; idx < len; idx++) {
      this.assert.equal(
        obj.lastIndexOf(expected[idx]),
        idx,
        `obj.lastIndexOf(${expected[idx]}) should match idx`
      );
    }
  }

  "@test should return index of object's last occurrence even startAt search location is equal to length"() {
    let expected = newFixture(3);
    let obj = this.newObject(expected);
    let len = 3;

    for (let idx = 0; idx < len; idx++) {
      this.assert.equal(
        obj.lastIndexOf(expected[idx], len),
        idx,
        `obj.lastIndexOfs(${expected[idx]}) should match idx`
      );
    }
  }

  "@test should return index of object's last occurrence even startAt search location is greater than length"() {
    let expected = newFixture(3);
    let obj = this.newObject(expected);
    let len = 3;

    for (let idx = 0; idx < len; idx++) {
      this.assert.equal(
        obj.lastIndexOf(expected[idx], len + 1),
        idx,
        `obj.lastIndexOf(${expected[idx]}) should match idx`
      );
    }
  }

  '@test should return -1 when no match is found'() {
    let obj = this.newObject(newFixture(3));
    let foo = {};

    this.assert.equal(
      obj.lastIndexOf(foo),
      -1,
      'obj.lastIndexOf(foo) should be -1'
    );
  }

  '@test should return -1 when no match is found even startAt search location is equal to length'() {
    let obj = this.newObject(newFixture(3));
    let foo = {};

    this.assert.equal(
      obj.lastIndexOf(foo, get(obj, 'length')),
      -1,
      'obj.lastIndexOf(foo) should be -1'
    );
  }

  '@test should return -1 when no match is found even startAt search location is greater than length'() {
    let obj = this.newObject(newFixture(3));
    let foo = {};

    this.assert.equal(
      obj.lastIndexOf(foo, get(obj, 'length') + 1),
      -1,
      'obj.lastIndexOf(foo) should be -1'
    );
  }
}

runArrayTests('lastIndexOf', LastIndexOfTests);
