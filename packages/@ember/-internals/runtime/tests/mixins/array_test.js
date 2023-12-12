import {
  objectAt,
  addObserver,
  addArrayObserver,
  removeArrayObserver,
  arrayContentDidChange,
  arrayContentWillChange,
} from '@ember/-internals/metal';
import EmberObject, { get, set, computed, observer as emberObserver } from '@ember/object';
import EmberArray, { A as emberA } from '@ember/array';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
const TestArray = EmberObject.extend(EmberArray, {
  _content: null,

  init() {
    this._content = this._content || [];
  },

  // some methods to modify the array so we can test changes.  Note that
  // arrays can be modified even if they don't implement MutableArray.  The
  // MutableArray is just a standard API for mutation but not required.
  addObject(obj) {
    let idx = this._content.length;
    arrayContentWillChange(this, idx, 0, 1);
    this._content.push(obj);
    arrayContentDidChange(this, idx, 0, 1);
  },

  removeFirst() {
    arrayContentWillChange(this, 0, 1, 0);
    this._content.shift();
    arrayContentDidChange(this, 0, 1, 0);
  },

  objectAt(idx) {
    return this._content[idx];
  },

  length: computed(function () {
    return this._content.length;
  }),
});

moduleFor(
  'Ember.Array',
  class extends AbstractTestCase {
    ['@test the return value of slice has Ember.Array applied'](assert) {
      let x = EmberObject.extend(EmberArray).create({
        length: 0,
      });
      let y = x.slice(1);
      assert.equal(EmberArray.detect(y), true, 'mixin should be applied');
    }

    ['@test slice supports negative index arguments'](assert) {
      let testArray = TestArray.create({ _content: [1, 2, 3, 4] });

      assert.deepEqual(testArray.slice(-2), [3, 4], 'slice(-2)');
      assert.deepEqual(testArray.slice(-2, -1), [3], 'slice(-2, -1');
      assert.deepEqual(testArray.slice(-2, -2), [], 'slice(-2, -2)');
      assert.deepEqual(testArray.slice(-1, -2), [], 'slice(-1, -2)');

      assert.deepEqual(testArray.slice(-4, 1), [1], 'slice(-4, 1)');
      assert.deepEqual(testArray.slice(-4, 5), [1, 2, 3, 4], 'slice(-4, 5)');
      assert.deepEqual(testArray.slice(-4), [1, 2, 3, 4], 'slice(-4)');

      assert.deepEqual(testArray.slice(0, -1), [1, 2, 3], 'slice(0, -1)');
      assert.deepEqual(testArray.slice(0, -4), [], 'slice(0, -4)');
      assert.deepEqual(testArray.slice(0, -3), [1], 'slice(0, -3)');
    }
  }
);

// ..........................................................
// CONTENT DID CHANGE
//

const DummyArray = EmberObject.extend(EmberArray, {
  length: 0,
  objectAt(idx) {
    return 'ITEM-' + idx;
  },
});

let obj, observer;

// ..........................................................
// NOTIFY ARRAY OBSERVERS
//

moduleFor(
  'mixins/array/arrayContent[Will|Did]Change',
  class extends AbstractTestCase {
    async ['@test should notify observers of []'](assert) {
      obj = DummyArray.extend({
        enumerablePropertyDidChange: emberObserver('[]', function () {
          this._count++;
        }),
      }).create({
        _count: 0,
      });

      assert.equal(obj._count, 0, 'should not have invoked yet');

      arrayContentWillChange(obj, 0, 1, 1);
      arrayContentDidChange(obj, 0, 1, 1);
      await runLoopSettled();

      assert.equal(obj._count, 1, 'should have invoked');
    }

    afterEach() {
      obj.destroy();
      obj = undefined;
    }
  }
);

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

moduleFor(
  'notify observers of length',
  class extends AbstractTestCase {
    beforeEach(assert) {
      obj = DummyArray.extend({
        lengthDidChange: emberObserver('length', function () {
          this._after++;
        }),
      }).create({
        _after: 0,
      });

      assert.equal(obj._after, 0, 'should not have fired yet');
    }

    afterEach() {
      obj.destroy();
      obj = undefined;
    }

    async ['@test should notify observers when call with no params'](assert) {
      arrayContentWillChange(obj);
      await runLoopSettled();

      assert.equal(obj._after, 0);

      arrayContentDidChange(obj);
      await runLoopSettled();

      assert.equal(obj._after, 1);
    }

    // API variation that included items only
    async ['@test should not notify when passed lengths are same'](assert) {
      arrayContentWillChange(obj, 0, 1, 1);
      await runLoopSettled();

      assert.equal(obj._after, 0);

      arrayContentDidChange(obj, 0, 1, 1);
      await runLoopSettled();

      assert.equal(obj._after, 0);
    }

    async ['@test should notify when passed lengths are different'](assert) {
      arrayContentWillChange(obj, 0, 1, 2);
      await runLoopSettled();

      assert.equal(obj._after, 0);

      arrayContentDidChange(obj, 0, 1, 2);
      await runLoopSettled();

      assert.equal(obj._after, 1);
    }
  }
);

// ..........................................................
// NOTIFY ARRAY OBSERVER
//

moduleFor(
  'notify array observers (internal)',
  class extends AbstractTestCase {
    beforeEach(assert) {
      obj = DummyArray.create();

      observer = EmberObject.extend({
        arrayWillChange() {
          assert.equal(this._before, null); // should only call once
          this._before = Array.prototype.slice.call(arguments);
        },

        arrayDidChange() {
          assert.equal(this._after, null); // should only call once
          this._after = Array.prototype.slice.call(arguments);
        },
      }).create({
        _before: null,
        _after: null,
      });

      addArrayObserver(obj, observer, {
        willChange: 'arrayWillChange',
        didChange: 'arrayDidChange',
      });
    }

    afterEach() {
      obj = observer = null;
    }

    ['@test should notify array observers when called with no params'](assert) {
      arrayContentWillChange(obj);
      assert.deepEqual(observer._before, [obj, 0, -1, -1]);

      arrayContentDidChange(obj);
      assert.deepEqual(observer._after, [obj, 0, -1, -1]);
    }

    // API variation that included items only
    ['@test should notify when called with same length items'](assert) {
      arrayContentWillChange(obj, 0, 1, 1);
      assert.deepEqual(observer._before, [obj, 0, 1, 1]);

      arrayContentDidChange(obj, 0, 1, 1);
      assert.deepEqual(observer._after, [obj, 0, 1, 1]);
    }

    ['@test should notify when called with diff length items'](assert) {
      arrayContentWillChange(obj, 0, 2, 1);
      assert.deepEqual(observer._before, [obj, 0, 2, 1]);

      arrayContentDidChange(obj, 0, 2, 1);
      assert.deepEqual(observer._after, [obj, 0, 2, 1]);
    }

    ['@test removing array observer should disable'](assert) {
      removeArrayObserver(obj, observer, {
        willChange: 'arrayWillChange',
        didChange: 'arrayDidChange',
      });
      arrayContentWillChange(obj);
      assert.deepEqual(observer._before, null);

      arrayContentDidChange(obj);
      assert.deepEqual(observer._after, null);
    }
  }
);

// ..........................................................
// @each
//

let ary;

moduleFor(
  'EmberArray.@each support',
  class extends AbstractTestCase {
    beforeEach() {
      ary = TestArray.create({
        _content: [
          { isDone: true, desc: 'Todo 1' },
          { isDone: false, desc: 'Todo 2' },
          { isDone: true, desc: 'Todo 3' },
          { isDone: false, desc: 'Todo 4' },
        ],
      });
    }

    afterEach() {
      ary.destroy();
      ary = null;
    }

    async ['@test adding an object should notify (@each.isDone)'](assert) {
      let called = 0;

      let observerObject = EmberObject.create({
        wasCalled() {
          called++;
        },
      });

      addObserver(ary, '@each.isDone', observerObject, 'wasCalled');

      ary.addObject(
        EmberObject.create({
          desc: 'foo',
          isDone: false,
        })
      );

      await runLoopSettled();
      assert.equal(called, 1, 'calls observer when object is pushed');
    }

    async ['@test using @each to observe arrays that does not return objects raise error'](assert) {
      let called = 0;

      let observerObject = EmberObject.create({
        wasCalled() {
          called++;
        },
      });

      ary = TestArray.create({
        objectAt(idx) {
          return get(this._content[idx], 'desc');
        },
      });

      ary.addObject({
        desc: 'foo',
        isDone: false,
      });

      assert.throwsAssertion(() => {
        addObserver(ary, '@each.isDone', observerObject, 'wasCalled');
      }, /When using @each to observe the array/);

      await runLoopSettled();
      assert.equal(called, 0, 'not calls observer when object is pushed');
    }

    ['@test `objectAt` returns correct object'](assert) {
      let arr = ['first', 'second', 'third', 'fourth'];
      assert.equal(objectAt(arr, 2), 'third');
      assert.equal(objectAt(arr, 4), undefined);
    }

    ['@test should be clear caches for computed properties that have dependent keys on arrays that are changed after object initialization'](
      assert
    ) {
      let obj = EmberObject.extend({
        init() {
          this._super(...arguments);
          set(this, 'resources', emberA());
        },

        common: computed('resources.@each.common', function () {
          return get(objectAt(get(this, 'resources'), 0), 'common');
        }),
      }).create();

      get(obj, 'resources').pushObject(EmberObject.create({ common: 'HI!' }));
      assert.equal('HI!', get(obj, 'common'));

      set(objectAt(get(obj, 'resources'), 0), 'common', 'BYE!');
      assert.equal('BYE!', get(obj, 'common'));
    }

    async ['@test observers that contain @each in the path should fire only once the first time they are accessed'](
      assert
    ) {
      let count = 0;

      let obj = EmberObject.extend({
        init() {
          this._super(...arguments);
          // Observer does not fire on init
          set(this, 'resources', emberA());
        },

        commonDidChange: emberObserver('resources.@each.common', () => count++),
      }).create();

      // Observer fires first time when new object is added
      get(obj, 'resources').pushObject(EmberObject.create({ common: 'HI!' }));
      await runLoopSettled();

      // Observer fires second time when property on an object is changed
      set(objectAt(get(obj, 'resources'), 0), 'common', 'BYE!');
      await runLoopSettled();

      assert.equal(count, 2, 'observers should be called twice');

      obj.destroy();
    }
  }
);
