import { testBoth } from 'internal-test-helpers';
import { PROPERTY_DID_CHANGE } from '../property_events';
import { isWatching } from '../watching';
import { defineProperty } from '../properties';
import alias from '../alias';
import { computed } from '../computed';

QUnit.module('PROPERTY_DID_CHANGE');

testBoth('alias and cp', function(get, set) {
  let counts = {};
  let obj = {
    child: {},
    [PROPERTY_DID_CHANGE](keyName) {
      counts[keyName] = (counts[keyName] || 0) + 1;
    }
  };

  defineProperty(obj, 'cost', alias('child.cost'));
  defineProperty(obj, 'tax', alias('child.tax'));

  defineProperty(obj, 'total', computed('cost', 'tax', {
    get() {
      return get(this, 'cost') + get(this, 'tax');
    }
  }));

  ok(!isWatching(obj, 'child.cost'), 'precond alias target `child.cost` is not watched');
  equal(get(obj, 'cost'), undefined);
  // this is how PROPERTY_DID_CHANGE will get notified
  ok(isWatching(obj, 'child.cost'), 'alias target `child.cost` is watched after consumption');

  ok(!isWatching(obj, 'child.tax'), 'precond alias target `child.tax` is not watched');
  equal(get(obj, 'tax'), undefined);
  // this is how PROPERTY_DID_CHANGE will get notified
  ok(isWatching(obj, 'child.tax'), 'alias target `child.cost` is watched after consumption');

  // increments the watching count on the alias itself to 1
  ok(isNaN(get(obj, 'total')), 'total is initialized');

  // decrements the watching count on the alias itself to 0
  set(obj, 'child', {
    cost: 399.00,
    tax: 32.93
  });

  // this should have called PROPERTY_DID_CHANGE for all of them
  equal(counts['cost'], 1,  'PROPERTY_DID_CHANGE called with cost');
  equal(counts['tax'], 1,   'PROPERTY_DID_CHANGE called with tax');
  equal(counts['total'], 1, 'PROPERTY_DID_CHANGE called with total');

  // we should still have a dependency installed
  ok(isWatching(obj, 'child.cost'), 'watching child.cost');
  ok(isWatching(obj, 'child.tax'), 'watching child.tax');

  set(obj, 'child', {
    cost: 100.00,
    tax: 10.00
  });

  equal(counts['cost'], 2,  'PROPERTY_DID_CHANGE called with cost');
  equal(counts['tax'], 2,   'PROPERTY_DID_CHANGE called with tax');
  equal(counts['total'], 1, 'PROPERTY_DID_CHANGE called with total');
});
