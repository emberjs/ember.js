import { guidFor } from '@ember/-internals/utils';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';
import { get } from '@ember/-internals/metal';

const mapFunc = item => (item ? item.toString() : null);

class MapTests extends AbstractTestCase {
  '@test map should iterate over list'() {
    let obj = this.newObject();
    let ary = this.toArray(obj).map(mapFunc);
    let found = [];

    found = obj.map(mapFunc);
    this.assert.deepEqual(found, ary, 'mapped arrays should match');
  }

  '@test map should iterate over list after mutation'() {
    if (get(this, 'canTestMutation')) {
      this.assert.expect(0);
      return;
    }

    let obj = this.newObject();
    let ary = this.toArray(obj).map(mapFunc);
    let found;

    found = obj.map(mapFunc);
    this.assert.deepEqual(found, ary, 'items passed during forEach should match');

    this.mutate(obj);
    ary = this.toArray(obj).map(mapFunc);
    found = obj.map(mapFunc);
    this.assert.deepEqual(found, ary, 'items passed during forEach should match');
  }

  '@test 2nd target parameter'() {
    let obj = this.newObject();
    let target = this;

    obj.map(() => {
      // ES6TODO: When transpiled we will end up with "use strict" which disables automatically binding to the global context.
      // Therefore, the following test can never pass in strict mode unless we modify the `map` function implementation to
      // use `Ember.lookup` if target is not specified.
      //
      // equal(guidFor(this), guidFor(global), 'should pass the global object as this if no context');
    });

    obj.map(() => {
      this.assert.equal(guidFor(this), guidFor(target), 'should pass target as this if context');
    }, target);
  }

  '@test callback params'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let loc = 0;

    obj.map((item, idx, enumerable) => {
      this.assert.equal(item, ary[loc], 'item param');
      this.assert.equal(idx, loc, 'idx param');
      this.assert.equal(guidFor(enumerable), guidFor(obj), 'enumerable param');
      loc++;
    });
  }
}

runArrayTests('map', MapTests);
