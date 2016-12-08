import { set } from '../property_set';
import { get } from '../property_get';
import { computed } from '../computed';
import { defineProperty } from '../properties';
import {
  propertyDidChange,
  beginPropertyChanges,
  endPropertyChanges
} from '../property_events';
import { addObserver } from '../observer';

/*
  This test file is designed to capture performance regressions related to
  deferred computation. Things like run loops, computed properties, and bindings
  should run the minimum amount of times to achieve best performance, so any
  bugs that cause them to get evaluated more than necessary should be put here.
*/

QUnit.module('Computed Properties - Number of times evaluated');

QUnit.test('computed properties that depend on multiple properties should run only once per run loop', function() {
  let obj = { a: 'a', b: 'b', c: 'c' };
  let cpCount = 0;
  let obsCount = 0;

  defineProperty(obj, 'abc', computed(function(key) {
    cpCount++;
    return 'computed ' + key;
  }).property('a', 'b', 'c'));

  get(obj, 'abc');

  cpCount = 0;

  addObserver(obj, 'abc', function() {
    obsCount++;
  });

  beginPropertyChanges();
  set(obj, 'a', 'aa');
  set(obj, 'b', 'bb');
  set(obj, 'c', 'cc');
  endPropertyChanges();

  get(obj, 'abc');

  equal(cpCount, 1, 'The computed property is only invoked once');
  equal(obsCount, 1, 'The observer is only invoked once');
});

QUnit.test('computed properties are not executed if they are the last segment of an observer chain pain', function() {
  let foo = { bar: { baz: { } } };

  let count = 0;

  defineProperty(foo.bar.baz, 'bam', computed(function() {
    count++;
  }));

  addObserver(foo, 'bar.baz.bam', function() {});

  propertyDidChange(get(foo, 'bar.baz'), 'bam');

  equal(count, 0, 'should not have recomputed property');
});
