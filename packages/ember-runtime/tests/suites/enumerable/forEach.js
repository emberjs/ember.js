import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {get} from 'ember-metal/property_get';
import {guidFor} from 'ember-metal/utils';

var suite = SuiteModuleBuilder.create();

suite.module('forEach');

suite.test('forEach should iterate over list', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');
});


suite.test('forEach should iterate over list after mutation', function() {
  if (get(this, 'canTestMutation')) {
    expect(0);
    return;
  }

  var obj = this.newObject();
  var ary = this.toArray(obj);
  var found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');

  this.mutate(obj);
  ary = this.toArray(obj);
  found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');
});

suite.test('2nd target parameter', function() {
  var obj = this.newObject();
  var target = this;

  obj.forEach(function() {
    // ES6TODO: When transpiled we will end up with "use strict" which disables automatically binding to the global context.
    // Therefore, the following test can never pass in strict mode unless we modify the `map` function implementation to
    // use `Ember.lookup` if target is not specified.
    //
    // equal(guidFor(this), guidFor(global), 'should pass the global object as this if no context');
  });

  obj.forEach(function() {
    equal(guidFor(this), guidFor(target), 'should pass target as this if context');
  }, target);
});


suite.test('callback params', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);
  var loc = 0;


  obj.forEach(function(item, idx, enumerable) {
    equal(item, ary[loc], 'item param');
    equal(idx, loc, 'idx param');
    equal(guidFor(enumerable), guidFor(obj), 'enumerable param');
    loc++;
  });
});

export default suite;
