import { track, trackedMap, untrack, validateTag, valueForTag } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<ReturnType<typeof trackedMap<string, number>>>().toMatchTypeOf<Map<string, number>>();

module('@glimmer/validator: trackedMap', function () {
  test('constructor', (assert) => {
    const map = trackedMap([['foo', 123]]);

    assert.strictEqual(map.get('foo'), 123);
    assert.strictEqual(map.size, 1);
    assert.ok(map instanceof Map);

    const map2 = trackedMap(map);
    assert.strictEqual(map2.get('foo'), 123);
    assert.strictEqual(map2.size, 1);
    assert.ok(map2 instanceof Map);
  });

  test('works with all kinds of keys', (assert) => {
    // Spoiler: they are needed, as without them, types are inferred

    const map = trackedMap<unknown, unknown>([
      ['foo', 123],
      [{}, {}],
      [
        () => {
          /* no op! */
        },
        'bar',
      ],
      [123, true],
      [true, false],
      [null, null],
    ]);

    assert.strictEqual(map.size, 6);
  });

  test('get/set', (assert) => {
    const map = trackedMap();

    map.set('foo', 123);
    assert.strictEqual(map.get('foo'), 123);

    map.set('foo', 456);
    assert.strictEqual(map.get('foo'), 456);
  });

  test('getOrInsert', (assert) => {
    const map = trackedMap();

    if (
      'getOrInsert' in map &&
      typeof map.getOrInsert === 'function' &&
      'getOrInsert' in Map.prototype
    ) {
      let v = map.getOrInsert('foo', 123);
      assert.strictEqual(v, 123);

      assert.strictEqual(map.get('foo'), 123);

      // eslint-disable-next-line qunit/no-early-return
      return;
    }

    assert.ok('This browser has not implemented getOrInsert');
  });

  test('getOrInsertComputed', (assert) => {
    const map = trackedMap();

    if (
      'getOrInsertComputed' in map &&
      typeof map.getOrInsertComputed === 'function' &&
      'getOrInsertComputed' in Map.prototype
    ) {
      let v = map.getOrInsertComputed('foo', (key: string) => `${key}!`);
      assert.strictEqual(v, 'foo!');

      assert.strictEqual(map.get('foo'), 'foo!');

      // eslint-disable-next-line qunit/no-early-return
      return;
    }

    assert.ok('This browser has not implemented getOrInsert');
  });

  test('has', (assert) => {
    const map = trackedMap();

    assert.false(map.has('foo'));
    map.set('foo', 123);
    assert.true(map.has('foo'));
  });

  test('entries', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.entries();

    assert.deepEqual(iter.next().value, [0, 1]);
    assert.deepEqual(iter.next().value, [1, 2]);
    assert.deepEqual(iter.next().value, [2, 3]);
    assert.true(iter.next().done);
  });

  test('keys', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.keys();

    assert.strictEqual(iter.next().value, 0);
    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 2);
    assert.true(iter.next().done);
  });

  test('values', (assert) => {
    const map = trackedMap();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    const iter = map.values();

    assert.strictEqual(iter.next().value, 1);
    assert.strictEqual(iter.next().value, 2);
    assert.strictEqual(iter.next().value, 3);
    assert.true(iter.next().done);
  });

  test('forEach', (assert) => {
    const map = trackedMap<number, number>();
    map.set(0, 1);
    map.set(1, 2);
    map.set(2, 3);

    let count = 0;
    let values = '';

    map.forEach((v, k) => {
      count++;

      values += k;

      values += v;
    });

    assert.strictEqual(count, 3);
    assert.strictEqual(values, '011223');
  });

  test('size', (assert) => {
    const map = trackedMap();
    assert.strictEqual(map.size, 0);

    map.set(0, 1);
    assert.strictEqual(map.size, 1);

    map.set(1, 2);
    assert.strictEqual(map.size, 2);

    map.delete(1);
    assert.strictEqual(map.size, 1);

    map.set(0, 3);
    assert.strictEqual(map.size, 1);
  });

  test('delete', (assert) => {
    const map = trackedMap();

    assert.false(map.has(0));
    assert.false(map.delete(0), 'returns false when key does not exist');

    map.set(0, 123);
    assert.true(map.has(0));

    assert.true(map.delete(0), 'returns true when key exists');
    assert.false(map.has(0));
  });

  test('clear', (assert) => {
    const map = trackedMap();

    map.set(0, 1);
    map.set(1, 2);
    assert.strictEqual(map.size, 2);

    map.clear();
    assert.strictEqual(map.size, 0);
    assert.strictEqual(map.get(0), undefined);
    assert.strictEqual(map.get(1), undefined);
  });

  test('tracks object and function keys across set, delete, and clear', (assert) => {
    const obj = { id: 1 };
    const fn = () => 'hello';
    const map = trackedMap<object | (() => string), number | undefined>();

    let objTag = track(() => {
      assert.strictEqual(map.get(obj), undefined);
    });
    let fnTag = track(() => {
      assert.false(map.has(fn));
    });
    let objSnapshot = valueForTag(objTag);
    let fnSnapshot = valueForTag(fnTag);

    map.set(obj, 10);
    assert.false(validateTag(objTag, objSnapshot), 'setting object key invalidates its tag');
    assert.true(validateTag(fnTag, fnSnapshot), 'setting unrelated object does not invalidate fn');

    map.set(fn, undefined);
    assert.false(validateTag(fnTag, fnSnapshot), 'setting function key invalidates its tag');

    objTag = track(() => {
      assert.strictEqual(map.get(obj), 10);
    });
    fnTag = track(() => {
      assert.true(map.has(fn));
    });
    objSnapshot = valueForTag(objTag);
    fnSnapshot = valueForTag(fnTag);

    map.delete(obj);
    assert.false(validateTag(objTag, objSnapshot), 'deleting object key invalidates its tag');
    assert.true(validateTag(fnTag, fnSnapshot), 'deleting object key does not invalidate fn');

    map.clear();
    assert.false(
      validateTag(fnTag, fnSnapshot),
      'clearing map invalidates present function key even when mapped value is undefined'
    );
  });

  test('clear does not invalidate absent object keys and preserves future tracking', (assert) => {
    const present = { id: 'present' };
    const absent = { id: 'absent' };
    const map = trackedMap<object, number>([[present, 1]]);

    const presentTag = track(() => {
      assert.strictEqual(map.get(present), 1);
    });
    const absentGetTag = track(() => {
      assert.strictEqual(map.get(absent), undefined);
    });
    const absentHasTag = track(() => {
      assert.false(map.has(absent));
    });

    const presentSnapshot = valueForTag(presentTag);
    const absentGetSnapshot = valueForTag(absentGetTag);
    const absentHasSnapshot = valueForTag(absentHasTag);

    map.clear();
    assert.false(validateTag(presentTag, presentSnapshot), 'present object key is invalidated');
    assert.true(
      validateTag(absentGetTag, absentGetSnapshot),
      'absent object get is not invalidated'
    );
    assert.true(
      validateTag(absentHasTag, absentHasSnapshot),
      'absent object has is not invalidated'
    );

    map.set(absent, 2);
    assert.false(
      validateTag(absentGetTag, absentGetSnapshot),
      'setting previously absent object key after clear still invalidates get'
    );
    assert.false(
      validateTag(absentHasTag, absentHasSnapshot),
      'setting previously absent object key after clear still invalidates has'
    );
  });

  test('tracks primitive and symbol keys including NaN, null, undefined, and symbols', (assert) => {
    const unregisteredSym = Symbol('local');
    const registeredSym = Symbol.for('ember.trackedMap.test');
    const keys: unknown[] = ['a', 0, NaN, null, undefined, unregisteredSym, registeredSym];
    const map = trackedMap<unknown, number>();

    for (const key of keys) {
      const tag = track(() => {
        assert.strictEqual(map.get(key), undefined);
      });
      const snapshot = valueForTag(tag);

      map.set(key, 1);
      assert.false(validateTag(tag, snapshot), `setting ${String(key)} invalidates`);
    }

    const tags = keys.map((key) => {
      const tag = track(() => {
        assert.strictEqual(map.get(key), 1);
      });
      return { key, tag, snapshot: valueForTag(tag) };
    });

    map.clear();

    for (const { key, tag, snapshot } of tags) {
      assert.false(validateTag(tag, snapshot), `clearing invalidates ${String(key)}`);
    }
  });

  test('untracked and imperative reads do not interfere with subsequent tracked reads', (assert) => {
    const obj = { id: 1 };
    const map = trackedMap<object, number>();

    assert.strictEqual(map.get(obj), undefined);
    assert.false(map.has(obj));

    const untrackTag = track(() => {
      untrack(() => {
        assert.strictEqual(map.get(obj), undefined);
        assert.false(map.has(obj));
      });
    });
    const untrackSnapshot = valueForTag(untrackTag);

    const trackedTag = track(() => {
      assert.strictEqual(map.get(obj), undefined);
    });
    const trackedSnapshot = valueForTag(trackedTag);

    map.set(obj, 1);
    assert.true(validateTag(untrackTag, untrackSnapshot), 'untracked reads did not subscribe');
    assert.false(validateTag(trackedTag, trackedSnapshot), 'tracked read subscribed normally');
  });
});
