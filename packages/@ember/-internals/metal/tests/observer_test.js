import { ENV } from '@ember/-internals/environment';
import {
  addObserver,
  removeObserver,
  notifyPropertyChange,
  defineProperty,
  computed,
  getCachedValueFor,
  Mixin,
  mixin,
  observer,
  beginPropertyChanges,
  endPropertyChanges,
  get,
  set,
} from '..';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { FUNCTION_PROTOTYPE_EXTENSIONS } from '@ember/deprecated-features';

function K() {}

// ..........................................................
// ADD OBSERVER
//

moduleFor(
  'addObserver',
  class extends AbstractTestCase {
    ['@test observer should assert to invalid input']() {
      expectAssertion(() => {
        observer(() => {});
      }, 'observer called without valid path');

      expectAssertion(() => {
        observer(null);
      }, 'observer must be provided a function or an observer definition');

      expectAssertion(() => {
        observer({});
      }, 'observer called without a function');

      expectAssertion(() => {
        observer({
          fn() {},
        });
      }, 'observer called without valid path');

      expectAssertion(() => {
        observer({
          fn() {},
          dependentKeys: [],
        });
      }, 'observer called without valid path');

      expectAssertion(() => {
        observer({
          fn() {},
          dependentKeys: ['foo'],
        });
      }, 'observer called without sync');
    }

    async ['@test observer should fire when property is modified'](assert) {
      let obj = {};
      let count = 0;

      addObserver(obj, 'foo', function() {
        assert.equal(get(obj, 'foo'), 'bar', 'should invoke AFTER value changed');
        count++;
      });

      set(obj, 'foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 1, 'should have invoked observer');
    }

    async ['@test observer should fire when dependent property is modified'](assert) {
      let obj = { bar: 'bar' };
      defineProperty(
        obj,
        'foo',
        computed('bar', function() {
          return get(this, 'bar').toUpperCase();
        })
      );

      get(obj, 'foo');

      let count = 0;
      addObserver(obj, 'foo', function() {
        assert.equal(get(obj, 'foo'), 'BAZ', 'should have invoked after prop change');
        count++;
      });

      set(obj, 'bar', 'baz');
      await runLoopSettled();

      assert.equal(count, 1, 'should have invoked observer');
    }

    // https://github.com/emberjs/ember.js/issues/18246
    async ['@test observer should fire when computed property is modified'](assert) {
      let obj = { bar: 'bar' };
      defineProperty(
        obj,
        'foo',
        computed('bar', {
          get() {
            return get(this, 'bar');
          },
          set(key, value) {
            return value;
          },
        })
      );

      get(obj, 'foo');

      let count = 0;
      addObserver(obj, 'foo', function() {
        assert.equal(get(obj, 'foo'), 'baz', 'should have invoked after prop change');
        count++;
      });

      set(obj, 'foo', 'baz');
      await runLoopSettled();

      assert.equal(count, 1, 'should have invoked observer');
      assert.equal(get(obj, 'foo'), 'baz', 'computed should have correct value');
    }

    async ['@test observer should continue to fire after dependent properties are accessed'](
      assert
    ) {
      let observerCount = 0;
      let obj = {};

      defineProperty(
        obj,
        'prop',
        computed(function() {
          return Math.random();
        })
      );
      defineProperty(
        obj,
        'anotherProp',
        computed('prop', function() {
          return get(this, 'prop') + Math.random();
        })
      );

      addObserver(obj, 'prop', function() {
        observerCount++;
      });

      get(obj, 'anotherProp');

      for (let i = 0; i < 10; i++) {
        notifyPropertyChange(obj, 'prop');
        await runLoopSettled();
      }

      assert.equal(observerCount, 10, 'should continue to fire indefinitely');
    }

    async ['@test observer added via Function.prototype extensions and brace expansion should fire when property changes'](
      assert
    ) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS && ENV.EXTEND_PROTOTYPES.Function) {
        let obj = {};
        let count = 0;

        expectDeprecation(() => {
          mixin(obj, {
            observeFooAndBar: function() {
              count++;
            }.observes('{foo,bar}'),
          });
        }, /Function prototype extensions have been deprecated, please migrate from function\(\){}.observes\('foo'\) to observer\('foo', function\(\) {}\)/);

        set(obj, 'foo', 'foo');
        await runLoopSettled();

        assert.equal(count, 1, 'observer specified via brace expansion invoked on property change');

        set(obj, 'bar', 'bar');
        await runLoopSettled();

        assert.equal(count, 2, 'observer specified via brace expansion invoked on property change');

        set(obj, 'baz', 'baz');
        await runLoopSettled();

        assert.equal(count, 2, 'observer not invoked on unspecified property');
      } else {
        assert.expect(0);
      }
    }

    async ['@test observer specified via Function.prototype extensions via brace expansion should fire when dependent property changes'](
      assert
    ) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS && ENV.EXTEND_PROTOTYPES.Function) {
        let obj = { baz: 'Initial' };
        let count = 0;

        defineProperty(
          obj,
          'foo',
          computed('bar', function() {
            return get(this, 'bar').toLowerCase();
          })
        );

        defineProperty(
          obj,
          'bar',
          computed('baz', function() {
            return get(this, 'baz').toUpperCase();
          })
        );

        expectDeprecation(() => {
          mixin(obj, {
            fooAndBarWatcher: function() {
              count++;
            }.observes('{foo,bar}'),
          });
        }, /Function prototype extensions have been deprecated, please migrate from function\(\){}.observes\('foo'\) to observer\('foo', function\(\) {}\)/);

        get(obj, 'foo');
        set(obj, 'baz', 'Baz');
        await runLoopSettled();

        // fire once for foo, once for bar
        assert.equal(
          count,
          2,
          'observer specified via brace expansion invoked on dependent property change'
        );

        set(obj, 'quux', 'Quux');
        await runLoopSettled();

        assert.equal(count, 2, 'observer not fired on unspecified property');
      } else {
        assert.expect(0);
      }
    }

    async ['@test observers watching multiple properties via brace expansion should fire when the properties change'](
      assert
    ) {
      let obj = {};
      let count = 0;

      mixin(obj, {
        observeFooAndBar: observer('{foo,bar}', function() {
          count++;
        }),
      });

      set(obj, 'foo', 'foo');
      await runLoopSettled();

      assert.equal(count, 1, 'observer specified via brace expansion invoked on property change');

      set(obj, 'bar', 'bar');
      await runLoopSettled();

      assert.equal(count, 2, 'observer specified via brace expansion invoked on property change');

      set(obj, 'baz', 'baz');
      await runLoopSettled();

      assert.equal(count, 2, 'observer not invoked on unspecified property');
    }

    async ['@test observers watching multiple properties via brace expansion should fire when dependent properties change'](
      assert
    ) {
      let obj = { baz: 'Initial' };
      let count = 0;

      defineProperty(
        obj,
        'foo',
        computed('bar', function() {
          return get(this, 'bar').toLowerCase();
        })
      );

      defineProperty(
        obj,
        'bar',
        computed('baz', function() {
          return get(this, 'baz').toUpperCase();
        })
      );

      mixin(obj, {
        fooAndBarWatcher: observer('{foo,bar}', function() {
          count++;
        }),
      });

      get(obj, 'foo');
      set(obj, 'baz', 'Baz');
      await runLoopSettled();

      // fire once for foo, once for bar
      assert.equal(
        count,
        2,
        'observer specified via brace expansion invoked on dependent property change'
      );

      set(obj, 'quux', 'Quux');
      await runLoopSettled();

      assert.equal(count, 2, 'observer not fired on unspecified property');
    }

    async ['@test removing an chain observer on change should not fail'](assert) {
      let foo = { bar: 'bar' };
      let obj1 = { foo: foo };
      let obj2 = { foo: foo };
      let obj3 = { foo: foo };
      let obj4 = { foo: foo };
      let count1 = 0;
      let count2 = 0;
      let count3 = 0;
      let count4 = 0;

      function observer1() {
        count1++;
      }
      function observer2() {
        count2++;
      }
      function observer3() {
        count3++;
        removeObserver(obj1, 'foo.bar', observer1);
        removeObserver(obj2, 'foo.bar', observer2);
        removeObserver(obj4, 'foo.bar', observer4);
      }
      function observer4() {
        count4++;
      }

      addObserver(obj1, 'foo.bar', observer1);
      addObserver(obj2, 'foo.bar', observer2);
      addObserver(obj3, 'foo.bar', observer3);
      addObserver(obj4, 'foo.bar', observer4);

      set(foo, 'bar', 'baz');
      await runLoopSettled();

      assert.equal(count1, 1, 'observer1 fired');
      assert.equal(count2, 1, 'observer2 fired');
      assert.equal(count3, 1, 'observer3 fired');
      assert.equal(count4, 0, 'observer4 did not fire');
    }

    async ['@test deferring property change notifications'](assert) {
      let obj = { foo: 'foo' };
      let fooCount = 0;

      addObserver(obj, 'foo', function() {
        fooCount++;
      });

      beginPropertyChanges();

      set(obj, 'foo', 'BIFF');
      set(obj, 'foo', 'BAZ');

      endPropertyChanges();

      await runLoopSettled();

      assert.equal(fooCount, 1, 'foo should have fired once');
    }

    async ['@test addObserver should respect targets with methods'](assert) {
      let observed = { foo: 'foo' };

      let target1 = {
        count: 0,

        didChange(obj, keyName) {
          let value = get(obj, keyName);
          assert.equal(this, target1, 'should invoke with this');
          assert.equal(obj, observed, 'param1 should be observed object');
          assert.equal(keyName, 'foo', 'param2 should be keyName');
          assert.equal(value, 'BAZ', 'param3 should new value');
          this.count++;
        },
      };

      let target2 = {
        count: 0,

        didChange(obj, keyName) {
          let value = get(obj, keyName);
          assert.equal(this, target2, 'should invoke with this');
          assert.equal(obj, observed, 'param1 should be observed object');
          assert.equal(keyName, 'foo', 'param2 should be keyName');
          assert.equal(value, 'BAZ', 'param3 should new value');
          this.count++;
        },
      };

      addObserver(observed, 'foo', target1, 'didChange');
      addObserver(observed, 'foo', target2, target2.didChange);

      set(observed, 'foo', 'BAZ');
      await runLoopSettled();

      assert.equal(target1.count, 1, 'target1 observer should have fired');
      assert.equal(target2.count, 1, 'target2 observer should have fired');
    }

    async ['@test addObserver should allow multiple objects to observe a property'](assert) {
      let observed = { foo: 'foo' };

      let target1 = {
        count: 0,

        didChange() {
          this.count++;
        },
      };

      let target2 = {
        count: 0,

        didChange() {
          this.count++;
        },
      };

      addObserver(observed, 'foo', target1, 'didChange');
      addObserver(observed, 'foo', target2, 'didChange');

      set(observed, 'foo', 'BAZ');
      await runLoopSettled();

      assert.equal(target1.count, 1, 'target1 observer should have fired');
      assert.equal(target2.count, 1, 'target2 observer should have fired');
    }
  }
);

// ..........................................................
// REMOVE OBSERVER
//

moduleFor(
  'removeObserver',
  class extends AbstractTestCase {
    async ['@test removing observer should stop firing'](assert) {
      let obj = {};
      let count = 0;
      function F() {
        count++;
      }
      addObserver(obj, 'foo', F);

      set(obj, 'foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 1, 'should have invoked observer');

      removeObserver(obj, 'foo', F);

      set(obj, 'foo', 'baz');
      await runLoopSettled();

      assert.equal(count, 1, "removed observer shouldn't fire");
    }

    async ['@test local observers can be removed'](assert) {
      let barObserved = 0;

      let MyMixin = Mixin.create({
        foo1: observer('bar', function() {
          barObserved++;
        }),

        foo2: observer('bar', function() {
          barObserved++;
        }),
      });

      let obj = {};
      MyMixin.apply(obj);

      set(obj, 'bar', 'HI!');
      await runLoopSettled();

      assert.equal(barObserved, 2, 'precond - observers should be fired');

      removeObserver(obj, 'bar', null, 'foo1');

      barObserved = 0;
      set(obj, 'bar', 'HI AGAIN!');
      await runLoopSettled();

      assert.equal(barObserved, 1, 'removed observers should not be called');
    }

    async ['@test removeObserver should respect targets with methods'](assert) {
      let observed = { foo: 'foo' };

      let target1 = {
        count: 0,

        didChange() {
          this.count++;
        },
      };

      let target2 = {
        count: 0,

        didChange() {
          this.count++;
        },
      };

      addObserver(observed, 'foo', target1, 'didChange');
      addObserver(observed, 'foo', target2, target2.didChange);

      set(observed, 'foo', 'BAZ');
      await runLoopSettled();

      assert.equal(target1.count, 1, 'target1 observer should have fired');
      assert.equal(target2.count, 1, 'target2 observer should have fired');

      removeObserver(observed, 'foo', target1, 'didChange');
      removeObserver(observed, 'foo', target2, target2.didChange);

      target1.count = target2.count = 0;
      set(observed, 'foo', 'BAZ');
      await runLoopSettled();

      assert.equal(target1.count, 0, 'target1 observer should not fire again');
      assert.equal(target2.count, 0, 'target2 observer should not fire again');
    }
  }
);

// ..........................................................
// CHAINED OBSERVERS
//

let obj, count;

moduleFor(
  'addObserver - dependentkey with chained properties',
  class extends AbstractTestCase {
    beforeEach() {
      obj = {
        foo: {
          bar: {
            baz: {
              biff: 'BIFF',
            },
          },
        },
        Capital: {
          foo: {
            bar: {
              baz: {
                biff: 'BIFF',
              },
            },
          },
        },
      };

      count = 0;
    }

    afterEach() {
      obj = count = null;
    }

    async ['@test depending on a chain with a computed property'](assert) {
      defineProperty(
        obj,
        'computed',
        computed(function() {
          return { foo: 'bar' };
        })
      );

      let changed = 0;
      addObserver(obj, 'computed.foo', function() {
        changed++;
      });

      assert.equal(
        getCachedValueFor(obj, 'computed'),
        undefined,
        'addObserver should not compute CP'
      );

      set(obj, 'computed.foo', 'baz');
      await runLoopSettled();

      assert.equal(changed, 1, 'should fire observer');
    }

    async ['@test depending on a simple chain'](assert) {
      let val;
      addObserver(obj, 'foo.bar.baz.biff', function(target, key) {
        val = get(target, key);
        count++;
      });

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      await runLoopSettled();

      assert.equal(val, 'BUZZ');
      assert.equal(count, 1);

      set(get(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
      await runLoopSettled();

      assert.equal(val, 'BLARG');
      assert.equal(count, 2);

      set(get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
      await runLoopSettled();

      assert.equal(val, 'BOOM');
      assert.equal(count, 3);

      set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
      await runLoopSettled();

      assert.equal(val, 'BLARG');
      assert.equal(count, 4);

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      await runLoopSettled();

      assert.equal(val, 'BUZZ');
      assert.equal(count, 5);

      let foo = get(obj, 'foo');

      set(obj, 'foo', 'BOO');
      await runLoopSettled();

      assert.equal(val, undefined);
      assert.equal(count, 6);

      set(foo.bar.baz, 'biff', 'BOOM');
      await runLoopSettled();

      assert.equal(count, 6, 'should be not have invoked observer');
    }

    async ['@test depending on a chain with a capitalized first key'](assert) {
      let val;

      addObserver(obj, 'Capital.foo.bar.baz.biff', function(target, key) {
        val = get(obj, key);
        count++;
      });

      set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
      await runLoopSettled();

      assert.equal(val, 'BUZZ');
      assert.equal(count, 1);

      set(get(obj, 'Capital.foo.bar'), 'baz', { biff: 'BLARG' });
      await runLoopSettled();

      assert.equal(val, 'BLARG');
      assert.equal(count, 2);

      set(get(obj, 'Capital.foo'), 'bar', { baz: { biff: 'BOOM' } });
      await runLoopSettled();

      assert.equal(val, 'BOOM');
      assert.equal(count, 3);

      set(obj, 'Capital.foo', { bar: { baz: { biff: 'BLARG' } } });
      await runLoopSettled();

      assert.equal(val, 'BLARG');
      assert.equal(count, 4);

      set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
      await runLoopSettled();

      assert.equal(val, 'BUZZ');
      assert.equal(count, 5);

      let foo = get(obj, 'foo');

      set(obj, 'Capital.foo', 'BOO');
      await runLoopSettled();

      assert.equal(val, undefined);
      assert.equal(count, 6);

      set(foo.bar.baz, 'biff', 'BOOM');
      await runLoopSettled();

      assert.equal(count, 6, 'should be not have invoked observer');
    }
  }
);

// ..........................................................
// SETTING IDENTICAL VALUES
//

moduleFor(
  'props/observer_test - setting identical values',
  class extends AbstractTestCase {
    async ['@test setting simple prop should not trigger'](assert) {
      let obj = { foo: 'bar' };
      let count = 0;

      addObserver(obj, 'foo', function() {
        count++;
      });

      set(obj, 'foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 0, 'should not trigger observer');

      set(obj, 'foo', 'baz');
      await runLoopSettled();

      assert.equal(count, 1, 'should trigger observer');

      set(obj, 'foo', 'baz');
      await runLoopSettled();

      assert.equal(count, 1, 'should not trigger observer again');
    }

    // The issue here is when a computed property is directly set with a value, then has a
    // dependent key change (which triggers a cache expiration and recomputation), observers will
    // not be fired if the CP setter is called with the last set value.
    async ['@test setting a cached computed property whose value has changed should trigger'](
      assert
    ) {
      let obj = {};

      defineProperty(
        obj,
        'foo',
        computed('baz', {
          get: function() {
            return get(this, 'baz');
          },
          set: function(key, value) {
            return value;
          },
        })
      );

      let count = 0;

      addObserver(obj, 'foo', function() {
        count++;
      });
      set(obj, 'foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 1);
      assert.equal(get(obj, 'foo'), 'bar');

      set(obj, 'baz', 'qux');
      await runLoopSettled();

      assert.equal(count, 2);
      assert.equal(get(obj, 'foo'), 'qux');

      set(obj, 'foo', 'bar');
      await runLoopSettled();

      assert.equal(count, 3);
      assert.equal(get(obj, 'foo'), 'bar');
    }
  }
);

moduleFor(
  'Keys behavior with observers',
  class extends AbstractTestCase {
    ['@test should not leak properties on the prototype'](assert) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();

      addObserver(beer, 'type', K);
      assert.deepEqual(Object.keys(beer), []);
      removeObserver(beer, 'type', K);
    }

    ['@test observing a non existent property'](assert) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();

      addObserver(beer, 'brand', K);

      assert.deepEqual(Object.keys(beer), []);

      set(beer, 'brand', 'Corona');
      assert.deepEqual(Object.keys(beer), ['brand']);

      removeObserver(beer, 'brand', K);
    }

    ['@test with observers switched on and off'](assert) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();

      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);

      assert.deepEqual(Object.keys(beer), []);
    }

    ['@test observers switched on and off with setter in between'](assert) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();

      addObserver(beer, 'type', K);
      set(beer, 'type', 'ale');
      removeObserver(beer, 'type', K);

      assert.deepEqual(Object.keys(beer), ['type']);
    }

    ['@test observer switched on and off and then setter'](assert) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();

      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);
      set(beer, 'type', 'ale');

      assert.deepEqual(Object.keys(beer), ['type']);
    }

    ['@test observers switched on and off with setter in between (observed property is not shadowing)'](
      assert
    ) {
      function Beer() {}

      let beer = new Beer();
      set(beer, 'type', 'ale');
      assert.deepEqual(Object.keys(beer), ['type'], 'only set');

      let otherBeer = new Beer();
      addObserver(otherBeer, 'type', K);
      set(otherBeer, 'type', 'ale');
      assert.deepEqual(Object.keys(otherBeer), ['type'], 'addObserver -> set');

      let yetAnotherBeer = new Beer();
      addObserver(yetAnotherBeer, 'type', K);
      set(yetAnotherBeer, 'type', 'ale');
      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);
      assert.deepEqual(
        Object.keys(yetAnotherBeer),
        ['type'],
        'addObserver -> set -> removeObserver'
      );

      let itsMyLastBeer = new Beer();
      set(itsMyLastBeer, 'type', 'ale');
      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);
      assert.deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
    }

    ['@test observers switched on and off with setter in between (observed property is shadowing one on the prototype)'](
      assert
    ) {
      function Beer() {}
      Beer.prototype.type = 'ipa';

      let beer = new Beer();
      set(beer, 'type', 'ale');
      assert.deepEqual(Object.keys(beer), ['type'], 'after set');

      let otherBeer = new Beer();
      addObserver(otherBeer, 'type', K);
      set(otherBeer, 'type', 'ale');
      assert.deepEqual(Object.keys(otherBeer), ['type'], 'addObserver -> set');

      let yetAnotherBeer = new Beer();
      addObserver(yetAnotherBeer, 'type', K);
      set(yetAnotherBeer, 'type', 'ale');
      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);
      assert.deepEqual(
        Object.keys(yetAnotherBeer),
        ['type'],
        'addObserver -> set -> removeObserver'
      );

      let itsMyLastBeer = new Beer();
      set(itsMyLastBeer, 'type', 'ale');
      addObserver(beer, 'type', K);
      removeObserver(beer, 'type', K);
      assert.deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
    }
  }
);
