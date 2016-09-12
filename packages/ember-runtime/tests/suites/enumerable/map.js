import { guidFor } from 'ember-utils';
import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('map');

const mapFunc = item => item ? item.toString() : null;

suite.test('map should iterate over list', function() {
  let obj = this.newObject();
  let ary = this.toArray(obj).map(mapFunc);
  let found = [];

  found = obj.map(mapFunc);
  deepEqual(found, ary, 'mapped arrays should match');
});


suite.test('map should iterate over list after mutation', function() {
  if (get(this, 'canTestMutation')) {
    expect(0);
    return;
  }

  let obj = this.newObject();
  let ary = this.toArray(obj).map(mapFunc);
  let found;

  found = obj.map(mapFunc);
  deepEqual(found, ary, 'items passed during forEach should match');

  this.mutate(obj);
  ary = this.toArray(obj).map(mapFunc);
  found = obj.map(mapFunc);
  deepEqual(found, ary, 'items passed during forEach should match');
});

suite.test('2nd target parameter', function() {
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
    equal(guidFor(this), guidFor(target), 'should pass target as this if context');
  }, target);
});


suite.test('callback params', function() {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let loc = 0;

  obj.map((item, idx, enumerable) => {
    equal(item, ary[loc], 'item param');
    equal(idx, loc, 'idx param');
    equal(guidFor(enumerable), guidFor(obj), 'enumerable param');
    loc++;
  });
});

export default suite;
