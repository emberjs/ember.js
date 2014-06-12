import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {get} from 'ember-metal/property_get';

var suite = SuiteModuleBuilder.create();

suite.module('removeObject');

suite.test("should return receiver", function() {
  var before, obj;
  before = this.newFixture(3);
  obj    = this.newObject(before);
  equal(obj.removeObject(before[1]), obj, 'should return receiver');
});

suite.test("[A,B,C].removeObject(B) => [A,C] + notify", function() {
  var obj, before, after, observer;

  before = Ember.A(this.newFixture(3));
  after  = [before[0], before[2]];
  obj = before;
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); // Prime the cache

  obj.removeObject(before[1]);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');

    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
    equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
  }
});

suite.test("[A,B,C].removeObject(D) => [A,B,C]", function() {
  var obj, before, after, observer, item;

  before = Ember.A(this.newFixture(3));
  after  = before;
  item   = this.newFixture(1)[0];
  obj = before;
  observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); // Prime the cache

  obj.removeObject(item); // Note: item not in set

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), false, 'should NOT have notified []');
    equal(observer.validate('length'), false, 'should NOT have notified length');

    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
    equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
  }
});

suite.test('Removing object should notify enumerable observer', function() {
  var fixtures = this.newFixture(3);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = fixtures[1];

  obj.removeObject(item);

  deepEqual(observer._before, [obj, [item], null]);
  deepEqual(observer._after, [obj, [item], null]);
});

export default suite;
