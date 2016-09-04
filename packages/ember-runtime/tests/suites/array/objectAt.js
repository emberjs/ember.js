import { SuiteModuleBuilder } from '../suite';
import { objectAt } from '../../../mixins/array';

const suite = SuiteModuleBuilder.create();

suite.module('objectAt');

suite.test('should return object at specified index', function() {
  let expected = this.newFixture(3);
  let obj      = this.newObject(expected);
  let len      = expected.length;

  for (let idx = 0; idx < len; idx++) {
    equal(objectAt(obj, idx), expected[idx], `obj.objectAt(${idx}) should match`);
  }
});

suite.test('should return undefined when requesting objects beyond index', function() {
  let obj;

  obj = this.newObject(this.newFixture(3));
  equal(objectAt(obj, 5), undefined, 'should return undefined for obj.objectAt(5) when len = 3');

  obj = this.newObject([]);
  equal(objectAt(obj, 0), undefined, 'should return undefined for obj.objectAt(0) when len = 0');
});

export default suite;
