import Ember from 'ember-metal/core';
import { SuiteModuleBuilder } from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('unshiftObjects');

suite.test('returns receiver', function() {
  var obj = this.newObject([]);
  var items = this.newFixture(3);
  equal(obj.unshiftObjects(items), obj, 'should return receiver');
});

suite.test('[].unshiftObjects([A,B,C]) => [A,B,C] + notify', function() {
  var obj, before, items, observer;

  before = [];
  items = this.newFixture(3);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), items, 'post item results');
  equal(Ember.get(obj, 'length'), items.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].unshiftObjects([X,Y]) => [X,Y,A,B,C] + notify', function() {
  var obj, before, items, after, observer;

  before = this.newFixture(3);
  items  = this.newFixture(2);
  after  = items.concat(before);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[A,B,C].unshiftObjects([A,B]) => [A,B,A,B,C] + notify', function() {
  var obj, before, after, items, observer;

  before = this.newFixture(3);
  items = [before[0], before[1]]; // note same object as current head. should end up twice
  after  = items.concat(before);
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObjects(items);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

export default suite;
