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

QUnit.test('should apply Ember.Array to return value of map', function() {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.map(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of filter', function() {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.filter(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of invoke', function() {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.invoke(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of toArray', function() {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.toArray(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of without', function() {
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
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of uniq', function() {
  let x = EmberObject.extend(Enumerable).create();
  let y = x.uniq(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('any', function() {
  let kittens = emberA([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  let foundWhite = kittens.any(kitten => kitten.color === 'white');
  let foundWhite2 = kittens.isAny('color', 'white');

  equal(foundWhite, true);
  equal(foundWhite2, true);
});

QUnit.test('any with NaN', function() {
  let numbers = emberA([1, 2, NaN, 4]);

  let hasNaN = numbers.any(n => isNaN(n));

  equal(hasNaN, true, 'works when matching NaN');
});

QUnit.test('every', function() {
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
  equal(allWhite, false);

  allWhite = allWhiteKittens.every(whiteKittenPredicate);
  equal(allWhite, true);

  allWhite = allColorsKittens.isEvery('color', 'white');
  equal(allWhite, false);

  allWhite = allWhiteKittens.isEvery('color', 'white');
  equal(allWhite, true);
});

QUnit.test('should throw an error passing a second argument to includes', function() {
  let x = EmberObject.extend(Enumerable).create();

  equal(x.includes('any'), false);
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

QUnit.test('should notify observers of []', function() {
  let obj = EmberObject.extend(Enumerable, {
    nextObject() {}, // avoid exceptions

    enumerablePropertyDidChange: emberObserver('[]', function() {
      this._count++;
    })
  }).create({
    _count: 0
  });

  equal(obj._count, 0, 'should not have invoked yet');
  obj.enumerableContentWillChange();
  obj.enumerableContentDidChange();
  equal(obj._count, 1, 'should have invoked');
});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

QUnit.module('notify observers of length', {
  setup() {
    obj = DummyEnum.extend({
      lengthDidChange: emberObserver('length', function() {
        this._after++;
      })
    }).create({
      _after: 0
    });

    equal(obj._after, 0, 'should not have fired yet');
  },

  teardown() {
    obj = null;
  }
});

QUnit.test('should notify observers when call with no params', function() {
  obj.enumerableContentWillChange();
  equal(obj._after, 0);

  obj.enumerableContentDidChange();
  equal(obj._after, 1);
});

// API variation that included items only
QUnit.test('should not notify when passed arrays of same length', function() {
  let added = ['foo'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  equal(obj._after, 0);
});

QUnit.test('should notify when passed arrays of different length', function() {
  let added = ['foo'];
  let removed = ['bar', 'baz'];

  obj.enumerableContentWillChange(removed, added);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  equal(obj._after, 1);
});

// API variation passes indexes only
QUnit.test('should not notify when passed with indexes', function() {
  obj.enumerableContentWillChange(1, 1);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 1);
  equal(obj._after, 0);
});

QUnit.test('should notify when passed old index API with delta', function() {
  obj.enumerableContentWillChange(1, 2);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(1, 2);
  equal(obj._after, 1);
});

// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
//

QUnit.module('notify enumerable observers', {
  setup() {
    obj = DummyEnum.create();

    observer = EmberObject.extend({
      enumerableWillChange() {
        equal(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      enumerableDidChange() {
        equal(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    }).create({
      _before: null,
      _after: null
    });

    obj.addEnumerableObserver(observer);
  },

  teardown() {
    obj = observer = null;
  }
});

QUnit.test('should notify enumerable observers when called with no params', function() {
  obj.enumerableContentWillChange();
  deepEqual(observer._before, [obj, null, null]);

  obj.enumerableContentDidChange();
  deepEqual(observer._after, [obj, null, null]);
});

// API variation that included items only
QUnit.test('should notify when called with same length items', function() {
  let added = ['foo'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  deepEqual(observer._after, [obj, removed, added]);
});

QUnit.test('should notify when called with diff length items', function() {
  let added = ['foo', 'baz'];
  let removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  deepEqual(observer._after, [obj, removed, added]);
});

QUnit.test('should not notify when passed with indexes only', function() {
  obj.enumerableContentWillChange(1, 2);
  deepEqual(observer._before, [obj, 1, 2]);

  obj.enumerableContentDidChange(1, 2);
  deepEqual(observer._after, [obj, 1, 2]);
});

QUnit.test('removing enumerable observer should disable', function() {
  obj.removeEnumerableObserver(observer);
  obj.enumerableContentWillChange();
  deepEqual(observer._before, null);

  obj.enumerableContentDidChange();
  deepEqual(observer._after, null);
});
