import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class ReplaceTests extends AbstractTestCase {
  async "@test [].replace(0,0,'X') => ['X'] + notify"() {
    let exp = newFixture(1);
    let obj = this.newObject([]);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(0, 0, exp);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), exp, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject once'
    );
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [].replace(0,0,"X") => ["X"] + avoid calling objectAt and notifying fistObject/lastObject when not in cache'() {
    let obj, exp, observer;
    let called = 0;
    exp = newFixture(1);
    obj = this.newObject([]);
    obj.objectAt = function () {
      called++;
    };
    observer = this.newObserver(obj, 'firstObject', 'lastObject');

    obj.replace(0, 0, exp);

    // flush observers
    await runLoopSettled();

    this.assert.equal(
      called,
      0,
      'should NOT have called objectAt upon replace when firstObject/lastObject are not cached'
    );
    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject since not cached'
    );
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject since not cached'
    );

    obj.destroy();
  }

  async '@test [A,B,C,D].replace(1,2,X) => [A,X,D] + notify'() {
    let before = newFixture(4);
    let replace = newFixture(1);
    let after = [before[0], replace[0], before[3]];

    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(1, 2, replace);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [A,B,C,D].replace(1,2,[X,Y]) => [A,X,Y,D] + notify'() {
    let before = newFixture(4);
    let replace = newFixture(2);
    let after = [before[0], replace[0], replace[1], before[3]];

    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(1, 2, replace);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.validate('length'), false, 'should NOT have notified length');

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [A,B].replace(1,0,[X,Y]) => [A,X,Y,B] + notify'() {
    let before = newFixture(2);
    let replace = newFixture(2);
    let after = [before[0], replace[0], replace[1], before[1]];

    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(1, 0, replace);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [A,B,C,D].replace(2,2) => [A,B] + notify'() {
    let before = newFixture(4);
    let after = [before[0], before[1]];

    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(2, 2);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );

    obj.destroy();
  }

  async '@test [A,B,C,D].replace(-1,1) => [A,B,C] + notify'() {
    let before = newFixture(4);
    let after = [before[0], before[1], before[2]];

    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.replace(-1, 1);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );

    obj.destroy();
  }

  async '@test Adding object should notify array observer (internal)'() {
    let fixtures = newFixture(4);
    let obj = this.newObject(fixtures);
    let observer = this.newObserver(obj).observeArray(obj);
    let item = newFixture(1)[0];

    obj.replace(2, 2, [item]);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(observer._before, [obj, 2, 2, 1], 'before');
    this.assert.deepEqual(observer._after, [obj, 2, 2, 1], 'after');

    obj.destroy();
  }
}

runArrayTests('replace', ReplaceTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
