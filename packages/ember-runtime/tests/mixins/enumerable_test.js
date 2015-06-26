import Ember from 'ember-metal/core'; // for Ember.A
import EnumerableTests from 'ember-runtime/tests/suites/enumerable';
import EmberObject from 'ember-runtime/system/object';
import Enumerable from 'ember-runtime/mixins/enumerable';
import EmberArray from 'ember-runtime/mixins/array';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';

function K() { return this; }

/*
  Implement a basic fake enumerable.  This validates that any non-native
  enumerable can impl this API.
*/
var TestEnumerable = EmberObject.extend(Enumerable, {

  init(ary) {
    this._super(...arguments);
    this._content = ary || [];
  },

  addObject(obj) {
    if (this._content.indexOf(obj)>=0) {
      return this;
    }

    this._content.push(obj);
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
    obj.addObject(obj._content.length+1);
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
  var kittens = Ember.A([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  var foundWhite = kittens.any(kitten => kitten.color === 'white');
  var foundWhite2 = kittens.isAny('color', 'white');

  equal(foundWhite, true);
  equal(foundWhite2, true);
});

QUnit.test('any with NaN', function() {
  var numbers = Ember.A([1,2,NaN,4]);

  var hasNaN = numbers.any(function(n) {
    return isNaN(n);
  });

  equal(hasNaN, true, 'works when matching NaN');
});

QUnit.test('every', function() {
  var allColorsKittens = Ember.A([{
    color: 'white'
  }, {
    color: 'black'
  }, {
    color: 'white'
  }]);
  var allWhiteKittens = Ember.A([{
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
