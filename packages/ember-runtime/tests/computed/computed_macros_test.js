import { computed } from "ember-metal/computed";
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
  defaultTo,
  deprecatingAlias,
  and,
  or,
  any,
  collect
} from "ember-metal/computed_macros";
import alias from 'ember-metal/alias';
import { defineProperty } from "ember-metal/properties";
import EmberObject from "ember-runtime/system/object";
import { testBoth } from "ember-metal/tests/props_helper";

QUnit.module('CP macros');

testBoth('Ember.computed.empty', function (get, set) {
  var obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterUnspecified: empty('bestLannister'),
    noLannistersKnown: empty('lannisters')
  }).create({
    lannisters: Ember.A([])
  });

  equal(get(obj, 'bestLannisterUnspecified'), true, "bestLannister initially empty");
  equal(get(obj, 'noLannistersKnown'), true, "lannisters initially empty");

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  equal(get(obj, 'bestLannisterUnspecified'), false, "empty respects strings");
  equal(get(obj, 'noLannistersKnown'), false, "empty respects array mutations");
});

testBoth('Ember.computed.notEmpty', function(get, set) {
  var obj = EmberObject.extend({
    bestLannister: null,
    lannisters: null,

    bestLannisterSpecified: notEmpty('bestLannister'),
    LannistersKnown: notEmpty('lannisters')
  }).create({
    lannisters: Ember.A([])
  });

  equal(get(obj, 'bestLannisterSpecified'), false, "bestLannister initially empty");
  equal(get(obj, 'LannistersKnown'), false, "lannisters initially empty");

  get(obj, 'lannisters').pushObject('Tyrion');
  set(obj, 'bestLannister', 'Tyrion');

  equal(get(obj, 'bestLannisterSpecified'), true, "empty respects strings");
  equal(get(obj, 'LannistersKnown'), true, "empty respects array mutations");
});

testBoth('computed.not', function(get, set) {
  var obj = { foo: true };
  defineProperty(obj, 'notFoo', not('foo'));
  equal(get(obj, 'notFoo'), false);

  obj = { foo: { bar: true } };
  defineProperty(obj, 'notFoo', not('foo.bar'));
  equal(get(obj, 'notFoo'), false);
});

testBoth('computed.empty', function(get, set) {
  var obj = { foo: [], bar: undefined, baz: null, quz: '' };
  defineProperty(obj, 'fooEmpty', empty('foo'));
  defineProperty(obj, 'barEmpty', empty('bar'));
  defineProperty(obj, 'bazEmpty', empty('baz'));
  defineProperty(obj, 'quzEmpty', empty('quz'));

  equal(get(obj, 'fooEmpty'), true);
  set(obj, 'foo', [1]);
  equal(get(obj, 'fooEmpty'), false);
  equal(get(obj, 'barEmpty'), true);
  equal(get(obj, 'bazEmpty'), true);
  equal(get(obj, 'quzEmpty'), true);
  set(obj, 'quz', 'asdf');
  equal(get(obj, 'quzEmpty'), false);
});

testBoth('computed.bool', function(get, set) {
  var obj = { foo() {}, bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'fooBool', bool('foo'));
  defineProperty(obj, 'barBool', bool('bar'));
  defineProperty(obj, 'bazBool', bool('baz'));
  defineProperty(obj, 'quzBool', bool('quz'));
  equal(get(obj, 'fooBool'), true);
  equal(get(obj, 'barBool'), true);
  equal(get(obj, 'bazBool'), false);
  equal(get(obj, 'quzBool'), false);
});

testBoth('computed.alias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function(key) {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', alias('bar'));
  defineProperty(obj, 'bazAlias', alias('baz'));
  defineProperty(obj, 'quzAlias', alias('quz'));
  defineProperty(obj, 'bayAlias', alias('bay'));

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);
  equal(get(obj, 'bayAlias'), 'apple');

  set(obj, 'barAlias', 'newBar');
  set(obj, 'bazAlias', 'newBaz');
  set(obj, 'quzAlias', null);

  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});

testBoth('computed.alias set', function(get, set) {
  var obj = {};
  var constantValue = 'always `a`';

  defineProperty(obj, 'original', computed({
    get: function(key) { return constantValue; },
    set: function(key, value) { return constantValue; }
  }));
  defineProperty(obj, 'aliased', alias('original'));

  equal(get(obj, 'original'), constantValue);
  equal(get(obj, 'aliased'), constantValue);

  set(obj, 'aliased', 'should not set to this value');

  equal(get(obj, 'original'), constantValue);
  equal(get(obj, 'aliased'), constantValue);
});

testBoth('computed.defaultTo', function(get, set) {
  expect(6);

  var obj = { source: 'original source value' };
  defineProperty(obj, 'copy', defaultTo('source'));

  ignoreDeprecation(function() {
    equal(get(obj, 'copy'), 'original source value');

    set(obj, 'copy', 'new copy value');
    equal(get(obj, 'source'), 'original source value');
    equal(get(obj, 'copy'), 'new copy value');

    set(obj, 'source', 'new source value');
    equal(get(obj, 'copy'), 'new copy value');

    set(obj, 'copy', null);
    equal(get(obj, 'copy'), 'new source value');
  });

  expectDeprecation(function() {
    var obj = { source: 'original source value' };
    defineProperty(obj, 'copy', defaultTo('source'));

    get(obj, 'copy');
  }, 'Usage of Ember.computed.defaultTo is deprecated, use `Ember.computed.oneWay` instead.');
});

testBoth('computed.match', function(get, set) {
  var obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', match('name', /Paul/));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.notEmpty', function(get, set) {
  var obj = { items: [1] };
  defineProperty(obj, 'hasItems', notEmpty('items'));

  equal(get(obj, 'hasItems'), true, 'is not empty');

  set(obj, 'items', []);

  equal(get(obj, 'hasItems'), false, 'is empty');
});

testBoth('computed.equal', function(get, set) {
  var obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', computedEqual('name', 'Paul'));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.gt', function(get, set) {
  var obj = { number: 2 };
  defineProperty(obj, 'isGreaterThenOne', gt('number', 1));

  equal(get(obj, 'isGreaterThenOne'), true, 'is gt');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');
});

testBoth('computed.gte', function(get, set) {
  var obj = { number: 2 };
  defineProperty(obj, 'isGreaterOrEqualThenOne', gte('number', 1));

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
});

testBoth('computed.lt', function(get, set) {
  var obj = { number: 0 };
  defineProperty(obj, 'isLesserThenOne', lt('number', 1));

  equal(get(obj, 'isLesserThenOne'), true, 'is lt');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');
});

testBoth('computed.lte', function(get, set) {
  var obj = { number: 0 };
  defineProperty(obj, 'isLesserOrEqualThenOne', lte('number', 1));

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
});

testBoth('computed.and', function(get, set) {
  var obj = { one: true, two: true };
  defineProperty(obj, 'oneAndTwo', and('one', 'two'));

  equal(get(obj, 'oneAndTwo'), true, 'one and two');

  set(obj, 'one', false);

  equal(get(obj, 'oneAndTwo'), false, 'one and not two');

  set(obj, 'one', true);
  set(obj, 'two', 2);

  equal(get(obj, 'oneAndTwo'), 2, 'returns truthy value as in &&');
});

testBoth('computed.or', function(get, set) {
  var obj = { one: true, two: true };
  defineProperty(obj, 'oneOrTwo', or('one', 'two'));

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', false);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'two', false);

  equal(get(obj, 'oneOrTwo'), false, 'nore one nore two');

  set(obj, 'two', true);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', 1);

  equal(get(obj, 'oneOrTwo'), 1, 'returns truthy value as in ||');
});

testBoth('computed.any', function(get, set) {
  var obj = { one: 'foo', two: 'bar' };
  defineProperty(obj, 'anyOf', any('one', 'two'));

  equal(get(obj, 'anyOf'), 'foo', 'is foo');

  set(obj, 'one', false);

  equal(get(obj, 'anyOf'), 'bar', 'is bar');
});

testBoth('computed.collect', function(get, set) {
  var obj = { one: 'foo', two: 'bar', three: null };
  defineProperty(obj, 'all', collect('one', 'two', 'three', 'four'));

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, null], 'have all of them');

  set(obj, 'four', true);

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, true], 'have all of them');

  var a = [];
  set(obj, 'one', 0);
  set(obj, 'three', a);

  deepEqual(get(obj, 'all'), [0, 'bar', a, true], 'have all of them');
});

testBoth('computed.oneWay', function(get, set) {
  var obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', oneWay('firstName'));

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');
  equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'nickName', 'TeddyBear');

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');

  equal(get(obj, 'nickName'), 'TeddyBear');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  equal(get(obj, 'nickName'), 'TeddyBear');
});

testBoth('computed.readOnly', function(get, set) {
  var obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', readOnly('firstName'));

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');
  equal(get(obj, 'nickName'), 'Teddy');

  throws(function() {
    set(obj, 'nickName', 'TeddyBear');
  }, / /);

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');

  equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  equal(get(obj, 'nickName'), 'TEDDDDDDDDYYY');
});

testBoth('computed.deprecatingAlias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function(key) {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', deprecatingAlias('bar'));
  defineProperty(obj, 'bazAlias', deprecatingAlias('baz'));
  defineProperty(obj, 'quzAlias', deprecatingAlias('quz'));
  defineProperty(obj, 'bayAlias', deprecatingAlias('bay'));

  expectDeprecation(function() {
    equal(get(obj, 'barAlias'), 'asdf');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'bazAlias'), null);
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'quzAlias'), false);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'bayAlias'), 'apple');
  }, 'Usage of `bayAlias` is deprecated, use `bay` instead.');

  expectDeprecation(function() {
    set(obj, 'barAlias', 'newBar');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  expectDeprecation(function() {
    set(obj, 'bazAlias', 'newBaz');
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  expectDeprecation(function() {
    set(obj, 'quzAlias', null);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');


  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});
