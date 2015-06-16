import {get} from 'ember-metal/property_get';
import EmberStringUtils from 'ember-runtime/system/string';
import EmberObject from 'ember-runtime/system/object';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * changed get(obj, ) and set(obj, ) to Ember.get() and Ember.set()
  * converted uses of obj.isEqual() to use deepEqual() test since isEqual is not
    always defined
*/

function K() { return this; }

var klass;

QUnit.module('EmberObject Concatenated Properties', {
  setup() {
    klass = EmberObject.extend({
      concatenatedProperties: ['values', 'functions'],
      values: ['a', 'b', 'c'],
      functions: [K]
    });
  }
});

QUnit.test('concatenates instances', function() {
  var obj = klass.create({
    values: ['d', 'e', 'f']
  });

  var values = get(obj, 'values');
  var expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate values property (expected: %@, got: %@)', [expected, values]));
});

QUnit.test('concatenates subclasses', function() {
  var subKlass = klass.extend({
    values: ['d', 'e', 'f']
  });
  var obj = subKlass.create();

  var values = get(obj, 'values');
  var expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate values property (expected: %@, got: %@)', [expected, values]));
});

QUnit.test('concatenates reopen', function() {
  klass.reopen({
    values: ['d', 'e', 'f']
  });
  var obj = klass.create();

  var values = get(obj, 'values');
  var expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate values property (expected: %@, got: %@)', [expected, values]));
});

QUnit.test('concatenates mixin', function() {
  var mixin = {
    values: ['d', 'e']
  };
  var subKlass = klass.extend(mixin, {
    values: ['f']
  });
  var obj = subKlass.create();

  var values = get(obj, 'values');
  var expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate values property (expected: %@, got: %@)', [expected, values]));
});

QUnit.test('concatenates reopen, subclass, and instance', function() {
  klass.reopen({ values: ['d'] });
  var subKlass = klass.extend({ values: ['e'] });
  var obj = subKlass.create({ values: ['f'] });

  var values = get(obj, 'values');
  var expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate values property (expected: %@, got: %@)', [expected, values]));
});

QUnit.test('concatenates subclasses when the values are functions', function() {
  var subKlass = klass.extend({
    functions: K
  });
  var obj = subKlass.create();

  var values = get(obj, 'functions');
  var expected = [K, K];

  deepEqual(values, expected, EmberStringUtils.fmt('should concatenate functions property (expected: %@, got: %@)', [expected, values]));
});



