import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('toArray');

suite.test('toArray should convert to an array', function() {
  let obj = this.newObject();
  deepEqual(obj.toArray(), this.toArray(obj));
});

export default suite;
