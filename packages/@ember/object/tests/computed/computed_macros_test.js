import { get, set, computed, alias, defineProperty } from '@ember/-internals/metal';
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
} from '@ember/object/computed';

import { Object as EmberObject, A as emberA } from '@ember/-internals/runtime';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'CP macros',
  class extends AbstractTestCase {
    ['@test empty part 1/2'](assert) {
      let obj = EmberObject.extend({
        bestLannister: null,
        lannisters: null,

        bestLannisterUnspecified: empty('bestLannister'),
        noLannistersKnown: empty('lannisters'),
      }).create({
        lannisters: emberA(),
      });

      assert.strictEqual(
        get(obj, 'bestLannisterUnspecified'),
        true,
        'bestLannister initially empty'
      );
      assert.strictEqual(get(obj, 'noLannistersKnown'), true, 'lannisters initially empty');

      get(obj, 'lannisters').pushObject('Tyrion');
      set(obj, 'bestLannister', 'Tyrion');

      assert.strictEqual(get(obj, 'bestLannisterUnspecified'), false, 'empty respects strings');
      assert.strictEqual(get(obj, 'noLannistersKnown'), false, 'empty respects array mutations');
    }

    ['@test notEmpty part 1/2'](assert) {
      let obj = EmberObject.extend({
        bestLannister: null,
        lannisters: null,

        bestLannisterSpecified: notEmpty('bestLannister'),
        LannistersKnown: notEmpty('lannisters'),
      }).create({
        lannisters: emberA(),
      });

      assert.strictEqual(
        get(obj, 'bestLannisterSpecified'),
        false,
        'bestLannister initially empty'
      );
      assert.strictEqual(get(obj, 'LannistersKnown'), false, 'lannisters initially empty');

      get(obj, 'lannisters').pushObject('Tyrion');
      set(obj, 'bestLannister', 'Tyrion');

      assert.strictEqual(get(obj, 'bestLannisterSpecified'), true, 'empty respects strings');
      assert.strictEqual(get(obj, 'LannistersKnown'), true, 'empty respects array mutations');
    }

    ['@test not'](assert) {
      let obj = { foo: true };
      defineProperty(obj, 'notFoo', not('foo'));
      assert.strictEqual(get(obj, 'notFoo'), false);

      obj = { foo: { bar: true } };
      defineProperty(obj, 'notFoo', not('foo.bar'));
      assert.strictEqual(get(obj, 'notFoo'), false);
    }

    ['@test empty part 2/2'](assert) {
      let obj = { foo: [], bar: undefined, baz: null, quz: '' };
      defineProperty(obj, 'fooEmpty', empty('foo'));
      defineProperty(obj, 'barEmpty', empty('bar'));
      defineProperty(obj, 'bazEmpty', empty('baz'));
      defineProperty(obj, 'quzEmpty', empty('quz'));

      assert.strictEqual(get(obj, 'fooEmpty'), true);
      set(obj, 'foo', [1]);
      assert.strictEqual(get(obj, 'fooEmpty'), false);
      assert.strictEqual(get(obj, 'barEmpty'), true);
      assert.strictEqual(get(obj, 'bazEmpty'), true);
      assert.strictEqual(get(obj, 'quzEmpty'), true);
      set(obj, 'quz', 'asdf');
      assert.strictEqual(get(obj, 'quzEmpty'), false);
    }

    ['@test bool'](assert) {
      let obj = { foo() {}, bar: 'asdf', baz: null, quz: false };
      defineProperty(obj, 'fooBool', bool('foo'));
      defineProperty(obj, 'barBool', bool('bar'));
      defineProperty(obj, 'bazBool', bool('baz'));
      defineProperty(obj, 'quzBool', bool('quz'));
      assert.strictEqual(get(obj, 'fooBool'), true);
      assert.strictEqual(get(obj, 'barBool'), true);
      assert.strictEqual(get(obj, 'bazBool'), false);
      assert.strictEqual(get(obj, 'quzBool'), false);
    }

    ['@test alias'](assert) {
      let obj = { bar: 'asdf', baz: null, quz: false };
      defineProperty(
        obj,
        'bay',
        computed(function () {
          return 'apple';
        })
      );

      defineProperty(obj, 'barAlias', alias('bar'));
      defineProperty(obj, 'bazAlias', alias('baz'));
      defineProperty(obj, 'quzAlias', alias('quz'));
      defineProperty(obj, 'bayAlias', alias('bay'));

      assert.strictEqual(get(obj, 'barAlias'), 'asdf');
      assert.strictEqual(get(obj, 'bazAlias'), null);
      assert.strictEqual(get(obj, 'quzAlias'), false);
      assert.strictEqual(get(obj, 'bayAlias'), 'apple');

      set(obj, 'barAlias', 'newBar');
      set(obj, 'bazAlias', 'newBaz');
      set(obj, 'quzAlias', null);

      assert.strictEqual(get(obj, 'barAlias'), 'newBar');
      assert.strictEqual(get(obj, 'bazAlias'), 'newBaz');
      assert.strictEqual(get(obj, 'quzAlias'), null);

      assert.strictEqual(get(obj, 'bar'), 'newBar');
      assert.strictEqual(get(obj, 'baz'), 'newBaz');
      assert.strictEqual(get(obj, 'quz'), null);
    }

    ['@test alias set'](assert) {
      let obj = {};
      let constantValue = 'always `a`';

      defineProperty(
        obj,
        'original',
        computed({
          get: function () {
            return constantValue;
          },
          set: function () {
            return constantValue;
          },
        })
      );
      defineProperty(obj, 'aliased', alias('original'));

      assert.strictEqual(get(obj, 'original'), constantValue);
      assert.strictEqual(get(obj, 'aliased'), constantValue);

      set(obj, 'aliased', 'should not set to this value');

      assert.strictEqual(get(obj, 'original'), constantValue);
      assert.strictEqual(get(obj, 'aliased'), constantValue);
    }

    ['@test match'](assert) {
      let obj = { name: 'Paul' };
      defineProperty(obj, 'isPaul', match('name', /Paul/));

      assert.strictEqual(get(obj, 'isPaul'), true, 'is Paul');

      set(obj, 'name', 'Pierre');

      assert.strictEqual(get(obj, 'isPaul'), false, 'is not Paul anymore');
    }

    ['@test notEmpty part 2/2'](assert) {
      let obj = { items: [1] };
      defineProperty(obj, 'hasItems', notEmpty('items'));

      assert.strictEqual(get(obj, 'hasItems'), true, 'is not empty');

      set(obj, 'items', []);

      assert.strictEqual(get(obj, 'hasItems'), false, 'is empty');
    }

    ['@test equal'](assert) {
      let obj = { name: 'Paul' };
      defineProperty(obj, 'isPaul', computedEqual('name', 'Paul'));

      assert.strictEqual(get(obj, 'isPaul'), true, 'is Paul');

      set(obj, 'name', 'Pierre');

      assert.strictEqual(get(obj, 'isPaul'), false, 'is not Paul anymore');
    }

    ['@test gt'](assert) {
      let obj = { number: 2 };
      defineProperty(obj, 'isGreaterThenOne', gt('number', 1));

      assert.strictEqual(get(obj, 'isGreaterThenOne'), true, 'is gt');

      set(obj, 'number', 1);

      assert.strictEqual(get(obj, 'isGreaterThenOne'), false, 'is not gt');

      set(obj, 'number', 0);

      assert.strictEqual(get(obj, 'isGreaterThenOne'), false, 'is not gt');
    }

    ['@test gte'](assert) {
      let obj = { number: 2 };
      defineProperty(obj, 'isGreaterOrEqualThenOne', gte('number', 1));

      assert.strictEqual(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

      set(obj, 'number', 1);

      assert.strictEqual(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

      set(obj, 'number', 0);

      assert.strictEqual(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
    }

    ['@test lt'](assert) {
      let obj = { number: 0 };
      defineProperty(obj, 'isLesserThenOne', lt('number', 1));

      assert.strictEqual(get(obj, 'isLesserThenOne'), true, 'is lt');

      set(obj, 'number', 1);

      assert.strictEqual(get(obj, 'isLesserThenOne'), false, 'is not lt');

      set(obj, 'number', 2);

      assert.strictEqual(get(obj, 'isLesserThenOne'), false, 'is not lt');
    }

    ['@test lte'](assert) {
      let obj = { number: 0 };
      defineProperty(obj, 'isLesserOrEqualThenOne', lte('number', 1));

      assert.strictEqual(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

      set(obj, 'number', 1);

      assert.strictEqual(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

      set(obj, 'number', 2);

      assert.strictEqual(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
    }

    ['@test and, with two properties'](assert) {
      let obj = { one: true, two: true };
      defineProperty(obj, 'oneAndTwo', and('one', 'two'));

      assert.strictEqual(get(obj, 'oneAndTwo'), true, 'one and two');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneAndTwo'), false, 'one and not two');

      set(obj, 'one', null);
      set(obj, 'two', 'Yes');

      assert.strictEqual(get(obj, 'oneAndTwo'), null, 'returns falsy value as in &&');

      set(obj, 'one', true);
      set(obj, 'two', 2);

      assert.strictEqual(get(obj, 'oneAndTwo'), 2, 'returns truthy value as in &&');
    }

    ['@test and, with three properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', and('one', 'two', 'three'));

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one and two and three');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

      set(obj, 'one', true);
      set(obj, 'two', 2);
      set(obj, 'three', 3);

      assert.strictEqual(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
    }

    ['@test and, with expand properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', and('{one,two,three}'));

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one and two and three');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

      set(obj, 'one', true);
      set(obj, 'two', 2);
      set(obj, 'three', 3);

      assert.strictEqual(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
    }

    ['@test or, with two properties'](assert) {
      let obj = { one: true, two: true };
      defineProperty(obj, 'oneOrTwo', or('one', 'two'));

      assert.strictEqual(get(obj, 'oneOrTwo'), true, 'one or two');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneOrTwo'), true, 'one or two');

      set(obj, 'two', false);

      assert.strictEqual(get(obj, 'oneOrTwo'), false, 'nor one nor two');

      set(obj, 'two', null);

      assert.strictEqual(get(obj, 'oneOrTwo'), null, 'returns last falsy value as in ||');

      set(obj, 'two', true);

      assert.strictEqual(get(obj, 'oneOrTwo'), true, 'one or two');

      set(obj, 'one', 1);

      assert.strictEqual(get(obj, 'oneOrTwo'), 1, 'returns truthy value as in ||');
    }

    ['@test or, with three properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', or('one', 'two', 'three'));

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'two', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'three', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), false, 'one or two or three');

      set(obj, 'three', null);

      assert.strictEqual(get(obj, 'oneTwoThree'), null, 'returns last falsy value as in ||');

      set(obj, 'two', true);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'one', 1);

      assert.strictEqual(get(obj, 'oneTwoThree'), 1, 'returns truthy value as in ||');
    }

    ['@test or, with expand properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', or('{one,two,three}'));

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'one', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'two', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'three', false);

      assert.strictEqual(get(obj, 'oneTwoThree'), false, 'one or two or three');

      set(obj, 'three', null);

      assert.strictEqual(get(obj, 'oneTwoThree'), null, 'returns last falsy value as in ||');

      set(obj, 'two', true);

      assert.strictEqual(get(obj, 'oneTwoThree'), true, 'one or two or three');

      set(obj, 'one', 1);

      assert.strictEqual(get(obj, 'oneTwoThree'), 1, 'returns truthy value as in ||');
    }

    ['@test or and and, warn about dependent keys with spaces']() {
      let obj = { one: true, two: true };
      expectAssertion(function () {
        defineProperty(obj, 'oneOrTwo', or('one', 'two three'));
      }, /Dependent keys passed to `or` computed macro can't have spaces\./);

      expectAssertion(function () {
        defineProperty(obj, 'oneAndTwo', and('one', 'two three'));
      }, /Dependent keys passed to `and` computed macro can't have spaces\./);
    }

    ['@test oneWay'](assert) {
      let obj = {
        firstName: 'Teddy',
        lastName: 'Zeenny',
      };

      defineProperty(obj, 'nickName', oneWay('firstName'));

      assert.strictEqual(get(obj, 'firstName'), 'Teddy');
      assert.strictEqual(get(obj, 'lastName'), 'Zeenny');
      assert.strictEqual(get(obj, 'nickName'), 'Teddy');

      set(obj, 'nickName', 'TeddyBear');

      assert.strictEqual(get(obj, 'firstName'), 'Teddy');
      assert.strictEqual(get(obj, 'lastName'), 'Zeenny');

      assert.strictEqual(get(obj, 'nickName'), 'TeddyBear');

      set(obj, 'firstName', 'TEDDDDDDDDYYY');

      assert.strictEqual(get(obj, 'nickName'), 'TeddyBear');
    }

    ['@test readOnly'](assert) {
      let obj = {
        firstName: 'Teddy',
        lastName: 'Zeenny',
      };

      defineProperty(obj, 'nickName', readOnly('firstName'));

      assert.strictEqual(get(obj, 'firstName'), 'Teddy');
      assert.strictEqual(get(obj, 'lastName'), 'Zeenny');
      assert.strictEqual(get(obj, 'nickName'), 'Teddy');

      assert.throws(function () {
        set(obj, 'nickName', 'TeddyBear');
      }, / /);

      assert.strictEqual(get(obj, 'firstName'), 'Teddy');
      assert.strictEqual(get(obj, 'lastName'), 'Zeenny');

      assert.strictEqual(get(obj, 'nickName'), 'Teddy');

      set(obj, 'firstName', 'TEDDDDDDDDYYY');

      assert.strictEqual(get(obj, 'nickName'), 'TEDDDDDDDDYYY');
    }

    ['@test deprecatingAlias'](assert) {
      let obj = { bar: 'asdf', baz: null, quz: false };
      defineProperty(
        obj,
        'bay',
        computed(function () {
          return 'apple';
        })
      );

      defineProperty(
        obj,
        'barAlias',
        deprecatingAlias('bar', { id: 'bar-deprecation', until: 'some.version' })
      );
      defineProperty(
        obj,
        'bazAlias',
        deprecatingAlias('baz', { id: 'baz-deprecation', until: 'some.version' })
      );
      defineProperty(
        obj,
        'quzAlias',
        deprecatingAlias('quz', { id: 'quz-deprecation', until: 'some.version' })
      );
      defineProperty(
        obj,
        'bayAlias',
        deprecatingAlias('bay', { id: 'bay-deprecation', until: 'some.version' })
      );

      expectDeprecation(function () {
        assert.strictEqual(get(obj, 'barAlias'), 'asdf');
      }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

      expectDeprecation(function () {
        assert.strictEqual(get(obj, 'bazAlias'), null);
      }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

      expectDeprecation(function () {
        assert.strictEqual(get(obj, 'quzAlias'), false);
      }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

      expectDeprecation(function () {
        assert.strictEqual(get(obj, 'bayAlias'), 'apple');
      }, 'Usage of `bayAlias` is deprecated, use `bay` instead.');

      expectDeprecation(function () {
        set(obj, 'barAlias', 'newBar');
      }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

      expectDeprecation(function () {
        set(obj, 'bazAlias', 'newBaz');
      }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

      expectDeprecation(function () {
        set(obj, 'quzAlias', null);
      }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

      assert.strictEqual(get(obj, 'barAlias'), 'newBar');
      assert.strictEqual(get(obj, 'bazAlias'), 'newBaz');
      assert.strictEqual(get(obj, 'quzAlias'), null);

      assert.strictEqual(get(obj, 'bar'), 'newBar');
      assert.strictEqual(get(obj, 'baz'), 'newBaz');
      assert.strictEqual(get(obj, 'quz'), null);
    }
  }
);
