import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('reduce');

suite.test('collects a summary value from an enumeration', function(assert) {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item) => previousValue + item, 0);
  assert.equal(res, 6);
});

suite.test('passes index of item to callback', function(assert) {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item, index) => previousValue + index, 0);
  assert.equal(res, 3);
});

suite.test('passes enumerable object to callback', function(assert) {
  let obj = this.newObject([1, 2, 3]);
  let res = obj.reduce((previousValue, item, index, enumerable) => enumerable, 0);
  assert.equal(res, obj);
});

export default suite;
