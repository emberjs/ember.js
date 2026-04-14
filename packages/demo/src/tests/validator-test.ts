/**
 * Tests for the GXT compat validator.ts module.
 *
 * Covers: track, isTracking, tagFor, dirtyTagFor, consumeTag, validateTag,
 *         valueForTag, createUpdatableTag, createCache, getValue, isConst,
 *         trackedArray, trackedObject, untrack, createCell/cell helpers.
 */

declare const QUnit: any;

QUnit.module('Compat: validator.ts', function () {
  // ------------------------------------------------------------------ track()
  QUnit.module('track()', function () {
    QUnit.test('returns a tag object with _isTrackTag', async function (assert: any) {
      const { track } = await import('../../compat/validator');
      const tag = track(() => {});
      assert.ok(tag, 'track returns a value');
      assert.strictEqual(tag._isTrackTag, true, 'tag has _isTrackTag marker');
    });

    QUnit.test('tag has a numeric value property', async function (assert: any) {
      const { track } = await import('../../compat/validator');
      const tag = track(() => {});
      assert.strictEqual(typeof tag.value, 'number', 'tag.value is a number');
    });

    QUnit.test('captures consumed tags', async function (assert: any) {
      const { track, consumeTag, createUpdatableTag } = await import('../../compat/validator');
      const updatable = createUpdatableTag();
      const tag = track(() => {
        consumeTag(updatable);
      });
      assert.ok(tag._consumed, 'consumed set is populated');
      assert.ok(tag._consumed.length > 0, 'at least one tag was consumed');
    });
  });

  // -------------------------------------------------------------- isTracking()
  QUnit.module('isTracking()', function () {
    QUnit.test('returns false outside track()', async function (assert: any) {
      const { isTracking } = await import('../../compat/validator');
      assert.strictEqual(isTracking(), false, 'not tracking outside track()');
    });

    QUnit.test('returns true inside track()', async function (assert: any) {
      const { isTracking, track } = await import('../../compat/validator');
      let insideValue = false;
      track(() => {
        insideValue = isTracking();
      });
      assert.strictEqual(insideValue, true, 'tracking inside track()');
    });
  });

  // ----------------------------------------------------------------- tagFor()
  QUnit.module('tagFor()', function () {
    QUnit.test('returns a tag for an object+key', async function (assert: any) {
      const { tagFor } = await import('../../compat/validator');
      const obj = { x: 1 };
      const tag = tagFor(obj, 'x');
      assert.ok(tag, 'tagFor returns a truthy value');
    });

    QUnit.test('returns consistent tag for the same obj+key', async function (assert: any) {
      const { tagFor } = await import('../../compat/validator');
      const obj = { x: 1 };
      const tag1 = tagFor(obj, 'x');
      const tag2 = tagFor(obj, 'x');
      assert.strictEqual(tag1, tag2, 'same tag returned for same obj+key');
    });

    QUnit.test('returns different tags for different keys', async function (assert: any) {
      const { tagFor } = await import('../../compat/validator');
      const obj = { a: 1, b: 2 };
      const tagA = tagFor(obj, 'a');
      const tagB = tagFor(obj, 'b');
      assert.notStrictEqual(tagA, tagB, 'different keys produce different tags');
    });

    QUnit.test('handles Symbol keys gracefully', async function (assert: any) {
      const { tagFor } = await import('../../compat/validator');
      const sym = Symbol('myKey');
      const obj = {};
      const tag = tagFor(obj, sym);
      assert.ok(tag, 'tagFor handles Symbol keys without throwing');
    });
  });

  // ------------------------------------------------------------ dirtyTagFor()
  QUnit.module('dirtyTagFor()', function () {
    QUnit.test('marks a tag as dirty (invalidates validation)', async function (assert: any) {
      const { tagFor, dirtyTagFor, validateTag, valueForTag } = await import('../../compat/validator');
      const obj = { v: 0 };
      const tag = tagFor(obj, 'v');
      const rev = valueForTag(tag);
      assert.ok(validateTag(tag, rev), 'valid before dirty');
      dirtyTagFor(obj, 'v');
      assert.notOk(validateTag(tag, rev), 'invalid after dirty');
    });

    QUnit.test('handles Symbol keys', async function (assert: any) {
      const { tagFor, dirtyTagFor, validateTag, valueForTag } = await import('../../compat/validator');
      const sym = Symbol('s');
      const obj = {};
      const tag = tagFor(obj, sym);
      const rev = valueForTag(tag);
      dirtyTagFor(obj, sym);
      assert.notOk(validateTag(tag, rev), 'tag invalidated for Symbol key');
    });
  });

  // ------------------------------------------------------------ consumeTag()
  QUnit.module('consumeTag()', function () {
    QUnit.test('is a no-op when called with null/undefined', async function (assert: any) {
      const { consumeTag } = await import('../../compat/validator');
      consumeTag(null);
      consumeTag(undefined);
      assert.ok(true, 'no error thrown for null/undefined');
    });

    QUnit.test('registers tag consumption during track()', async function (assert: any) {
      const { consumeTag, track, createUpdatableTag } = await import('../../compat/validator');
      const updatable = createUpdatableTag();
      const tag = track(() => {
        consumeTag(updatable);
      });
      assert.ok(tag._consumed && tag._consumed.length > 0, 'tag was consumed in track frame');
    });
  });

  // ---------------------------------------------------------- validateTag()
  QUnit.module('validateTag()', function () {
    QUnit.test('returns true when no revision provided', async function (assert: any) {
      const { validateTag, tagFor } = await import('../../compat/validator');
      const obj = {};
      const tag = tagFor(obj, 'k');
      assert.ok(validateTag(tag, undefined), 'always valid when revision is undefined');
    });

    QUnit.test('returns true for null tag', async function (assert: any) {
      const { validateTag } = await import('../../compat/validator');
      assert.ok(validateTag(null, 0), 'null tag is always valid');
    });

    QUnit.test('returns true before dirty, false after', async function (assert: any) {
      const { tagFor, dirtyTagFor, validateTag, valueForTag } = await import('../../compat/validator');
      const obj = { k: 1 };
      const tag = tagFor(obj, 'k');
      const rev = valueForTag(tag);
      assert.ok(validateTag(tag, rev), 'valid before dirty');
      dirtyTagFor(obj, 'k');
      assert.notOk(validateTag(tag, rev), 'invalid after dirty');
    });
  });

  // ---------------------------------------------------------- valueForTag()
  QUnit.module('valueForTag()', function () {
    QUnit.test('returns a number for a regular tag', async function (assert: any) {
      const { tagFor, valueForTag } = await import('../../compat/validator');
      const obj = {};
      const tag = tagFor(obj, 'a');
      assert.strictEqual(typeof valueForTag(tag), 'number', 'revision is a number');
    });

    QUnit.test('returns 0 for null/undefined', async function (assert: any) {
      const { valueForTag } = await import('../../compat/validator');
      assert.strictEqual(valueForTag(null), 0, '0 for null');
      assert.strictEqual(valueForTag(undefined), 0, '0 for undefined');
    });

    QUnit.test('returns the number itself for numeric tags', async function (assert: any) {
      const { valueForTag } = await import('../../compat/validator');
      assert.strictEqual(valueForTag(42), 42, 'returns the number directly');
    });

    QUnit.test('revision increases after dirty', async function (assert: any) {
      const { tagFor, dirtyTagFor, valueForTag } = await import('../../compat/validator');
      const obj = { z: 0 };
      const tag = tagFor(obj, 'z');
      const rev1 = valueForTag(tag);
      dirtyTagFor(obj, 'z');
      const rev2 = valueForTag(tag);
      assert.ok(rev2 > rev1, 'revision increased after dirty');
    });
  });

  // ------------------------------------------------------- createUpdatableTag()
  QUnit.module('createUpdatableTag()', function () {
    QUnit.test('creates a tag with value and dirty()', async function (assert: any) {
      const { createUpdatableTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      assert.strictEqual(typeof tag.value, 'number', 'has numeric value');
      assert.strictEqual(typeof tag.dirty, 'function', 'has dirty()');
    });

    QUnit.test('dirty() bumps the value', async function (assert: any) {
      const { createUpdatableTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      const v1 = tag.value;
      tag.dirty();
      const v2 = tag.value;
      assert.ok(v2 > v1, 'value increased after dirty()');
    });

    QUnit.test('each dirty() produces a new value', async function (assert: any) {
      const { createUpdatableTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      const values = new Set<number>();
      values.add(tag.value);
      for (let i = 0; i < 5; i++) {
        tag.dirty();
        values.add(tag.value);
      }
      assert.strictEqual(values.size, 6, 'each dirty() produces a unique value');
    });
  });

  // ------------------------------------------------------------ createCache()
  QUnit.module('createCache()', function () {
    QUnit.test('lazily evaluates the function', async function (assert: any) {
      const { createCache, getValue } = await import('../../compat/validator');
      let called = false;
      const cache = createCache(() => {
        called = true;
        return 42;
      });
      assert.notOk(called, 'not called until value is read');
      const v = getValue(cache);
      assert.ok(called, 'called after getValue');
      assert.strictEqual(v, 42, 'returns correct value');
    });

    QUnit.test('caches the result on repeated reads', async function (assert: any) {
      const { createCache, getValue } = await import('../../compat/validator');
      let count = 0;
      const cache = createCache(() => ++count);
      getValue(cache);
      getValue(cache);
      getValue(cache);
      assert.strictEqual(count, 1, 'function called only once');
    });

    QUnit.test('re-evaluates when a consumed tag is dirtied', async function (assert: any) {
      const { createCache, getValue, consumeTag, createUpdatableTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      let count = 0;
      const cache = createCache(() => {
        consumeTag(tag);
        return ++count;
      });
      assert.strictEqual(getValue(cache), 1, 'first eval');
      tag.dirty();
      assert.strictEqual(getValue(cache), 2, 'recomputed after tag dirty');
    });
  });

  // -------------------------------------------------------------- getValue()
  QUnit.module('getValue()', function () {
    QUnit.test('retrieves value from cache object', async function (assert: any) {
      const { createCache, getValue } = await import('../../compat/validator');
      const cache = createCache(() => 'hello');
      assert.strictEqual(getValue(cache), 'hello', 'value retrieved');
    });

    QUnit.test('works on any object with a .value getter', async function (assert: any) {
      const { getValue } = await import('../../compat/validator');
      const fakeCache = { get value() { return 99; } };
      assert.strictEqual(getValue(fakeCache), 99, 'reads .value');
    });
  });

  // ---------------------------------------------------------------- isConst()
  QUnit.module('isConst()', function () {
    QUnit.test('returns true for CONSTANT_TAG', async function (assert: any) {
      const { isConst, CONSTANT_TAG } = await import('../../compat/validator');
      assert.ok(isConst(CONSTANT_TAG), 'CONSTANT_TAG is const');
    });

    QUnit.test('returns true for objects with isConst flag', async function (assert: any) {
      const { isConst } = await import('../../compat/validator');
      assert.ok(isConst({ isConst: true }), 'object with isConst=true');
    });

    QUnit.test('returns false for regular tags', async function (assert: any) {
      const { isConst, createUpdatableTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      assert.notOk(isConst(tag), 'updatable tag is not const');
    });
  });

  // ---------------------------------------------------------- trackedArray()
  QUnit.module('trackedArray()', function () {
    QUnit.test('returns a proxy that behaves like an array', async function (assert: any) {
      const { trackedArray } = await import('../../compat/validator');
      const arr = trackedArray([1, 2, 3]);
      assert.strictEqual(arr.length, 3, 'correct length');
      assert.strictEqual(arr[0], 1, 'index access works');
    });

    QUnit.test('push/pop mutate the array', async function (assert: any) {
      const { trackedArray } = await import('../../compat/validator');
      const arr = trackedArray<number>([]);
      arr.push(10);
      assert.strictEqual(arr.length, 1, 'length after push');
      assert.strictEqual(arr[0], 10, 'value after push');
      const popped = arr.pop();
      assert.strictEqual(popped, 10, 'popped value');
      assert.strictEqual(arr.length, 0, 'length after pop');
    });

    QUnit.test('index assignment works', async function (assert: any) {
      const { trackedArray } = await import('../../compat/validator');
      const arr = trackedArray([1, 2, 3]);
      arr[1] = 20;
      assert.strictEqual(arr[1], 20, 'index assignment reflected');
    });

    QUnit.test('defaults to empty array when no argument', async function (assert: any) {
      const { trackedArray } = await import('../../compat/validator');
      const arr = trackedArray();
      assert.strictEqual(arr.length, 0, 'empty by default');
    });
  });

  // --------------------------------------------------------- trackedObject()
  QUnit.module('trackedObject()', function () {
    QUnit.test('returns a proxy that reads/writes properties', async function (assert: any) {
      const { trackedObject } = await import('../../compat/validator');
      const obj = trackedObject({ name: 'Alice', age: 30 });
      assert.strictEqual(obj.name, 'Alice', 'reads initial value');
      obj.name = 'Bob';
      assert.strictEqual(obj.name, 'Bob', 'writes reflected');
    });

    QUnit.test('new properties can be added', async function (assert: any) {
      const { trackedObject } = await import('../../compat/validator');
      const obj = trackedObject<Record<string, any>>({});
      obj.foo = 'bar';
      assert.strictEqual(obj.foo, 'bar', 'dynamically added property');
    });

    QUnit.test('defaults to empty object when argument is falsy', async function (assert: any) {
      const { trackedObject } = await import('../../compat/validator');
      const obj = trackedObject(undefined as any);
      assert.ok(obj, 'returns an object');
      obj.x = 1;
      assert.strictEqual(obj.x, 1, 'can set properties');
    });
  });

  // ---------------------------------------------------------------- untrack()
  QUnit.module('untrack()', function () {
    QUnit.test('runs fn and returns its value', async function (assert: any) {
      const { untrack } = await import('../../compat/validator');
      const result = untrack(() => 42);
      assert.strictEqual(result, 42, 'returns fn result');
    });

    QUnit.test('isTracking is false inside untrack even when inside track', async function (assert: any) {
      const { untrack, track, isTracking } = await import('../../compat/validator');
      let innerTracking = true;
      track(() => {
        untrack(() => {
          innerTracking = isTracking();
        });
      });
      assert.strictEqual(innerTracking, false, 'not tracking inside untrack');
    });
  });

  // ------------------------------------------------ combine() and updateTag()
  QUnit.module('combine() and updateTag()', function () {
    QUnit.test('combine returns CONSTANT_TAG for empty array', async function (assert: any) {
      const { combine, CONSTANT_TAG } = await import('../../compat/validator');
      const tag = combine([]);
      assert.strictEqual(tag, CONSTANT_TAG, 'empty combine is CONSTANT_TAG');
    });

    QUnit.test('updateTag links outer to inner — outer invalidates when inner does', async function (assert: any) {
      const { tagFor, updateTag, dirtyTagFor, validateTag, valueForTag, combine } = await import('../../compat/validator');
      const obj = { a: 1, b: 2 };
      const outer = tagFor(obj, 'computed');
      const inner = combine([tagFor(obj, 'a'), tagFor(obj, 'b')]);
      updateTag(outer, inner);

      const rev = valueForTag(outer);
      assert.ok(validateTag(outer, rev), 'valid before dirty');

      dirtyTagFor(obj, 'a');
      assert.notOk(validateTag(outer, rev), 'invalid after dependency dirtied');
    });
  });

  // ------------------------------------------------------------ createTag()
  QUnit.module('createTag()', function () {
    QUnit.test('creates an updatable tag', async function (assert: any) {
      const { createTag } = await import('../../compat/validator');
      const tag = createTag();
      assert.strictEqual(typeof tag.value, 'number', 'has numeric value');
      assert.strictEqual(typeof tag.dirty, 'function', 'has dirty()');
    });
  });

  // ------------------------------------------------------------ dirtyTag()
  QUnit.module('dirtyTag()', function () {
    QUnit.test('marks an updatable tag as dirty', async function (assert: any) {
      const { createUpdatableTag, dirtyTag } = await import('../../compat/validator');
      const tag = createUpdatableTag();
      const v1 = tag.value;
      dirtyTag(tag);
      const v2 = tag.value;
      assert.ok(v2 > v1, 'value bumped after dirtyTag()');
    });
  });

  // ------------------------------------------------- CONSTANT_TAG / VOLATILE_TAG
  QUnit.module('special tags', function () {
    QUnit.test('CONSTANT_TAG is a number', async function (assert: any) {
      const { CONSTANT_TAG } = await import('../../compat/validator');
      assert.strictEqual(CONSTANT_TAG, 11, 'CONSTANT_TAG is 11');
    });

    QUnit.test('VOLATILE_TAG has a value that changes', async function (assert: any) {
      const { VOLATILE_TAG } = await import('../../compat/validator');
      assert.ok(VOLATILE_TAG, 'VOLATILE_TAG exists');
      assert.strictEqual(typeof VOLATILE_TAG.value, 'number', 'has numeric value');
    });
  });

  // ------------------------------------------- trackedData (backtracking)
  QUnit.module('trackedData()', function () {
    QUnit.test('getter/setter round-trip', async function (assert: any) {
      const { trackedData } = await import('../../compat/validator');
      const { getter, setter } = trackedData('name');
      const obj = {};
      setter(obj, 'Alice');
      assert.strictEqual(getter(obj), 'Alice', 'value stored and retrieved');
    });

    QUnit.test('initializer is called when no value set', async function (assert: any) {
      const { trackedData } = await import('../../compat/validator');
      const { getter } = trackedData('score', () => 100);
      const obj = {};
      assert.strictEqual(getter(obj), 100, 'initializer value returned');
    });
  });

  // ------------------------------------------- trackedMap / trackedSet
  QUnit.module('trackedMap()', function () {
    QUnit.test('wraps a Map with reactive operations', async function (assert: any) {
      const { trackedMap } = await import('../../compat/validator');
      const m = trackedMap<string, number>();
      m.set('a', 1);
      assert.strictEqual(m.get('a'), 1, 'set/get works');
      assert.strictEqual(m.size, 1, 'size is correct');
      m.delete('a');
      assert.strictEqual(m.size, 0, 'delete works');
    });
  });

  QUnit.module('trackedSet()', function () {
    QUnit.test('wraps a Set with reactive operations', async function (assert: any) {
      const { trackedSet } = await import('../../compat/validator');
      const s = trackedSet<number>();
      s.add(1);
      s.add(2);
      assert.strictEqual(s.size, 2, 'size is correct');
      assert.ok(s.has(1), 'has works');
      s.delete(1);
      assert.strictEqual(s.size, 1, 'delete works');
    });
  });

  // ----------------------------------------- bump() and frame helpers
  QUnit.module('bump()', function () {
    QUnit.test('increments internal revision', async function (assert: any) {
      const { bump } = await import('../../compat/validator');
      const r1 = bump();
      const r2 = bump();
      assert.ok(r2 > r1, 'revision increases');
    });
  });
});
