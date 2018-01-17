import {
  computed,
  alias,
  defineProperty,
} from 'ember-metal';
import {
  empty,
  notEmpty,
  not,
  bool,
  match,
  equal as computedEqual,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  readOnly,
  deprecatingAlias,
  and,
  or,
} from '../../computed/computed_macros';
import { testBoth } from 'internal-test-helpers';

import EmberObject from '../../system/object';
import { A as emberA } from '../../mixins/array';

QUnit.module('CP macros');

testBoth('Ember.computed.empty', function (get, set, assert) {
  let obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterUnspecified: empty('bestLannister'),
    noLannistersKnown: empty('lannisters')
  }).create({
    lannisters: emberA()
  });

  assert.equal(get(obj, 'bestLannisterUnspecified'), true, 'bestLannister initially empty');
  assert.equal(get(obj, 'noLannistersKnown'), true, 'lannisters initially empty');

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  assert.equal(get(obj, 'bestLannisterUnspecified'), false, 'empty respects strings');
  assert.equal(get(obj, 'noLannistersKnown'), false, 'empty respects array mutations');
});

testBoth('Ember.computed.notEmpty', function(get, set, assert) {
  let obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterSpecified: notEmpty('bestLannister'),
    LannistersKnown: notEmpty('lannisters')
  }).create({
    lannisters: emberA()
  });

  assert.equal(get(obj, 'bestLannisterSpecified'), false, 'bestLannister initially empty');
  assert.equal(get(obj, 'LannistersKnown'), false, 'lannisters initially empty');

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  assert.equal(get(obj, 'bestLannisterSpecified'), true, 'empty respects strings');
  assert.equal(get(obj, 'LannistersKnown'), true, 'empty respects array mutations');
});

testBoth('computed.not', function(get, set, assert) {
  let obj = { foo: true };
  defineProperty(obj, 'notFoo', not('foo'));
  assert.equal(get(obj, 'notFoo'), false);

  obj = { foo: { bar: true } };
  defineProperty(obj, 'notFoo', not('foo.bar'));
  assert.equal(get(obj, 'notFoo'), false);
});

testBoth('computed.empty', function(get, set, assert) {
  let obj = { foo: [], bar: undefined, baz: null, quz: '' };
  defineProperty(obj, 'fooEmpty', empty('foo'));
  defineProperty(obj, 'barEmpty', empty('bar'));
  defineProperty(obj, 'bazEmpty', empty('baz'));
  defineProperty(obj, 'quzEmpty', empty('quz'));

  assert.equal(get(obj, 'fooEmpty'), true);
  set(obj, 'foo', [1]);
  assert.equal(get(obj, 'fooEmpty'), false);
  assert.equal(get(obj, 'barEmpty'), true);
  assert.equal(get(obj, 'bazEmpty'), true);
  assert.equal(get(obj, 'quzEmpty'), true);
  set(obj, 'quz', 'asdf');
  assert.equal(get(obj, 'quzEmpty'), false);
});

testBoth('computed.bool', function(get, set, assert) {
  let obj = { foo() {}, bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'fooBool', bool('foo'));
  defineProperty(obj, 'barBool', bool('bar'));
  defineProperty(obj, 'bazBool', bool('baz'));
  defineProperty(obj, 'quzBool', bool('quz'));
  assert.equal(get(obj, 'fooBool'), true);
  assert.equal(get(obj, 'barBool'), true);
  assert.equal(get(obj, 'bazBool'), false);
  assert.equal(get(obj, 'quzBool'), false);
});

testBoth('computed.alias', function(get, set, assert) {
  let obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function() {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', alias('bar'));
  defineProperty(obj, 'bazAlias', alias('baz'));
  defineProperty(obj, 'quzAlias', alias('quz'));
  defineProperty(obj, 'bayAlias', alias('bay'));

  assert.equal(get(obj, 'barAlias'), 'asdf');
  assert.equal(get(obj, 'bazAlias'), null);
  assert.equal(get(obj, 'quzAlias'), false);
  assert.equal(get(obj, 'bayAlias'), 'apple');

  set(obj, 'barAlias', 'newBar');
  set(obj, 'bazAlias', 'newBaz');
  set(obj, 'quzAlias', null);

  assert.equal(get(obj, 'barAlias'), 'newBar');
  assert.equal(get(obj, 'bazAlias'), 'newBaz');
  assert.equal(get(obj, 'quzAlias'), null);

  assert.equal(get(obj, 'bar'), 'newBar');
  assert.equal(get(obj, 'baz'), 'newBaz');
  assert.equal(get(obj, 'quz'), null);
});

testBoth('computed.alias set', function(get, set, assert) {
  let obj = {};
  let constantValue = 'always `a`';

  defineProperty(obj, 'original', computed({
    get: function() { return constantValue; },
    set: function() { return constantValue; }
  }));
  defineProperty(obj, 'aliased', alias('original'));

  assert.equal(get(obj, 'original'), constantValue);
  assert.equal(get(obj, 'aliased'), constantValue);

  set(obj, 'aliased', 'should not set to this value');

  assert.equal(get(obj, 'original'), constantValue);
  assert.equal(get(obj, 'aliased'), constantValue);
});

testBoth('computed.match', function(get, set, assert) {
  let obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', match('name', /Paul/));

  assert.equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  assert.equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.notEmpty', function(get, set, assert) {
  let obj = { items: [1] };
  defineProperty(obj, 'hasItems', notEmpty('items'));

  assert.equal(get(obj, 'hasItems'), true, 'is not empty');

  set(obj, 'items', []);

  assert.equal(get(obj, 'hasItems'), false, 'is empty');
});

testBoth('computed.equal', function(get, set, assert) {
  let obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', computedEqual('name', 'Paul'));

  assert.equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  assert.equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.gt', function(get, set, assert) {
  let obj = { number: 2 };
  defineProperty(obj, 'isGreaterThenOne', gt('number', 1));

  assert.equal(get(obj, 'isGreaterThenOne'), true, 'is gt');

  set(obj, 'number', 1);

  assert.equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');

  set(obj, 'number', 0);

  assert.equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');
});

testBoth('computed.gte', function(get, set, assert) {
  let obj = { number: 2 };
  defineProperty(obj, 'isGreaterOrEqualThenOne', gte('number', 1));

  assert.equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 1);

  assert.equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 0);

  assert.equal(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
});

testBoth('computed.lt', function(get, set, assert) {
  let obj = { number: 0 };
  defineProperty(obj, 'isLesserThenOne', lt('number', 1));

  assert.equal(get(obj, 'isLesserThenOne'), true, 'is lt');

  set(obj, 'number', 1);

  assert.equal(get(obj, 'isLesserThenOne'), false, 'is not lt');

  set(obj, 'number', 2);

  assert.equal(get(obj, 'isLesserThenOne'), false, 'is not lt');
});

testBoth('computed.lte', function(get, set, assert) {
  let obj = { number: 0 };
  defineProperty(obj, 'isLesserOrEqualThenOne', lte('number', 1));

  assert.equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 1);

  assert.equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 2);

  assert.equal(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
});

testBoth('computed.and two properties', function(get, set, assert) {
  let obj = { one: true, two: true };
  defineProperty(obj, 'oneAndTwo', and('one', 'two'));

  assert.equal(get(obj, 'oneAndTwo'), true, 'one and two');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneAndTwo'), false, 'one and not two');

  set(obj, 'one', null);
  set(obj, 'two', 'Yes');

  assert.equal(get(obj, 'oneAndTwo'), null, 'returns falsy value as in &&');

  set(obj, 'one', true);
  set(obj, 'two', 2);

  assert.equal(get(obj, 'oneAndTwo'), 2, 'returns truthy value as in &&');
});

testBoth('computed.and three properties', function(get, set, assert) {
  let obj = { one: true, two: true, three: true };
  defineProperty(obj, 'oneTwoThree', and('one', 'two', 'three'));

  assert.equal(get(obj, 'oneTwoThree'), true, 'one and two and three');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

  set(obj, 'one', true);
  set(obj, 'two', 2);
  set(obj, 'three', 3);

  assert.equal(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
});

testBoth('computed.and expand properties', function(get, set, assert) {
  let obj = { one: true, two: true, three: true };
  defineProperty(obj, 'oneTwoThree', and('{one,two,three}'));

  assert.equal(get(obj, 'oneTwoThree'), true, 'one and two and three');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

  set(obj, 'one', true);
  set(obj, 'two', 2);
  set(obj, 'three', 3);

  assert.equal(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
});

testBoth('computed.or two properties', function(get, set, assert) {
  let obj = { one: true, two: true };
  defineProperty(obj, 'oneOrTwo', or('one', 'two'));

  assert.equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'two', false);

  assert.equal(get(obj, 'oneOrTwo'), false, 'nor one nor two');

  set(obj, 'two', null);

  assert.equal(get(obj, 'oneOrTwo'), null, 'returns last falsy value as in ||');

  set(obj, 'two', true);

  assert.equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', 1);

  assert.equal(get(obj, 'oneOrTwo'), 1, 'returns truthy value as in ||');
});

testBoth('computed.or three properties', function(get, set, assert) {
  let obj = { one: true, two: true, three: true };
  defineProperty(obj, 'oneTwoThree', or('one', 'two', 'three'));

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'two', false);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'three', false);

  assert.equal(get(obj, 'oneTwoThree'), false, 'one or two or three');

  set(obj, 'three', null);

  assert.equal(get(obj, 'oneTwoThree'), null, 'returns last falsy value as in ||');

  set(obj, 'two', true);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'one', 1);

  assert.equal(get(obj, 'oneTwoThree'), 1, 'returns truthy value as in ||');
});

testBoth('computed.or expand properties', function(get, set, assert) {
  let obj = { one: true, two: true, three: true };
  defineProperty(obj, 'oneTwoThree', or('{one,two,three}'));

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'one', false);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'two', false);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'three', false);

  assert.equal(get(obj, 'oneTwoThree'), false, 'one or two or three');

  set(obj, 'three', null);

  assert.equal(get(obj, 'oneTwoThree'), null, 'returns last falsy value as in ||');

  set(obj, 'two', true);

  assert.equal(get(obj, 'oneTwoThree'), true, 'one or two or three');

  set(obj, 'one', 1);

  assert.equal(get(obj, 'oneTwoThree'), 1, 'returns truthy value as in ||');
});

testBoth('computed.or and computed.and warn about dependent keys with spaces', function() {
  let obj = { one: true, two: true };
  expectAssertion(function() {
    defineProperty(obj, 'oneOrTwo', or('one', 'two three'));
  }, /Dependent keys passed to computed\.or\(\) can't have spaces\./);

  expectAssertion(function() {
    defineProperty(obj, 'oneAndTwo', and('one', 'two three'));
  }, /Dependent keys passed to computed\.and\(\) can't have spaces\./);
});

testBoth('computed.oneWay', function(get, set, assert) {
  let obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', oneWay('firstName'));

  assert.equal(get(obj, 'firstName'), 'Teddy');
  assert.equal(get(obj, 'lastName'), 'Zeenny');
  assert.equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'nickName', 'TeddyBear');

  assert.equal(get(obj, 'firstName'), 'Teddy');
  assert.equal(get(obj, 'lastName'), 'Zeenny');

  assert.equal(get(obj, 'nickName'), 'TeddyBear');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  assert.equal(get(obj, 'nickName'), 'TeddyBear');
});

testBoth('computed.readOnly', function(get, set, assert) {
  let obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', readOnly('firstName'));

  assert.equal(get(obj, 'firstName'), 'Teddy');
  assert.equal(get(obj, 'lastName'), 'Zeenny');
  assert.equal(get(obj, 'nickName'), 'Teddy');

  assert.throws(function() {
    set(obj, 'nickName', 'TeddyBear');
  }, / /);

  assert.equal(get(obj, 'firstName'), 'Teddy');
  assert.equal(get(obj, 'lastName'), 'Zeenny');

  assert.equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  assert.equal(get(obj, 'nickName'), 'TEDDDDDDDDYYY');
});

testBoth('computed.deprecatingAlias', function(get, set, assert) {
  let obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function() {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', deprecatingAlias('bar'));
  defineProperty(obj, 'bazAlias', deprecatingAlias('baz'));
  defineProperty(obj, 'quzAlias', deprecatingAlias('quz'));
  defineProperty(obj, 'bayAlias', deprecatingAlias('bay'));

  assert.expectDeprecation(function() {
    assert.equal(get(obj, 'barAlias'), 'asdf');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  assert.expectDeprecation(function() {
    assert.equal(get(obj, 'bazAlias'), null);
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  assert.expectDeprecation(function() {
    assert.equal(get(obj, 'quzAlias'), false);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

  assert.expectDeprecation(function() {
    assert.equal(get(obj, 'bayAlias'), 'apple');
  }, 'Usage of `bayAlias` is deprecated, use `bay` instead.');

  assert.expectDeprecation(function() {
    set(obj, 'barAlias', 'newBar');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  assert.expectDeprecation(function() {
    set(obj, 'bazAlias', 'newBaz');
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  assert.expectDeprecation(function() {
    set(obj, 'quzAlias', null);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');


  assert.equal(get(obj, 'barAlias'), 'newBar');
  assert.equal(get(obj, 'bazAlias'), 'newBaz');
  assert.equal(get(obj, 'quzAlias'), null);

  assert.equal(get(obj, 'bar'), 'newBar');
  assert.equal(get(obj, 'baz'), 'newBaz');
  assert.equal(get(obj, 'quz'), null);
});
