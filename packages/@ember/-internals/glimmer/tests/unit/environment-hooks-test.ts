import { hooks, toBool } from '@ember/-internals/glimmer/lib/hooks';
import toIterator from '@ember/-internals/glimmer/lib/utils/iterator';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { track, valueForTag, validateTag } from '@glimmer/validator';

/**
 * The whole test suite loads `@ember/-internals/metal`, `@ember/array`, and
 * `@ember/runloop`, which replace the default hooks. These tests call the
 * default implementations directly, the way an app that imports none of
 * those modules would.
 */
moduleFor(
  'environment hooks: defaults',
  class extends AbstractTestCase {
    ['@test getProp reads a plain property and tracks it'](assert: Assert) {
      let obj = { name: 'Zoey' };

      let tag = track(() => {
        assert.strictEqual(hooks.getProp(obj, 'name'), 'Zoey');
      });
      let snapshot = valueForTag(tag);

      hooks.setProp(obj, 'name', 'Tomster');

      assert.false(validateTag(tag, snapshot), 'the tracked read is invalidated by setProp');
      assert.strictEqual(obj.name, 'Tomster');
    }

    ['@test getPath and setPath walk dotted paths'](assert: Assert) {
      let obj = { person: { address: { city: 'Portland' } } };

      assert.strictEqual(hooks.getPath(obj, 'person.address.city'), 'Portland');
      assert.strictEqual(hooks.getPath(obj, 'person.missing.city'), undefined);

      hooks.setPath(obj, 'person.address.city', 'Berlin');
      assert.strictEqual(obj.person.address.city, 'Berlin');
    }

    ['@test toBool treats empty arrays as false'](assert: Assert) {
      assert.false(toBool([]));
      assert.true(toBool([1]));
      assert.false(toBool(''));
      assert.true(toBool('x'));
      assert.false(toBool(null));
    }

    ['@test toIterator handles arrays, iterables, and forEach'](assert: Assert) {
      let collect = (value: unknown) => {
        let iterator = toIterator(value);
        let items: unknown[] = [];

        if (iterator === null) return items;

        let next;
        while ((next = iterator.next()) !== null) {
          items.push(next.value);
        }

        return items;
      };

      assert.deepEqual(collect(['a', 'b']), ['a', 'b']);
      assert.deepEqual(collect(new Set(['a', 'b'])), ['a', 'b']);
      assert.deepEqual(collect(new Map([['k', 'v']])), [['k', 'v']]);
      assert.deepEqual(collect([]), []);
      assert.deepEqual(collect(null), []);
    }
  }
);
