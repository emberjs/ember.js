import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('uniq');

suite.test('should return new instance with duplicates removed', function() {
  let before, after, obj, ret;

  after  = this.newFixture(3);
  before = [after[0], after[1], after[2], after[1], after[0]];
  obj    = this.newObject(before);
  before = obj.toArray(); // in case of set before will be different...

  ret = obj.uniq();
  deepEqual(this.toArray(ret), after, 'should have removed item');
  deepEqual(this.toArray(obj), before, 'should not have changed original');
});

suite.test('should return duplicate of same content if no duplicates found', function() {
  let item, obj, ret;
  obj = this.newObject(this.newFixture(3));
  ret = obj.uniq(item);
  ok(ret !== obj, 'should not be same object');
  deepEqual(this.toArray(ret), this.toArray(obj), 'should be the same content');
});

export default suite;
