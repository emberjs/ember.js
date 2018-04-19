import { get, set, computed, alias, defineProperty } from 'ember-metal';
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

import { Object as EmberObject, A as emberA } from 'ember-runtime';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'CP macros',
  class extends AbstractTestCase {
    ['@test Ember.computed.empty'](assert) {
      let obj = EmberObject.extend({
        bestLannister: null,
        lannisters: null,

        bestLannisterUnspecified: empty('bestLannister'),
        noLannistersKnown: empty('lannisters'),
      }).create({
        lannisters: emberA(),
      });

      assert.equal(get(obj, 'bestLannisterUnspecified'), true, 'bestLannister initially empty');
      assert.equal(get(obj, 'noLannistersKnown'), true, 'lannisters initially empty');

      get(obj, 'lannisters').pushObject('Tyrion');
      set(obj, 'bestLannister', 'Tyrion');

      assert.equal(get(obj, 'bestLannisterUnspecified'), false, 'empty respects strings');
      assert.equal(get(obj, 'noLannistersKnown'), false, 'empty respects array mutations');
    }

    ['@test Ember.computed.notEmpty'](assert) {
      let obj = EmberObject.extend({
        bestLannister: null,
        lannisters: null,

        bestLannisterSpecified: notEmpty('bestLannister'),
        LannistersKnown: notEmpty('lannisters'),
      }).create({
        lannisters: emberA(),
      });

      assert.equal(get(obj, 'bestLannisterSpecified'), false, 'bestLannister initially empty');
      assert.equal(get(obj, 'LannistersKnown'), false, 'lannisters initially empty');

      get(obj, 'lannisters').pushObject('Tyrion');
      set(obj, 'bestLannister', 'Tyrion');

      assert.equal(get(obj, 'bestLannisterSpecified'), true, 'empty respects strings');
      assert.equal(get(obj, 'LannistersKnown'), true, 'empty respects array mutations');
    }

    ['@test computed.not'](assert) {
      let obj = { foo: true };
      defineProperty(obj, 'notFoo', not('foo'));
      assert.equal(get(obj, 'notFoo'), false);

      obj = { foo: { bar: true } };
      defineProperty(obj, 'notFoo', not('foo.bar'));
      assert.equal(get(obj, 'notFoo'), false);
    }

    ['@test computed.empty'](assert) {
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
    }

    ['@test computed.bool'](assert) {
      let obj = { foo() {}, bar: 'asdf', baz: null, quz: false };
      defineProperty(obj, 'fooBool', bool('foo'));
      defineProperty(obj, 'barBool', bool('bar'));
      defineProperty(obj, 'bazBool', bool('baz'));
      defineProperty(obj, 'quzBool', bool('quz'));
      assert.equal(get(obj, 'fooBool'), true);
      assert.equal(get(obj, 'barBool'), true);
      assert.equal(get(obj, 'bazBool'), false);
      assert.equal(get(obj, 'quzBool'), false);
    }

    ['@test computed.alias'](assert) {
      let obj = { bar: 'asdf', baz: null, quz: false };
      defineProperty(
        obj,
        'bay',
        computed(function() {
          return 'apple';
        })
      );

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
    }

    ['@test computed.alias set'](assert) {
      let obj = {};
      let constantValue = 'always `a`';

      defineProperty(
        obj,
        'original',
        computed({
          get: function() {
            return constantValue;
          },
          set: function() {
            return constantValue;
          },
        })
      );
      defineProperty(obj, 'aliased', alias('original'));

      assert.equal(get(obj, 'original'), constantValue);
      assert.equal(get(obj, 'aliased'), constantValue);

      set(obj, 'aliased', 'should not set to this value');

      assert.equal(get(obj, 'original'), constantValue);
      assert.equal(get(obj, 'aliased'), constantValue);
    }

    ['@test computed.match'](assert) {
      let obj = { name: 'Paul' };
      defineProperty(obj, 'isPaul', match('name', /Paul/));

      assert.equal(get(obj, 'isPaul'), true, 'is Paul');

      set(obj, 'name', 'Pierre');

      assert.equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
    }

    ['@test computed.notEmpty'](assert) {
      let obj = { items: [1] };
      defineProperty(obj, 'hasItems', notEmpty('items'));

      assert.equal(get(obj, 'hasItems'), true, 'is not empty');

      set(obj, 'items', []);

      assert.equal(get(obj, 'hasItems'), false, 'is empty');
    }

    ['@test computed.equal'](assert) {
      let obj = { name: 'Paul' };
      defineProperty(obj, 'isPaul', computedEqual('name', 'Paul'));

      assert.equal(get(obj, 'isPaul'), true, 'is Paul');

      set(obj, 'name', 'Pierre');

      assert.equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
    }

    ['@test computed.gt'](assert) {
      let obj = { number: 2 };
      defineProperty(obj, 'isGreaterThenOne', gt('number', 1));

      assert.equal(get(obj, 'isGreaterThenOne'), true, 'is gt');

      set(obj, 'number', 1);

      assert.equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');

      set(obj, 'number', 0);

      assert.equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');
    }

    ['@test computed.gte'](assert) {
      let obj = { number: 2 };
      defineProperty(obj, 'isGreaterOrEqualThenOne', gte('number', 1));

      assert.equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

      set(obj, 'number', 1);

      assert.equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

      set(obj, 'number', 0);

      assert.equal(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
    }

    ['@test computed.lt'](assert) {
      let obj = { number: 0 };
      defineProperty(obj, 'isLesserThenOne', lt('number', 1));

      assert.equal(get(obj, 'isLesserThenOne'), true, 'is lt');

      set(obj, 'number', 1);

      assert.equal(get(obj, 'isLesserThenOne'), false, 'is not lt');

      set(obj, 'number', 2);

      assert.equal(get(obj, 'isLesserThenOne'), false, 'is not lt');
    }

    ['@test computed.lte'](assert) {
      let obj = { number: 0 };
      defineProperty(obj, 'isLesserOrEqualThenOne', lte('number', 1));

      assert.equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

      set(obj, 'number', 1);

      assert.equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

      set(obj, 'number', 2);

      assert.equal(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
    }

    ['@test computed.and two properties'](assert) {
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
    }

    ['@test computed.and three properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', and('one', 'two', 'three'));

      assert.equal(get(obj, 'oneTwoThree'), true, 'one and two and three');

      set(obj, 'one', false);

      assert.equal(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

      set(obj, 'one', true);
      set(obj, 'two', 2);
      set(obj, 'three', 3);

      assert.equal(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
    }

    ['@test computed.and expand properties'](assert) {
      let obj = { one: true, two: true, three: true };
      defineProperty(obj, 'oneTwoThree', and('{one,two,three}'));

      assert.equal(get(obj, 'oneTwoThree'), true, 'one and two and three');

      set(obj, 'one', false);

      assert.equal(get(obj, 'oneTwoThree'), false, 'one and not two and not three');

      set(obj, 'one', true);
      set(obj, 'two', 2);
      set(obj, 'three', 3);

      assert.equal(get(obj, 'oneTwoThree'), 3, 'returns truthy value as in &&');
    }

    ['@test computed.or two properties'](assert) {
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
    }

    ['@test computed.or three properties'](assert) {
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
    }

    ['@test computed.or expand properties'](assert) {
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
    }

    ['@test computed.or and computed.and warn about dependent keys with spaces']() {
      let obj = { one: true, two: true };
      expectAssertion(function() {
        defineProperty(obj, 'oneOrTwo', or('one', 'two three'));
      }, /Dependent keys passed to computed\.or\(\) can't have spaces\./);

      expectAssertion(function() {
        defineProperty(obj, 'oneAndTwo', and('one', 'two three'));
      }, /Dependent keys passed to computed\.and\(\) can't have spaces\./);
    }

    ['@test computed.oneWay'](assert) {
      let obj = {
        firstName: 'Teddy',
        lastName: 'Zeenny',
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
    }

    ['@test computed.readOnly'](assert) {
      let obj = {
        firstName: 'Teddy',
        lastName: 'Zeenny',
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
    }

    ['@test computed.deprecatingAlias'](assert) {
      let obj = { bar: 'asdf', baz: null, quz: false };
      defineProperty(
        obj,
        'bay',
        computed(function() {
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

      expectDeprecation(function() {
        assert.equal(get(obj, 'barAlias'), 'asdf');
      }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

      expectDeprecation(function() {
        assert.equal(get(obj, 'bazAlias'), null);
      }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

      expectDeprecation(function() {
        assert.equal(get(obj, 'quzAlias'), false);
      }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

      expectDeprecation(function() {
        assert.equal(get(obj, 'bayAlias'), 'apple');
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

      assert.equal(get(obj, 'barAlias'), 'newBar');
      assert.equal(get(obj, 'bazAlias'), 'newBaz');
      assert.equal(get(obj, 'quzAlias'), null);

      assert.equal(get(obj, 'bar'), 'newBar');
      assert.equal(get(obj, 'baz'), 'newBaz');
      assert.equal(get(obj, 'quz'), null);
    }
  }
);
