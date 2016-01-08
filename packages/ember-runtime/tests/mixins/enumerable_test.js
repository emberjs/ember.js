import EnumerableTests from 'ember-runtime/tests/suites/enumerable';
import EmberObject from 'ember-runtime/system/object';
import Enumerable from 'ember-runtime/mixins/enumerable';
import EmberArray from 'ember-runtime/mixins/array';
import { A as emberA } from 'ember-runtime/system/native_array';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';
import { observer as emberObserver } from 'ember-metal/mixin';

function K() { return this; }


/*
  Implement a basic fake enumerable.  This validates that any non-native
  enumerable can impl this API.
*/
var TestEnumerable = EmberObject.extend(Enumerable, {

  _content: null,

  init(ary) {
    this._content = ary || [];
  },

  addObject(obj) {
    if (this._content.indexOf(obj)>=0) {
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
  var x = EmberObject.extend(Enumerable).create();
  var y = x.map(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of filter', function() {
  var x = EmberObject.extend(Enumerable).create();
  var y = x.filter(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of invoke', function() {
  var x = EmberObject.extend(Enumerable).create();
  var y = x.invoke(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of toArray', function() {
  var x = EmberObject.extend(Enumerable).create();
  var y = x.toArray(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of without', function() {
  var x = EmberObject.extend(Enumerable, {
    contains() {
      return true;
    }
  }).create();
  var y = x.without(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('should apply Ember.Array to return value of uniq', function() {
  var x = EmberObject.extend(Enumerable).create();
  var y = x.uniq(K);
  equal(EmberArray.detect(y), true, 'should have mixin applied');
});

QUnit.test('any', function() {
  var kittens = emberA([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  var foundWhite = kittens.any(function(kitten) { return kitten.color === 'white'; });
  var foundWhite2 = kittens.isAny('color', 'white');

  equal(foundWhite, true);
  equal(foundWhite2, true);
});

QUnit.test('any with NaN', function() {
  var numbers = emberA([1, 2, NaN, 4]);

  var hasNaN = numbers.any(function(n) {
    return isNaN(n);
  });

  equal(hasNaN, true, 'works when matching NaN');
});

QUnit.test('every', function() {
  var allColorsKittens = emberA([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  var allWhiteKittens = emberA([{
    color: 'white'
  }, {
    color: 'white'
  }, {
    color: 'white'
  }]);
  var allWhite = false;
  var whiteKittenPredicate = function(kitten) { return kitten.color === 'white'; };

  allWhite = allColorsKittens.every(whiteKittenPredicate);
  equal(allWhite, false);

  allWhite = allWhiteKittens.every(whiteKittenPredicate);
  equal(allWhite, true);

  allWhite = allColorsKittens.isEvery('color', 'white');
  equal(allWhite, false);

  allWhite = allWhiteKittens.isEvery('color', 'white');
  equal(allWhite, true);
});

// ..........................................................
// CONTENT DID CHANGE
//

var DummyEnum = EmberObject.extend(Enumerable, {
  nextObject() {},
  length: 0
});

var obj, observer;

// ..........................................................
// NOTIFY ENUMERABLE PROPERTY
//

QUnit.module('mixins/enumerable/enumerableContentDidChange');

QUnit.test('should notify observers of []', function() {
  var obj = EmberObject.extend(Enumerable, {
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
  var added = ['foo'];
  var removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  equal(obj._after, 0);

  obj.enumerableContentDidChange(removed, added);
  equal(obj._after, 0);
});

QUnit.test('should notify when passed arrays of different length', function() {
  var added = ['foo'];
  var removed = ['bar', 'baz'];

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
  var added = ['foo'];
  var removed = ['bar'];

  obj.enumerableContentWillChange(removed, added);
  deepEqual(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  deepEqual(observer._after, [obj, removed, added]);
});

QUnit.test('should notify when called with diff length items', function() {
  var added = ['foo', 'baz'];
  var removed = ['bar'];

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

