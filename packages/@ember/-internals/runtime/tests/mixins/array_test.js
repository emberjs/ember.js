import {
  get,
  set,
  objectAt,
  addObserver,
  observer as emberObserver,
  computed,
  addArrayObserver,
  removeArrayObserver,
  arrayContentDidChange,
  arrayContentWillChange,
} from '@ember/-internals/metal';
import EmberObject from '../../lib/system/object';
import EmberArray from '../../lib/mixins/array';
import { A as emberA } from '../../lib/mixins/array';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

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

  length: computed(function() {
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
    ['@test should notify observers of []'](assert) {
      obj = DummyArray.extend({
        enumerablePropertyDidChange: emberObserver('[]', function() {
          this._count++;
        }),
      }).create({
        _count: 0,
      });

      assert.equal(obj._count, 0, 'should not have invoked yet');

      arrayContentWillChange(obj, 0, 1, 1);
      arrayContentDidChange(obj, 0, 1, 1);

      assert.equal(obj._count, 1, 'should have invoked');
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
        lengthDidChange: emberObserver('length', function() {
          this._after++;
        }),
      }).create({
        _after: 0,
      });

      assert.equal(obj._after, 0, 'should not have fired yet');
    }

    afterEach() {
      obj = null;
    }

    ['@test should notify observers when call with no params'](assert) {
      arrayContentWillChange(obj);
      assert.equal(obj._after, 0);

      arrayContentDidChange(obj);
      assert.equal(obj._after, 1);
    }

    // API variation that included items only
    ['@test should not notify when passed lengths are same'](assert) {
      arrayContentWillChange(obj, 0, 1, 1);
      assert.equal(obj._after, 0);

      arrayContentDidChange(obj, 0, 1, 1);
      assert.equal(obj._after, 0);
    }

    ['@test should notify when passed lengths are different'](assert) {
      arrayContentWillChange(obj, 0, 1, 2);
      assert.equal(obj._after, 0);

      arrayContentDidChange(obj, 0, 1, 2);
      assert.equal(obj._after, 1);
    }
  }
);

// ..........................................................
// NOTIFY ARRAY OBSERVER
//

moduleFor(
  'notify array observers',
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

      addArrayObserver(obj, observer);
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
      removeArrayObserver(obj, observer);
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
      ary = null;
    }

    ['@test adding an object should notify (@each.isDone)'](assert) {
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

      assert.equal(called, 1, 'calls observer when object is pushed');
    }

    ['@test getting @each is deprecated'](assert) {
      assert.expect(1);

      expectDeprecation(() => {
        get(ary, '@each');
      }, /Getting the '@each' property on object .* is deprecated/);
    }

    ['@test @each is readOnly'](assert) {
      assert.expect(1);

      assert.throws(function() {
        set(ary, '@each', 'foo');
      }, /Cannot set read-only property "@each"/);
    }

    ['@test using @each to observe arrays that does not return objects raise error'](assert) {
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

      addObserver(ary, '@each.isDone', observerObject, 'wasCalled');

      expectAssertion(() => {
        ary.addObject(
          EmberObject.create({
            desc: 'foo',
            isDone: false,
          })
        );
      }, /When using @each to observe the array/);

      assert.equal(called, 0, 'not calls observer when object is pushed');
    }

    ['@test modifying the array should also indicate the isDone prop itself has changed'](assert) {
      // NOTE: we never actually get the '@each.isDone' property here.  This is
      // important because it tests the case where we don't have an isDone
      // EachArray materialized but just want to know when the property has
      // changed.
      let each;
      expectDeprecation(() => {
        each = get(ary, '@each');
      });
      let count = 0;

      addObserver(each, 'isDone', () => count++);

      count = 0;
      let item = objectAt(ary, 2);
      set(item, 'isDone', !get(item, 'isDone'));
      assert.equal(count, 1, '@each.isDone should have notified');
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

        common: computed('resources.@each.common', function() {
          return get(objectAt(get(this, 'resources'), 0), 'common');
        }),
      }).create();

      get(obj, 'resources').pushObject(EmberObject.create({ common: 'HI!' }));
      assert.equal('HI!', get(obj, 'common'));

      set(objectAt(get(obj, 'resources'), 0), 'common', 'BYE!');
      assert.equal('BYE!', get(obj, 'common'));
    }

    ['@test observers that contain @each in the path should fire only once the first time they are accessed'](
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

      // Observer fires second time when new object is added
      get(obj, 'resources').pushObject(EmberObject.create({ common: 'HI!' }));
      // Observer fires third time when property on an object is changed
      set(objectAt(get(obj, 'resources'), 0), 'common', 'BYE!');

      assert.equal(count, 2, 'observers should only be called once');
    }
  }
);
