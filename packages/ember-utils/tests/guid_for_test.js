import { guidFor } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

function sameGuid(assert, a, b, message) {
  assert.equal(guidFor(a), guidFor(b), message);
}

function diffGuid(assert, a, b, message) {
  assert.ok(guidFor(a) !== guidFor(b), message);
}

function nanGuid(assert, obj) {
  let type = typeof obj;
  assert.ok(
    isNaN(parseInt(guidFor(obj), 0)),
    'guids for ' + type + "don't parse to numbers"
  );
}

moduleFor(
  'guidFor',
  class extends TestCase {
    ['@test Object'](assert) {
      let a = {};
      let b = {};

      sameGuid(assert, a, a, 'same object always yields same guid');
      diffGuid(assert, a, b, 'different objects yield different guids');
      nanGuid(assert, a);
    }

    ['@test strings'](assert) {
      let a = 'string A';
      let aprime = 'string A';
      let b = 'String B';

      sameGuid(assert, a, a, 'same string always yields same guid');
      sameGuid(
        assert,
        a,
        aprime,
        'identical strings always yield the same guid'
      );
      diffGuid(assert, a, b, 'different strings yield different guids');
      nanGuid(assert, a);
    }

    ['@test numbers'](assert) {
      let a = 23;
      let aprime = 23;
      let b = 34;

      sameGuid(assert, a, a, 'same numbers always yields same guid');
      sameGuid(
        assert,
        a,
        aprime,
        'identical numbers always yield the same guid'
      );
      diffGuid(assert, a, b, 'different numbers yield different guids');
      nanGuid(assert, a);
    }

    ['@test symbols'](assert) {
      if (typeof Symbol === 'undefined') {
        assert.ok(true, 'symbols are not supported on this browser');
        return;
      }

      let a = Symbol('a');
      let b = Symbol('b');

      sameGuid(assert, a, a, 'same symbols always yields same guid');
      diffGuid(assert, a, b, 'different symbols yield different guids');
      nanGuid(assert, a);
    }

    ['@test booleans'](assert) {
      let a = true;
      let aprime = true;
      let b = false;

      sameGuid(assert, a, a, 'same booleans always yields same guid');
      sameGuid(
        assert,
        a,
        aprime,
        'identical booleans always yield the same guid'
      );
      diffGuid(assert, a, b, 'different boolean yield different guids');
      nanGuid(assert, a);
      nanGuid(assert, b);
    }

    ['@test null and undefined'](assert) {
      let a = null;
      let aprime = null;
      let b;

      sameGuid(assert, a, a, 'null always returns the same guid');
      sameGuid(assert, b, b, 'undefined always returns the same guid');
      sameGuid(assert, a, aprime, 'different nulls return the same guid');
      diffGuid(assert, a, b, 'null and undefined return different guids');
      nanGuid(assert, a);
      nanGuid(assert, b);
    }

    ['@test arrays'](assert) {
      let a = ['a', 'b', 'c'];
      let aprime = ['a', 'b', 'c'];
      let b = ['1', '2', '3'];

      sameGuid(assert, a, a, 'same instance always yields same guid');
      diffGuid(
        assert,
        a,
        aprime,
        'identical arrays always yield the same guid'
      );
      diffGuid(assert, a, b, 'different arrays yield different guids');
      nanGuid(assert, a);
    }
  }
);
