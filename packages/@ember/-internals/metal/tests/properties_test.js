import { defineProperty, deprecateProperty } from '..';
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

      deprecateProperty(obj, 'baz', 'foo', { id: 'baz-deprecation', until: 'some.version' });

      expectDeprecation();
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');

      obj.foo = 'blammo';
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');
    }

    ['@test deprecatedKey is not enumerable'](assert) {
      assert.expect(2);
      let obj = { foo: 'bar', blammo: 'whammy' };

      deprecateProperty(obj, 'baz', 'foo', { id: 'baz-deprecation', until: 'some.version' });

      for (let prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          assert.notEqual(prop, 'baz');
        }
      }
    }

    ['@test enables setter to deprecated property and updates the value of the new property'](
      assert
    ) {
      assert.expect(3);
      let obj = { foo: 'bar' };

      deprecateProperty(obj, 'baz', 'foo', { id: 'baz-deprecation', until: 'some.version' });

      expectDeprecation();
      obj.baz = 'bloop';
      assert.equal(obj.foo, 'bloop', 'updating baz updates foo');
      assert.equal(obj.baz, obj.foo, 'baz and foo are equal');
    }
  }
);
