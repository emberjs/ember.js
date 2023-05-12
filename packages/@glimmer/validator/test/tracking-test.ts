import {
  beginTrackFrame,
  consumeTag,
  createCache,
  createTag,
  debug,
  dirtyTag,
  endTrackFrame,
  getValue,
  isConst,
  isTracking,
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

    test('isTracking works within a track', (assert) => {
      assert.notOk(isTracking());

      beginTrackFrame();

      assert.ok(isTracking());

      endTrackFrame();
    });

    test('asserts if track frame was ended without one existing', (assert) => {
      assert.throws(
        () => endTrackFrame(),
        /attempted to close a tracking frame, but one was not open/u
      );
    });
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

    if (import.meta.env.DEV) {
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

    if (import.meta.env.DEV) {
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
          debug.runInTrackingTransaction!(() => {
            track(() => {
              getter(foo);
              setter(foo, 789);
            });
          });
        }, /You attempted to update `foo` on `\(an instance of/u);
      });
    }
  });

  if (import.meta.env.DEV) {
    module('debug', () => {
      test('it errors when attempting to update a value that has already been consumed in the same transaction', (assert) => {
        let tag = createTag();

        assert.throws(() => {
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
              dirtyTag(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/u);
      });

      test('it throws errors across track frames within the same debug transaction', (assert) => {
        let tag = createTag();

        assert.throws(() => {
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
            });

            track(() => {
              dirtyTag(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/u);
      });

      test('it ignores untrack for consumption', (assert) => {
        assert.expect(0);
        let tag = createTag();

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
          debug.runInTrackingTransaction!(() => {
            track(() => {
              consumeTag(tag);
            });

            untrack(() => {
              dirtyTag(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/u);
      });
    });
  }
});
