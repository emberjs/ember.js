import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('mapBy');

suite.test('get value of each property', function(assert) {
  let obj = this.newObject([{ a: 1 }, { a: 2 }]);
  assert.equal(obj.mapBy('a').join(''), '12');
});

suite.test('should work also through getEach alias', function(assert) {
  let obj = this.newObject([{ a: 1 }, { a: 2 }]);
  assert.equal(obj.getEach('a').join(''), '12');
});

export default suite;
