import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('without');

suite.test('should return new instance with item removed', function() {
  let before, after, obj, ret;

  before = this.newFixture(3);
  after  = [before[0], before[2]];
  obj    = this.newObject(before);

  ret = obj.without(before[1]);
  deepEqual(this.toArray(ret), after, 'should have removed item');
  deepEqual(this.toArray(obj), before, 'should not have changed original');
});

suite.test('should remove NaN value', function() {
  let before, after, obj, ret;

  before = [...this.newFixture(2), NaN];
  after  = [before[0], before[1]];
  obj    = this.newObject(before);

  ret = obj.without(NaN);
  deepEqual(this.toArray(ret), after, 'should have removed item');
});

suite.test('should return same instance if object not found', function() {
  let item, obj, ret;

  item   = this.newFixture(1)[0];
  obj    = this.newObject(this.newFixture(3));

  ret = obj.without(item);
  equal(ret, obj, 'should be same instance');
});

export default suite;
