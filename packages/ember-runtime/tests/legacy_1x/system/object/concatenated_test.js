import { get } from 'ember-metal';
import EmberObject from '../../../../system/object';

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

let klass;

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
  let obj = klass.create({
    values: ['d', 'e', 'f']
  });

  let values = get(obj, 'values');
  let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, `should concatenate values property (expected: ${expected}, got: ${values})`);
});

QUnit.test('concatenates subclasses', function() {
  let subKlass = klass.extend({
    values: ['d', 'e', 'f']
  });
  let obj = subKlass.create();

  let values = get(obj, 'values');
  let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, `should concatenate values property (expected: ${expected}, got: ${values})`);
});

QUnit.test('concatenates reopen', function() {
  klass.reopen({
    values: ['d', 'e', 'f']
  });
  let obj = klass.create();

  let values = get(obj, 'values');
  let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, `should concatenate values property (expected: ${expected}, got: ${values})`);
});

QUnit.test('concatenates mixin', function() {
  let mixin = {
    values: ['d', 'e']
  };
  let subKlass = klass.extend(mixin, {
    values: ['f']
  });
  let obj = subKlass.create();

  let values = get(obj, 'values');
  let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, `should concatenate values property (expected: ${expected}, got: ${values})`);
});

QUnit.test('concatenates reopen, subclass, and instance', function() {
  klass.reopen({ values: ['d'] });
  let subKlass = klass.extend({ values: ['e'] });
  let obj = subKlass.create({ values: ['f'] });

  let values = get(obj, 'values');
  let expected = ['a', 'b', 'c', 'd', 'e', 'f'];

  deepEqual(values, expected, `should concatenate values property (expected: ${expected}, got: ${values})`);
});

QUnit.test('concatenates subclasses when the values are functions', function() {
  let subKlass = klass.extend({
    functions: K
  });
  let obj = subKlass.create();

  let values = get(obj, 'functions');
  let expected = [K, K];

  deepEqual(values, expected, `should concatenate functions property (expected: ${expected}, got: ${values})`);
});
