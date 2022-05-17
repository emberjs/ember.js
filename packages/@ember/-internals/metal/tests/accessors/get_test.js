import { ENV } from '@ember/-internals/environment';
import EmberObject, { observer } from '@ember/object';
import { get } from '../..';
import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';

function aget(x, y) {
  return x[y];
}

moduleFor(
  'get',
  class extends AbstractTestCase {
    ['@test should get arbitrary properties on an object'](assert) {
      let obj = {
        string: 'string',
        number: 23,
        boolTrue: true,
        boolFalse: false,
        nullValue: null,
      };

      for (let key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
          continue;
        }
        assert.equal(get(obj, key), obj[key], key);
      }
    }

    ['@test should retrieve a number key on an object'](assert) {
      let obj = { 1: 'first' };

      assert.equal(get(obj, 1), 'first');
    }

    ['@test should retrieve an array index'](assert) {
      let arr = ['first', 'second'];

      assert.equal(get(arr, 0), 'first');
      assert.equal(get(arr, 1), 'second');
    }

    ['@test should retrieve an empty string key on an object'](assert) {
      let obj = { '': 'empty-string' };

      assert.equal(get(obj, ''), 'empty-string');
    }

    ['@test should return undefined when passed an empty string if that key does not exist on an object'](
      assert
    ) {
      let obj = { tomster: true };

      assert.equal(get(obj, ''), undefined);
    }

    ['@test should not access a property more than once'](assert) {
      let count = 0;
      let obj = {
        get id() {
          return ++count;
        },
      };

      get(obj, 'id');

      assert.equal(count, 1);
    }

    ['@test should call unknownProperty on watched values if the value is undefined using getFromEmberMetal()/set()'](
      assert
    ) {
      let obj = {
        unknownProperty(key) {
          assert.equal(key, 'foo', 'should pass key');
          return 'FOO';
        },
      };
      assert.equal(get(obj, 'foo'), 'FOO', 'should return value from unknown');
    }

    ['@test should call unknownProperty on watched values if the value is undefined using accessors'](
      assert
    ) {
      if (ENV.USES_ACCESSORS) {
        let obj = {
          unknownProperty(key) {
            assert.equal(key, 'foo', 'should pass key');
            return 'FOO';
          },
        };
        assert.equal(aget(obj, 'foo'), 'FOO', 'should return value from unknown');
      } else {
        assert.ok('SKIPPING ACCESSORS');
      }
    }

    ['@test get works with paths correctly'](assert) {
      let func = function () {};
      func.bar = 'awesome';

      let destroyedObj = EmberObject.create({ bar: 'great' });
      run(() => destroyedObj.destroy());

      assert.equal(get({ foo: null }, 'foo.bar'), undefined);
      assert.equal(get({ foo: { bar: 'hello' } }, 'foo.bar.length'), 5);
      assert.equal(get({ foo: func }, 'foo.bar'), 'awesome');
      assert.equal(get({ foo: func }, 'foo.bar.length'), 7);
      assert.equal(get({}, 'foo.bar.length'), undefined);
      assert.equal(
        get(function () {}, 'foo.bar.length'),
        undefined
      );
      assert.equal(get('', 'foo.bar.length'), undefined);
      assert.equal(get({ foo: destroyedObj }, 'foo.bar'), undefined);
    }

    ['@test warn on attempts to call get with no arguments']() {
      expectAssertion(function () {
        get('aProperty');
      }, /Get must be called with two arguments;/i);
    }

    ['@test warn on attempts to call get with only one argument']() {
      expectAssertion(function () {
        get('aProperty');
      }, /Get must be called with two arguments;/i);
    }

    ['@test warn on attempts to call get with more then two arguments']() {
      expectAssertion(function () {
        get({}, 'aProperty', true);
      }, /Get must be called with two arguments;/i);
    }

    ['@test warn on attempts to get a property of undefined']() {
      expectAssertion(function () {
        get(undefined, 'aProperty');
      }, /Cannot call get with 'aProperty' on an undefined object/i);
    }

    ['@test warn on attempts to get a property path of undefined']() {
      expectAssertion(function () {
        get(undefined, 'aProperty.on.aPath');
      }, /Cannot call get with 'aProperty.on.aPath' on an undefined object/);
    }

    ['@test warn on attempts to get a property of null']() {
      expectAssertion(function () {
        get(null, 'aProperty');
      }, /Cannot call get with 'aProperty' on an undefined object/);
    }

    ['@test warn on attempts to get a property path of null']() {
      expectAssertion(function () {
        get(null, 'aProperty.on.aPath');
      }, /Cannot call get with 'aProperty.on.aPath' on an undefined object/);
    }

    ['@test warn on attempts to use get with an unsupported property path']() {
      let obj = {};
      expectAssertion(
        () => get(obj, null),
        /The key provided to get must be a string or number, you passed null/
      );
      expectAssertion(
        () => get(obj, NaN),
        /The key provided to get must be a string or number, you passed NaN/
      );
      expectAssertion(
        () => get(obj, undefined),
        /The key provided to get must be a string or number, you passed undefined/
      );
      expectAssertion(
        () => get(obj, false),
        /The key provided to get must be a string or number, you passed false/
      );
    }

    // ..........................................................
    // BUGS
    //

    ['@test (regression) watched properties on unmodified inherited objects should still return their original value'](
      assert
    ) {
      let MyMixin = Mixin.create({
        someProperty: 'foo',
        propertyDidChange: observer('someProperty', () => {}),
      });

      let baseObject = MyMixin.apply({});
      let theRealObject = Object.create(baseObject);

      assert.equal(
        get(theRealObject, 'someProperty'),
        'foo',
        'should return the set value, not false'
      );

      run(() => destroy(baseObject));
    }
  }
);
