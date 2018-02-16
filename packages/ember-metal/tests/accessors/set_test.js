import {
  get,
  set,
  setHasViews
} from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('set', class extends AbstractTestCase {
  teardown() {
    setHasViews(() => false);
  }

  ['@test should set arbitrary properties on an object'](assert) {
    let obj = {
      string: 'string',
      number: 23,
      boolTrue: true,
      boolFalse: false,
      nullValue: null,
      undefinedValue: undefined
    };

    let newObj = {
      undefinedValue: 'emberjs'
    };

    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }

      assert.equal(set(newObj, key, obj[key]), obj[key], 'should return value');
      assert.equal(get(newObj, key), obj[key], 'should set value');
    }
  }

  ['@test should set a number key on an object'](assert) {
    let obj = { };

    set(obj, 1, 'first');
    assert.equal(obj[1], 'first');
  }

  ['@test should set an array index'](assert) {
    let arr = ['first', 'second'];

    set(arr, 1, 'lol');
    assert.deepEqual(arr, ['first', 'lol']);
  }

  ['@test should call setUnknownProperty if defined and value is undefined'](assert) {
    let obj = {
      count: 0,

      unknownProperty() {
        assert.ok(false, 'should not invoke unknownProperty if setUnknownProperty is defined');
      },

      setUnknownProperty(key, value) {
        assert.equal(key, 'foo', 'should pass key');
        assert.equal(value, 'BAR', 'should pass key');
        this.count++;
        return 'FOO';
      }
    };

    assert.equal(set(obj, 'foo', 'BAR'), 'BAR', 'should return set value');
    assert.equal(obj.count, 1, 'should have invoked');
  }

  ['@test warn on attempts to call set with undefined as object']() {
    expectAssertion(() => set(undefined, 'aProperty', 'BAM'), /Cannot call set with 'aProperty' on an undefined object./);
  }

  ['@test warn on attempts to call set with null as object']() {
    expectAssertion(() => set(null, 'aProperty', 'BAM'), /Cannot call set with 'aProperty' on an undefined object./);
  }

  ['@test warn on attempts to use set with an unsupported property path']() {
    let obj = {};
    expectAssertion(() => set(obj, null, 42),      /The key provided to set must be a string or number, you passed null/);
    expectAssertion(() => set(obj, NaN, 42),       /The key provided to set must be a string or number, you passed NaN/);
    expectAssertion(() => set(obj, undefined, 42), /The key provided to set must be a string or number, you passed undefined/);
    expectAssertion(() => set(obj, false, 42),     /The key provided to set must be a string or number, you passed false/);
  }

  ['@test warn on attempts of calling set on a destroyed object']() {
    let obj = { isDestroyed: true };

    expectAssertion(() => set(obj, 'favoriteFood', 'hot dogs'), 'calling set on destroyed object: [object Object].favoriteFood = hot dogs');
  }

  ['@test does not trigger auto-run assertion for objects that have not been tagged'](assert) {
    setHasViews(() => true);
    let obj = {};

    set(obj, 'foo', 'bar');

    assert.equal(obj.foo, 'bar');
  }
});

