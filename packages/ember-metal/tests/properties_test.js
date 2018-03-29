import { computed, defineProperty, deprecateProperty } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'defineProperty',
  class extends AbstractTestCase {
    ['@test toString'](assert) {
      let obj = {};
      defineProperty(obj, 'toString', undefined, function() {
        return 'FOO';
      });
      assert.equal(obj.toString(), 'FOO', 'should replace toString');
    }

    ['@test for data properties, didDefineProperty hook should be called if implemented'](
      assert
    ) {
      assert.expect(2);

      let obj = {
        didDefineProperty(obj, keyName, value) {
          assert.equal(keyName, 'foo', 'key name should be foo');
          assert.equal(value, 'bar', 'value should be bar');
        }
      };

      defineProperty(obj, 'foo', undefined, 'bar');
    }

    ['@test for computed properties, didDefineProperty hook should be called if implemented'](
      assert
    ) {
      assert.expect(2);

      let computedProperty = computed(function() {
        return this;
      });

      let obj = {
        didDefineProperty(obj, keyName, value) {
          assert.equal(keyName, 'foo', 'key name should be foo');
          assert.strictEqual(
            value,
            computedProperty,
            'value should be passed as computed property'
          );
        }
      };

      defineProperty(obj, 'foo', computedProperty);
    }

    ['@test for descriptor properties, didDefineProperty hook should be called if implemented'](
      assert
    ) {
      assert.expect(2);

      let descriptor = {
        writable: true,
        configurable: false,
        enumerable: true,
        value: 42
      };

      let obj = {
        didDefineProperty(obj, keyName, value) {
          assert.equal(keyName, 'answer', 'key name should be answer');
          assert.strictEqual(
            value,
            descriptor,
            'value should be passed as descriptor'
          );
        }
      };

      defineProperty(obj, 'answer', descriptor);
    }
  }
);

moduleFor(
  'Ember.deprecateProperty',
  class extends AbstractTestCase {
    ['@test enables access to deprecated property and returns the value of the new property'](
      assert
    ) {
      assert.expect(3);
      let obj = { foo: 'bar' };

      deprecateProperty(obj, 'baz', 'foo');

      expectDeprecation();
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');

      obj.foo = 'blammo';
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');
    }

    ['@test deprecatedKey is not enumerable'](assert) {
      assert.expect(2);
      let obj = { foo: 'bar', blammo: 'whammy' };

      deprecateProperty(obj, 'baz', 'foo');

      for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          assert.notEqual(prop, 'baz');
        }
      }
    }

    ['@test enables setter to deprecated property and updates the value of the new property'](
      assert
    ) {
      assert.expect(3);
      let obj = { foo: 'bar' };

      deprecateProperty(obj, 'baz', 'foo');

      expectDeprecation();
      obj.baz = 'bloop';
      assert.equal(obj.foo, 'bloop', 'updating baz updates foo');
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');
    }
  }
);
