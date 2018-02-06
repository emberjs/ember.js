import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('objectAt');

suite.test('should return object at specified index', function(assert) {
  let expected = this.newFixture(3);
  let obj      = this.newObject(expected);
  let len      = expected.length;

  for (let idx = 0; idx < len; idx++) {
    assert.equal(obj.objectAt(idx), expected[idx], `obj.objectAt(${idx}) should match`);
  }
});

suite.test('should return undefined when requesting objects beyond index', function(assert) {
  let obj;

  obj = this.newObject(this.newFixture(3));
  assert.equal(obj.objectAt(obj, 5), undefined, 'should return undefined for obj.objectAt(5) when len = 3');

  obj = this.newObject([]);
  assert.equal(obj.objectAt(obj, 0), undefined, 'should return undefined for obj.objectAt(0) when len = 0');
});

export default suite;
