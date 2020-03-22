import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { meta } from '..';

moduleFor(
  'Ember.meta',
  class extends AbstractTestCase {
    ['@test should return the same hash for an object'](assert) {
      let obj = {};

      meta(obj).foo = 'bar';

      assert.equal(meta(obj).foo, 'bar', 'returns same hash with multiple calls to Ember.meta()');
    }

    ['@test meta is not enumerable'](assert) {
      let proto, obj, props, prop;
      proto = { foo: 'bar' };
      meta(proto);
      obj = Object.create(proto);
      meta(obj);
      obj.bar = 'baz';
      props = [];
      for (prop in obj) {
        props.push(prop);
      }
      assert.deepEqual(props.sort(), ['bar', 'foo']);
      if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
        try {
          JSON.stringify(obj);
        } catch (e) {
          assert.ok(false, 'meta should not fail JSON.stringify');
        }
      }
    }
  }
);
