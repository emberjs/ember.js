import { module, test } from './-utils';

import { DEBUG } from '@glimmer/env';

import {
  consume,
  createTag,
  deprecateMutationsInAutotrackingTransaction,
  dirty,
  dirtyTagFor,
  isTracking,
  runInAutotrackingTransaction,
  setPropertyDidChange,
  tagFor,
  track,
  trackedData,
  untrack,
  validate,
  value,
} from '@glimmer/validator';

module('@glimmer/validator: tracking', () => {
  module('track', () => {
    test('it combines tags that are consumed within a track frame', assert => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consume(tag1);
        consume(tag2);
      });

      let snapshot = value(combined);
      dirty(tag1);
      assert.notOk(validate(combined, snapshot));

      snapshot = value(combined);
      dirty(tag2);
      assert.notOk(validate(combined, snapshot));
    });

    test('it ignores tags consumed within an untrack frame', assert => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consume(tag1);

        untrack(() => {
          consume(tag2);
        });
      });

      let snapshot = value(combined);
      dirty(tag1);
      assert.notOk(validate(combined, snapshot));

      snapshot = value(combined);
      dirty(tag2);
      assert.ok(validate(combined, snapshot));
    });

    test('it does not automatically consume tags in nested tracking frames', assert => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consume(tag1);

        track(() => {
          consume(tag2);
        });
      });

      let snapshot = value(combined);
      dirty(tag1);
      assert.notOk(validate(combined, snapshot));

      snapshot = value(combined);
      dirty(tag2);
      assert.ok(validate(combined, snapshot));
    });

    test('it works for nested tags', assert => {
      let tag1 = createTag();
      let tag2 = createTag();

      let combined = track(() => {
        consume(tag1);

        let tag3 = track(() => {
          consume(tag2);
        });

        consume(tag3);
      });

      let snapshot = value(combined);
      dirty(tag1);
      assert.notOk(validate(combined, snapshot));

      snapshot = value(combined);
      dirty(tag2);
      assert.notOk(validate(combined, snapshot));
    });

    test('isTracking works within a track and untrack frame', assert => {
      assert.notOk(isTracking());

      track(() => {
        assert.ok(isTracking());

        untrack(() => {
          assert.notOk(isTracking());
        });
      });
    });
  });

  module('trackedData', () => {
    test('it creates a storage cell that can be accessed and updated', assert => {
      class Foo {
        foo = 123;
      }

      let { getter, setter } = trackedData<Foo, keyof Foo>('foo');

      let foo = new Foo();

      setter(foo, 456);
      assert.equal(getter(foo), 456, 'value is set correctly');
      assert.equal(foo.foo, 123, 'value is not set on the actual object');
    });

    test('it can receive an initializer', assert => {
      class Foo {
        foo = 123;
      }

      let { getter } = trackedData<Foo, keyof Foo>('foo', () => 456);

      let foo = new Foo();

      assert.equal(getter(foo), 456, 'value is initialized correctly');
      assert.equal(foo.foo, 123, 'value is not set on the actual object');
    });

    test('it tracks changes to the storage cell', assert => {
      class Foo {
        foo = 123;
      }

      let { getter, setter } = trackedData<Foo, keyof Foo>('foo', () => 456);

      let foo = new Foo();
      let tag = track(() => {
        assert.equal(getter(foo), 456, 'value is set correctly');
      });

      let snapshot = value(tag);

      setter(foo, 789);
      assert.notOk(validate(tag, snapshot));
    });

    test('it calls propertyDidChange', assert => {
      assert.expect(1);

      setPropertyDidChange(() => {
        assert.ok(true, 'called');
      });

      class Foo {
        foo = 123;
      }

      let { setter } = trackedData<Foo, keyof Foo>('foo', () => 456);

      let foo = new Foo();
      setter(foo, 789);

      // cleanup
      setPropertyDidChange(() => {});
    });
  });

  if (DEBUG) {
    module('debug', () => {
      test('it errors when attempting to update a value that has already been consumed in the same transaction', assert => {
        let tag = createTag();

        assert.throws(() => {
          runInAutotrackingTransaction!(() => {
            track(() => {
              consume(tag);
              dirty(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/);
      });

      test('it throws errors across track frames within the same debug transaction', assert => {
        let tag = createTag();

        assert.throws(() => {
          runInAutotrackingTransaction!(() => {
            track(() => {
              consume(tag);
            });

            track(() => {
              dirty(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/);
      });

      test('it ignores untrack for consumption', assert => {
        assert.expect(0);
        let tag = createTag();

        runInAutotrackingTransaction!(() => {
          untrack(() => {
            consume(tag);
          });

          track(() => {
            dirty(tag);
          });
        });
      });

      test('it does not ignore untrack for dirty', assert => {
        let tag = createTag();

        assert.throws(() => {
          runInAutotrackingTransaction!(() => {
            track(() => {
              consume(tag);
            });

            untrack(() => {
              dirty(tag);
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/);
      });

      test('it can switch to warnings/deprecations', assert => {
        let tag = createTag();

        let originalConsoleWarn = console.warn;
        console.warn = () => {
          assert.ok(true);
        };

        runInAutotrackingTransaction!(() => {
          track(() => {
            deprecateMutationsInAutotrackingTransaction!(() => {
              consume(tag);
              dirty(tag);
            });
          });
        });

        console.warn = originalConsoleWarn;
      });

      test('it switches back to errors with nested track calls', assert => {
        let tag = createTag();

        assert.throws(() => {
          runInAutotrackingTransaction!(() => {
            deprecateMutationsInAutotrackingTransaction!(() => {
              track(() => {
                consume(tag);
                dirty(tag);
              });
            });
          });
        }, /Error: You attempted to update `\(an unknown tag\)`/);
      });

      test('it gets a better error message with tagFor', assert => {
        class Foo {}
        let foo = new Foo();

        assert.throws(() => {
          runInAutotrackingTransaction!(() => {
            deprecateMutationsInAutotrackingTransaction!(() => {
              track(() => {
                consume(tagFor(foo, 'bar'));
                dirtyTagFor(foo, 'bar');
              });
            });
          });
        }, /Error: You attempted to update `bar` on `\(an instance of Foo\)`/);
      });
    });
  }
});
