import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('reduce');

suite.test('collects a summary value from an enumeration', function() {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item, index, enumerable) => previousValue + item, 0);
  equal(res, 6);
});

suite.test('passes index of item to callback', function() {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item, index, enumerable) => previousValue + index, 0);
  equal(res, 3);
});

suite.test('passes enumerable object to callback', function() {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item, index, enumerable) => enumerable, 0);
  equal(res, obj);
});

export default suite;
