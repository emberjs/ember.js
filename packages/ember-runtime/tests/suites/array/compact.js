import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('compact');

suite.test('removes null and undefined values from enumerable', function() {
  let obj = this.newObject([null, 1, false, '', undefined, 0, null]);
  let ary = obj.compact();
  deepEqual(ary, [1, false, '', 0]);
});

export default suite;
