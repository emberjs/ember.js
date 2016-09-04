import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('copy');

suite.test('should return an equivalent copy', function() {
  let obj = this.newObject();
  let copy = obj.copy();
  ok(this.isEqual(obj, copy), 'old object and new object should be equivalent');
});

export default suite;
