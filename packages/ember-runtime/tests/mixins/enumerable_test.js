import EnumerableTests from '../suites/enumerable';
import EmberObject from '../../system/object';
import Enumerable from '../../mixins/enumerable';
import EmberArray from '../../mixins/array';
import { A as emberA } from '../../system/native_array';
import {
  get,
  computed,
  observer as emberObserver
} from 'ember-metal';

function K() { return this; }

/*
  Implement a basic fake enumerable.  This validates that any non-native
  enumerable can impl this API.
*/
const TestEnumerable = EmberObject.extend(Enumerable, {
  _content: null,

  init(ary = []) {
    this._content = ary;
  },

  addObject(obj) {
    if (this._content.indexOf(obj) >= 0) {
      return this;
    }

    this._content.push(obj);
    this.enumerableContentDidChange();
  },

  nextObject(idx) {
    return idx >= get(this, 'length') ? undefined : this._content[idx];
  },

  length: computed(function() {
    return this._content.length;
  }),

  slice() {
    return this._content.slice();
  }

});


EnumerableTests.extend({
  name: 'Basic Enumerable',

  newObject(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestEnumerable(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate(obj) {
    obj.addObject(obj._content.length + 1);
  },

  toArray(obj) {
    return obj.slice();
  }

}).run();

QUnit.module('Ember.Enumerable');

QUnit.test('should apply Ember.Array to return value of map', function(assert) {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.map(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of filter', function(assert) {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.filter(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of invoke', function(assert) {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.invoke(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of toArray', function(assert) {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.toArray(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of without', function(assert) {
  let X = EmberObject.extend(Enumerable, {
    contains() {
      return true;
    },
    includes() {
      return true;
    }
  });

  let x = X.create();
  let y = x.without(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of uniq', function(assert) {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.uniq(K);
  assert.equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('any', function(assert) {
  let kittens = emberA([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  let foundWhite = kittens.any(kitten => kitten.color === 'white');
  let foundWhite2 = kittens.isAny('color', 'white');

  assert.equal(foundWhite, true);
  assert.equal(foundWhite2, true);
});

QUnit.test('any with NaN', function(assert) {
  let numbers = emberA([1, 2, NaN, 4]);

  let hasNaN = numbers.any(n => isNaN(n));

  assert.equal(hasNaN, true, 'works when matching NaN');
});

QUnit.test('every', function(assert) {
  let allColorsKittens = emberA([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  let allWhiteKittens = emberA([{
    color: 'white'
  }, {
    color: 'white'
  }, {
    color: 'white'
  }]);
  let allWhite = false;
  let whiteKittenPredicate = function(kitten) { return kitten.color === 'white'; };

  allWhite = allColorsKittens.every(whiteKittenPredicate);
  assert.equal(allWhite, false);

  allWhite = allWhiteKittens.every(whiteKittenPredicate);
  assert.equal(allWhite, true);

  allWhite = allColorsKittens.isEvery('color', 'white');
  assert.equal(allWhite, false);

  allWhite = allWhiteKittens.isEvery('color', 'white');
  assert.equal(allWhite, true);
});

QUnit.test('should throw an error passing a second argument to includes', function(assert) {
  let x = EmberObject.extend(Enumerable).create();

  assert.equal(x.includes('any'), false);
  expectAssertion(() => {
    x.includes('any', 1);
  }, /Enumerable#includes cannot accept a second argument "startAt" as enumerable items are unordered./);
});

// ..........................................................
// CONTENT DID CHANGE
//

let DummyEnum = EmberObject.extend(Enumerable, {
  nextObject() {},
  length: 0
});

let obj, observer;

// ..........................................................
// NOTIFY ENUMERABLE PROPERTY
//

QUnit.module('mixins/enumerable/enumerableContentDidChange');

QUnit.test('should notify observers of []', function(assert) {
  let obj = EmberObject.extend(Enumerable, {
    nextObject() {}, // avoid exceptions

    enumerablePropertyDidChange: emberObserver('[]', function() {
      this._count++;
    })
  }).create({
    _count: 0
  });

  assert.equal(obj._count, 0, 'should not have invoked yet');
  obj.enumerableContentWillChange();
  obj.enumerableContentDidChange();
  assert.equal(obj._count, 1, 'should have invoked');
});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

QUnit.module('notify observers of length', {
  beforeEach(assert) {
    obj = DummyEnum.extend({
      lengthDidChange: emberObserver('length', function() {
        this._after++;
      })
    }).create({
      _after: 0
    });

    assert.equal(obj._after, 0, 'should not have fired yet');
  },

  afterEach() {
    obj = null;
  }
});

QUnit.test('should notify observers when call with no params', function(assert) {
  obj.enumerableContentWillChange();
  assert.equal(obj._after, 0);

  obj.enumerableContentDidChange();
  assert.equal(obj._after, 1);
});

// API variation that included items only
QUnit.test('should not notify when passed arrays of same length', function(assert) {
  let added = ['foo'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  assert.equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  assert.equal(obj._after, 0);
});

QUnit.test('should notify when passed arrays of different length', function(assert) {
  let added = ['foo'];
  let removed = ['bar', 'baz'];

  obj.enumerableContentWillChange(removed, added);
  assert.equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  assert.equal(obj._after, 1);
});

// API variation passes indexes only
QUnit.test('should not notify when passed with indexes', function(assert) {
  obj.enumerableContentWillChange(1, 1);
  assert.equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 1);
  assert.equal(obj._after, 0);
});

QUnit.test('should notify when passed old index API with delta', function(assert) {
  obj.enumerableContentWillChange(1, 2);
  assert.equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 2);
  assert.equal(obj._after, 1);
});

// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
//

QUnit.module('notify enumerable observers', {
  beforeEach(assert) {
    obj = DummyEnum.create();

    observer = EmberObject.extend({
      enumerableWillChange() {
        assert.equal(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      enumerableDidChange() {
        assert.equal(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    }).create({
      _before: null,
      _after: null
    });

    obj.addEnumerableObserver(observer);
  },

  afterEach() {
    obj = observer = null;
  }
});

QUnit.test('should notify enumerable observers when called with no params', function(assert) {
  obj.enumerableContentWillChange();
  assert.deepEqual(observer._before, [obj, null, null]);

  obj.enumerableContentDidChange();
  assert.deepEqual(observer._after, [obj, null, null]);
});

// API variation that included items only
QUnit.test('should notify when called with same length items', function(assert) {
  let added = ['foo'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  assert.deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  assert.deepEqual(observer._after, [obj, removed, added]);
});

QUnit.test('should notify when called with diff length items', function(assert) {
  let added = ['foo', 'baz'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  assert.deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  assert.deepEqual(observer._after, [obj, removed, added]);
});

QUnit.test('should not notify when passed with indexes only', function(assert) {
  obj.enumerableContentWillChange(1, 2);
  assert.deepEqual(observer._before, [obj, 1, 2]);

  obj.enumerableContentDidChange(1, 2);
  assert.deepEqual(observer._after, [obj, 1, 2]);
});

QUnit.test('removing enumerable observer should disable', function(assert) {
  obj.removeEnumerableObserver(observer);
  obj.enumerableContentWillChange();
  assert.deepEqual(observer._before, null);

  obj.enumerableContentDidChange();
  assert.deepEqual(observer._after, null);
});
