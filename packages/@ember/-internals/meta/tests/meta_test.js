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

    ['@test meta.writeWatching issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writeWatching('hello', 1);
      }, 'Cannot update watchers for `hello` on `<special-sauce:123>` after it has been destroyed.');
    }

    ['@test meta.writableTag issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writableTag(() => {});
      }, 'Cannot create a new tag for `<special-sauce:123>` after it has been destroyed.');
    }

    ['@test meta.writableChainWatchers issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writableChainWatchers(() => {});
      }, 'Cannot create a new chain watcher for `<special-sauce:123>` after it has been destroyed.');
    }

    ['@test meta.writableChains issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writableChains(() => {});
      }, 'Cannot create a new chains for `<special-sauce:123>` after it has been destroyed.');
    }

    ['@test meta.writeValues issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writeValues('derp', 'ohai');
      }, 'Cannot set the value of `derp` on `<special-sauce:123>` after it has been destroyed.');
    }

    ['@test meta.writeDeps issues useful error after destroy']() {
      let target = {
        toString() {
          return '<special-sauce:123>';
        },
      };
      let targetMeta = meta(target);

      targetMeta.destroy();

      expectAssertion(() => {
        targetMeta.writeDeps('derp', 'ohai', 1);
      }, 'Cannot modify dependent keys for `ohai` on `<special-sauce:123>` after it has been destroyed.');
    }
  }
);
