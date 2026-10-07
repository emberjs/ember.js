import { DEBUG } from '@glimmer/env';
import {
  beginTrackFrame,
  beginUntrackFrame,
  consumeTag,
  createCache,
  createTag,
  debug,
  dirtyTag,
  endTrackFrame,
  getValue,
  isConst,
  isTracking,
  resetTracking,
  track,
  trackedData,
  untrack,
  validateTag,
  valueForTag,
} from '@glimmer/validator';

import { module, test } from './-utils';

module('@glimmer/validator: tracking', () => {
  module('track', () => {
    test('it combines tags that are consumed within a track frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consumeTag(tag1);
        consumeTag(tag2);
      });

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.notOk(validateTag(combined, snapshot));
    });

    test('it ignores tags consumed within an untrack frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consumeTag(tag1);

        untrack(() => {
          consumeTag(tag2);
        });
      });

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.ok(validateTag(combined, snapshot));
    });

    test('it does not automatically consume tags in nested tracking frames', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consumeTag(tag1);

        track(() => {
          consumeTag(tag2);
        });
      });

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.ok(validateTag(combined, snapshot));
    });

    test('it works for nested tags', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consumeTag(tag1);

        let tag3 = track(() => {
          consumeTag(tag2);
        });

        consumeTag(tag3);
      });

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.notOk(validateTag(combined, snapshot));
    });

    test('isTracking works within a track and untrack frame', (assert) => {
      assert.notOk(isTracking());

      track(() => {
        assert.step('track');
        assert.ok(isTracking());

        untrack(() => {
          assert.step('untrack');
          assert.notOk(isTracking());
        });
      });

      assert.verifySteps(['track', 'untrack']);
    });

    test('nested tracks work', (assert) => {
      assert.notOk(isTracking());

      track(() => {
        assert.step('track');
        assert.ok(isTracking());

        untrack(() => {
          assert.step('untrack');
          assert.notOk(isTracking());
        });
      });

      assert.verifySteps(['track', 'untrack']);
    });

    test('nested tracks and untracks work', (assert) => {
      track(() => {
        track(() => {
          untrack(() => {
            track(() => {
              assert.step('supernested');
              assert.ok(isTracking(), 'tracking');
            });
          });
        });
      });

      assert.verifySteps(['supernested']);
    });
  });

  module('manual track frames', () => {
    test('it combines tags that are consumed within a track frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();

      consumeTag(tag1);
      consumeTag(tag2);

      let combined = endTrackFrame();

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.notOk(validateTag(combined, snapshot));
    });

    test('it ignores tags consumed within an untrack frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();

      consumeTag(tag1);

      untrack(() => {
        consumeTag(tag2);
      });

      let combined = endTrackFrame();

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.ok(validateTag(combined, snapshot));
    });

    test('it does not automatically consume tags in nested tracking frames', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();

      consumeTag(tag1);

      // begin inner track frame
      beginTrackFrame();

      consumeTag(tag2);

      // end inner track frame
      endTrackFrame();

      let combined = endTrackFrame();

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.ok(validateTag(combined, snapshot));
    });

    test('it works for nested tags', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();

      consumeTag(tag1);

      // begin inner track frame
      beginTrackFrame();

      consumeTag(tag2);

      // end inner track frame
      let tag3 = endTrackFrame();

      consumeTag(tag3);

      let combined = endTrackFrame();

      let snapshot = valueForTag(combined);
      dirtyTag(tag1);
      assert.notOk(validateTag(combined, snapshot));

      snapshot = valueForTag(combined);
      dirtyTag(tag2);
      assert.notOk(validateTag(combined, snapshot));
    });

    test('it returns the tag itself if the frame consumed one tag many times', (assert) => {
      let tag = createTag();

      beginTrackFrame();

      consumeTag(tag);
      consumeTag(tag);

      assert.strictEqual(endTrackFrame(), tag);
    });

    test('it keeps a tag that a nested frame consumed between two consumptions', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();

      consumeTag(tag1);
      consumeTag(tag2);

      beginTrackFrame();
      consumeTag(tag1);
      let inner = endTrackFrame();

      consumeTag(tag1);

      let outer = endTrackFrame();

      assert.strictEqual(inner, tag1);

      let snapshot = valueForTag(outer);
      dirtyTag(tag1);
      assert.notOk(validateTag(outer, snapshot));

      snapshot = valueForTag(outer);
      dirtyTag(tag2);
      assert.notOk(validateTag(outer, snapshot));
    });

    test('it takes a tag one time if nested frames consume it at the same index', (assert) => {
      let tag = createTag();

      beginTrackFrame();

      for (let i = 0; i < 3; i++) {
        beginTrackFrame();
        consumeTag(tag);
        consumeTag(endTrackFrame());
      }

      assert.strictEqual(endTrackFrame(), tag);
    });

    test('it does not keep the tags of a frame that did not end', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();

      beginTrackFrame();
      consumeTag(tag1);

      resetTracking();

      beginTrackFrame();
      consumeTag(tag2);

      assert.strictEqual(endTrackFrame(), tag2);
    });

    test('it resets after a frame that began inside untrack frames', (assert) => {
      /**
       * Deeper than any other test goes,
       * so these depths have no tracker yet.
       */
      for (let i = 0; i < 100; i++) {
        beginUntrackFrame();
      }

      beginTrackFrame();

      resetTracking();

      assert.notOk(isTracking());
    });

    test('isTracking works within a track', (assert) => {
      assert.notOk(isTracking());

      beginTrackFrame();

      assert.ok(isTracking());

      endTrackFrame();
    });

    if (DEBUG) {
      test('asserts if track frame was ended without one existing', (assert) => {
        assert.throws(
          () => endTrackFrame(),
          /attempted to close a tracking frame, but one was not open/u
        );
      });
    }
  });

  module('tracking cache', () => {
    test('it memoizes based on tags that are consumed within a track frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let count = 0;

      let cache = createCache(() => {
        consumeTag(tag1);
        consumeTag(tag2);

        return ++count;
      });

      assert.strictEqual(getValue(cache), 1, 'called correctly the first time');
      assert.strictEqual(getValue(cache), 1, 'memoized result returned second time');

      dirtyTag(tag1);
      assert.strictEqual(getValue(cache), 2, 'cache busted when tag1 dirtied');
      assert.strictEqual(getValue(cache), 2, 'memoized result returned when nothing dirtied');

      dirtyTag(tag2);
      assert.strictEqual(getValue(cache), 3, 'cache busted when tag2 dirtied');
      assert.strictEqual(getValue(cache), 3, 'memoized result returned when nothing dirtied');
    });

    test('it ignores tags consumed within an untrack frame', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let count = 0;

      let cache = createCache(() => {
        consumeTag(tag1);

        untrack(() => consumeTag(tag2));

        return ++count;
      });

      assert.strictEqual(getValue(cache), 1, 'called correctly the first time');
      assert.strictEqual(getValue(cache), 1, 'memoized result returned second time');

      dirtyTag(tag1);
      assert.strictEqual(getValue(cache), 2, 'cache busted when tag1 dirtied');
      assert.strictEqual(getValue(cache), 2, 'memoized result returned when nothing dirtied');

      dirtyTag(tag2);
      assert.strictEqual(getValue(cache), 2, 'cache not busted when tag2 dirtied');
    });

    test('nested memoizations work, and automatically propogate', (assert) => {
      let innerTag = createTag();
      let outerTag = createTag();

      let innerCount = 0;
      let outerCount = 0;

      let innerCache = createCache(() => {
        consumeTag(innerTag);

        return ++innerCount;
      });

      let outerCache = createCache(() => {
        consumeTag(outerTag);

        return [++outerCount, getValue(innerCache)];
      });

      assert.deepEqual(
        getValue(outerCache),
        [1, 1],
        'both functions called correctly the first time'
      );
      assert.deepEqual(getValue(outerCache), [1, 1], 'memoized result returned correctly');

      dirtyTag(outerTag);

      assert.deepEqual(
        getValue(outerCache),
        [2, 1],
        'outer result updated, inner result still memoized'
      );
      assert.deepEqual(getValue(outerCache), [2, 1], 'memoized result returned correctly');

      dirtyTag(innerTag);

      assert.deepEqual(getValue(outerCache), [3, 2], 'both inner and outer result updated');
      assert.deepEqual(getValue(outerCache), [3, 2], 'memoized result returned correctly');
    });

    /**
     * The tag that a cache has after a read.
     *
     * The outer frame consumes only the tag of the cache,
     * and a frame with one tag returns that tag.
     */
    function tagOf(cache: ReturnType<typeof createCache>) {
      beginTrackFrame();
      getValue(cache);

      return endTrackFrame();
    }

    test('it keeps its tag if it consumes the same tags in the next run', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let count = 0;

      let cache = createCache(() => {
        consumeTag(tag1);
        consumeTag(tag2);

        return ++count;
      });

      let first = tagOf(cache);

      dirtyTag(tag1);

      let second = tagOf(cache);

      assert.strictEqual(count, 2, 'the cache ran again');
      assert.strictEqual(second, first, 'the cache has the tag of its first run');
    });

    test('it gets a new tag if it consumes other tags in the next run', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let tag3 = createTag();
      let useThird = false;
      let count = 0;

      let cache = createCache(() => {
        consumeTag(tag1);
        consumeTag(useThird ? tag3 : tag2);

        return ++count;
      });

      let first = tagOf(cache);

      useThird = true;
      dirtyTag(tag1);

      let second = tagOf(cache);

      assert.strictEqual(count, 2, 'the cache ran again');
      assert.notStrictEqual(second, first);
    });

    test('it gets a new tag if it consumes the same tags in another order', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let swap = false;
      let count = 0;

      let cache = createCache(() => {
        consumeTag(swap ? tag2 : tag1);
        consumeTag(swap ? tag1 : tag2);

        return ++count;
      });

      let first = tagOf(cache);

      swap = true;
      dirtyTag(tag1);

      let second = tagOf(cache);

      assert.strictEqual(count, 2, 'the cache ran again');
      assert.notStrictEqual(second, first);

      let snapshot = valueForTag(second);

      dirtyTag(tag2);
      assert.notOk(validateTag(second, snapshot), 'the new tag follows both tags');
    });

    test('it tracks the new tags if the tags change between two runs', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let tag3 = createTag();
      let useThird = false;
      let count = 0;

      let cache = createCache(() => {
        consumeTag(tag1);
        consumeTag(useThird ? tag3 : tag2);

        return ++count;
      });

      assert.strictEqual(getValue(cache), 1);

      dirtyTag(tag2);
      assert.strictEqual(getValue(cache), 2, 'the cache ran again with the same tags');

      dirtyTag(tag2);
      assert.strictEqual(getValue(cache), 3, 'the reused tag is still dirtied by its tags');

      useThird = true;
      dirtyTag(tag1);
      assert.strictEqual(getValue(cache), 4);

      dirtyTag(tag2);
      assert.strictEqual(getValue(cache), 4, 'the cache does not depend on the old tag');

      dirtyTag(tag3);
      assert.strictEqual(getValue(cache), 5, 'the cache depends on the new tag');
    });

    test('an outer cache runs again if a tag of a reused inner tag changes', (assert) => {
      let tag1 = createTag();
      let tag2 = createTag();
      let tag3 = createTag();
      let innerCount = 0;
      let outerCount = 0;

      let inner = createCache(() => {
        consumeTag(tag1);
        consumeTag(tag2);

        return ++innerCount;
      });

      let outer = createCache(() => {
        consumeTag(tag3);
        getValue(inner);

        return ++outerCount;
      });

      assert.strictEqual(getValue(outer), 1);

      dirtyTag(tag1);
      assert.strictEqual(getValue(outer), 2, 'the inner cache ran again with the same tags');
      assert.strictEqual(innerCount, 2);

      dirtyTag(tag2);
      assert.strictEqual(getValue(outer), 3, 'the outer cache follows the reused inner tag');
      assert.strictEqual(innerCount, 3);

      dirtyTag(tag3);
      assert.strictEqual(getValue(outer), 4);
      assert.strictEqual(innerCount, 3, 'the inner cache did not run again');

      dirtyTag(tag1);
      assert.strictEqual(getValue(outer), 5, 'the outer cache still follows the inner tag');
      assert.strictEqual(innerCount, 4);
    });

    test('isTracking works within a memoized function and untrack frame', (assert) => {
      assert.notOk(isTracking());

      let cache = createCache(() => {
        assert.step('cache called');
        assert.ok(isTracking());

        untrack(() => {
          assert.step('untrack');
          assert.notOk(isTracking());
        });
      });

      getValue(cache);

      assert.verifySteps(['cache called', 'untrack']);
    });

    test('isConst allows users to check if a memoized function is constant', (assert) => {
      let tag = createTag();

      let constCache = createCache(() => {
        // do nothing;
      });

      let nonConstCache = createCache(() => {
        consumeTag(tag);
      });

      getValue(constCache);
      getValue(nonConstCache);

      assert.ok(isConst(constCache), 'constant cache returns true');
      assert.notOk(isConst(nonConstCache), 'non-constant cache returns false');
    });

    if (DEBUG) {
      test('createCache throws an error in import.meta.env.DEV mode if users to use with a non-function', (assert) => {
        assert.throws(
          () => createCache(123 as any),
          /Error: createCache\(\) must be passed a function as its first parameter. Called with: 123/u
        );
      });

      test('getValue throws an error in import.meta.env.DEV mode if users to use with a non-cache', (assert) => {
        assert.throws(
          () => getValue(123 as any),
          /Error: getValue\(\) can only be used on an instance of a cache created with createCache\(\). Called with: 123/u
        );
      });

      test('isConst throws an error in import.meta.env.DEV mode if users attempt to check a function before it has been called', (assert) => {
        let cache = createCache(() => {
          // do nothing;
        });

        assert.throws(
          () => isConst(cache),
          /Error: isConst\(\) can only be used on a cache once getValue\(\) has been called at least once/u
        );
      });

      test('isConst throws an error in import.meta.env.DEV mode if users attempt to use with a non-cache', (assert) => {
        assert.throws(
          () => isConst(123 as any),
          /Error: isConst\(\) can only be used on an instance of a cache created with createCache\(\). Called with: 123/u
        );
      });
    }
  });

  module('trackedData', () => {
    test('it creates a storage cell that can be accessed and updated', (assert) => {
      class Foo {
        foo = 123;
      }

      let { getter, setter } = trackedData<Foo, keyof Foo>('foo');

      let foo = new Foo();

      setter(foo, 456);
      assert.strictEqual(getter(foo), 456, 'value is set correctly');
      assert.strictEqual(foo.foo, 123, 'value is not set on the actual object');
    });

    test('it can receive an initializer', (assert) => {
      class Foo {
        foo = 123;
        bar = 456;
      }

      let { getter } = trackedData<Foo, keyof Foo>('foo', function (this: Foo) {
        return this.bar;
      });

      let foo = new Foo();

      assert.strictEqual(getter(foo), 456, 'value is initialized correctly');
      assert.strictEqual(foo.foo, 123, 'value is not set on the actual object');
    });

    test('it tracks changes to the storage cell', (assert) => {
      class Foo {
        foo = 123;
        bar = 456;
      }

      let { getter, setter } = trackedData<Foo, keyof Foo>('foo', function (this: Foo) {
        return this.bar;
      });

      let foo = new Foo();
      let tag = track(() => {
        assert.strictEqual(getter(foo), 456, 'value is set correctly');
      });

      let snapshot = valueForTag(tag);

      setter(foo, 789);
      assert.notOk(validateTag(tag, snapshot));
    });

    if (DEBUG) {
      test('it errors when attempting to update a value already consumed in the same transaction', (assert) => {
        class Foo {
          foo = 123;
          bar = 456;
        }

        let { getter, setter } = trackedData<Foo, keyof Foo>('foo', function (this: Foo) {
          return this.bar;
        });

        let foo = new Foo();

        assert.throws(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          debug.runInTrackingTransaction!(() => {
            track(() => {
              getter(foo);
              setter(foo, 789);
            });
          });
        }, /You attempted to update `foo` on `Foo`/);
      });
    }
  });

  if (DEBUG) {
    module('debug', () => {
      test('it errors when attempting to update a value that has already been consumed in the same transaction', (assert) => {
        let tag = createTag();

        assert.throws(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
              dirtyTag(tag);
            });
          });
        }, /Error: Assertion Failed: You attempted to update `undefined`/u);
      });

      test('it throws errors across track frames within the same debug transaction', (assert) => {
        let tag = createTag();

        assert.throws(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
            });

            track(() => {
              dirtyTag(tag);
            });
          });
        }, /Error: Assertion Failed: You attempted to update `undefined`/u);
      });

      test('it ignores untrack for consumption', (assert) => {
        assert.expect(0);
        let tag = createTag();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        debug.runInTrackingTransaction!(() => {
          untrack(() => {
            consumeTag(tag);
          });

          track(() => {
            dirtyTag(tag);
          });
        });
      });

      test('it does not ignore untrack for dirty', (assert) => {
        let tag = createTag();

        assert.throws(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
            });

            untrack(() => {
              dirtyTag(tag);
            });
          });
        }, /Error: Assertion Failed: You attempted to update `undefined`/u);
      });
    });
  }
});
