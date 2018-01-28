import { ENV } from 'ember-environment';
import { testBoth } from 'internal-test-helpers';
import {
  addObserver,
  removeObserver,
  notifyPropertyChange,
  defineProperty,
  computed,
  cacheFor,
  Mixin,
  mixin,
  observer,
  beginPropertyChanges,
  endPropertyChanges,
  changeProperties
} from '..';

function K() {}

// ..........................................................
// ADD OBSERVER
//

QUnit.module('addObserver');

testBoth('observer should assert to invalid input', function() {
  expectAssertion(()=> {
    observer(()=>{});
  }, 'observer called without valid path');

  expectAssertion(()=> {
    observer(null);
  }, 'observer called without a function');
});

testBoth('observer should fire when property is modified', function(get, set, assert) {
  let obj = {};
  let count = 0;

  addObserver(obj, 'foo', function() {
    assert.equal(get(obj, 'foo'), 'bar', 'should invoke AFTER value changed');
    count++;
  });

  set(obj, 'foo', 'bar');
  assert.equal(count, 1, 'should have invoked observer');
});

testBoth('observer should fire when dependent property is modified', function(get, set, assert) {
  let obj = { bar: 'bar' };
  defineProperty(obj, 'foo', computed(function() {
    return get(this, 'bar').toUpperCase();
  }).property('bar'));

  get(obj, 'foo');

  let count = 0;
  addObserver(obj, 'foo', function() {
    assert.equal(get(obj, 'foo'), 'BAZ', 'should have invoked after prop change');
    count++;
  });

  set(obj, 'bar', 'baz');
  assert.equal(count, 1, 'should have invoked observer');
});

testBoth('observer should continue to fire after dependent properties are accessed', function(get, set, assert) {
  let observerCount = 0;
  let obj = {};

  defineProperty(obj, 'prop', computed(function () { return Math.random(); }));
  defineProperty(obj, 'anotherProp', computed('prop', function () { return get(this, 'prop') + Math.random(); }));

  addObserver(obj, 'prop', function () { observerCount++; });

  get(obj, 'anotherProp');

  for (let i = 0; i < 10; i++) {
    notifyPropertyChange(obj, 'prop');
  }

  assert.equal(observerCount, 10, 'should continue to fire indefinitely');
});

if (ENV.EXTEND_PROTOTYPES.Function) {
  testBoth('observer added declaratively via brace expansion should fire when property changes', function(get, set, assert) {
    let obj = { };
    let count = 0;

    mixin(obj, {
      observeFooAndBar: function () {
        count++;
      }.observes('{foo,bar}')
    });

    set(obj, 'foo', 'foo');
    assert.equal(count, 1, 'observer specified via brace expansion invoked on property change');

    set(obj, 'bar', 'bar');
    assert.equal(count, 2, 'observer specified via brace expansion invoked on property change');

    set(obj, 'baz', 'baz');
    assert.equal(count, 2, 'observer not invoked on unspecified property');
  });

  testBoth('observer specified declaratively via brace expansion should fire when dependent property changes', function(get, set, assert) {
    let obj = { baz: 'Initial' };
    let count = 0;

    defineProperty(obj, 'foo', computed(function() {
      return get(this, 'bar').toLowerCase();
    }).property('bar'));

    defineProperty(obj, 'bar', computed(function() {
      return get(this, 'baz').toUpperCase();
    }).property('baz'));

    mixin(obj, {
      fooAndBarWatcher: function () {
        count++;
      }.observes('{foo,bar}')
    });

    get(obj, 'foo');
    set(obj, 'baz', 'Baz');
    // fire once for foo, once for bar
    assert.equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

    set(obj, 'quux', 'Quux');
    assert.equal(count, 2, 'observer not fired on unspecified property');
  });
}

testBoth('observers watching multiple properties via brace expansion should fire when the properties change', function(get, set, assert) {
  let obj = { };
  let count = 0;

  mixin(obj, {
    observeFooAndBar: observer('{foo,bar}', function () {
      count++;
    })
  });

  set(obj, 'foo', 'foo');
  assert.equal(count, 1, 'observer specified via brace expansion invoked on property change');

  set(obj, 'bar', 'bar');
  assert.equal(count, 2, 'observer specified via brace expansion invoked on property change');

  set(obj, 'baz', 'baz');
  assert.equal(count, 2, 'observer not invoked on unspecified property');
});

testBoth('observers watching multiple properties via brace expansion should fire when dependent properties change', function(get, set, assert) {
  let obj = { baz: 'Initial' };
  let count = 0;

  defineProperty(obj, 'foo', computed(function() {
    return get(this, 'bar').toLowerCase();
  }).property('bar'));

  defineProperty(obj, 'bar', computed(function() {
    return get(this, 'baz').toUpperCase();
  }).property('baz'));

  mixin(obj, {
    fooAndBarWatcher: observer('{foo,bar}', function () {
      count++;
    })
  });

  get(obj, 'foo');
  set(obj, 'baz', 'Baz');
  // fire once for foo, once for bar
  assert.equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

  set(obj, 'quux', 'Quux');
  assert.equal(count, 2, 'observer not fired on unspecified property');
});

testBoth('nested observers should fire in order', function(get, set, assert) {
  let obj = { foo: 'foo', bar: 'bar' };
  let fooCount = 0;
  let barCount = 0;

  addObserver(obj, 'foo', function() { fooCount++; });
  addObserver(obj, 'bar', function() {
    set(obj, 'foo', 'BAZ');
    assert.equal(fooCount, 1, 'fooCount should have fired already');
    barCount++;
  });

  set(obj, 'bar', 'BIFF');
  assert.equal(barCount, 1, 'barCount should have fired');
  assert.equal(fooCount, 1, 'foo should have fired');
});

testBoth('removing an chain observer on change should not fail', function(get, set, assert) {
  let foo = { bar: 'bar' };
  let obj1 = { foo: foo };
  let obj2 = { foo: foo };
  let obj3 = { foo: foo };
  let obj4 = { foo: foo };
  let count1 = 0;
  let count2 = 0;
  let count3 = 0;
  let count4 = 0;

  function observer1() { count1++; }
  function observer2() { count2++; }
  function observer3() {
    count3++;
    removeObserver(obj1, 'foo.bar', observer1);
    removeObserver(obj2, 'foo.bar', observer2);
    removeObserver(obj4, 'foo.bar', observer4);
  }
  function observer4() { count4++; }

  addObserver(obj1, 'foo.bar', observer1);
  addObserver(obj2, 'foo.bar', observer2);
  addObserver(obj3, 'foo.bar', observer3);
  addObserver(obj4, 'foo.bar', observer4);

  set(foo, 'bar', 'baz');

  assert.equal(count1, 1, 'observer1 fired');
  assert.equal(count2, 1, 'observer2 fired');
  assert.equal(count3, 1, 'observer3 fired');
  assert.equal(count4, 0, 'observer4 did not fire');
});

testBoth('deferring property change notifications', function(get, set, assert) {
  let obj = { foo: 'foo' };
  let fooCount = 0;

  addObserver(obj, 'foo', function() { fooCount++; });

  beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  set(obj, 'foo', 'BAZ');
  endPropertyChanges(obj);

  assert.equal(fooCount, 1, 'foo should have fired once');
});

testBoth('deferring property change notifications safely despite exceptions', function(get, set, assert) {
  let obj = { foo: 'foo' };
  let fooCount = 0;
  let exc = new Error('Something unexpected happened!');

  assert.expect(2);
  addObserver(obj, 'foo', function() { fooCount++; });

  try {
    changeProperties(function() {
      set(obj, 'foo', 'BIFF');
      set(obj, 'foo', 'BAZ');
      throw exc;
    });
  } catch (err) {
    if (err !== exc) {
      throw err;
    }
  }

  assert.equal(fooCount, 1, 'foo should have fired once');

  changeProperties(function() {
    set(obj, 'foo', 'BIFF2');
    set(obj, 'foo', 'BAZ2');
  });

  assert.equal(fooCount, 2, 'foo should have fired again once');
});

testBoth('addObserver should propagate through prototype', function(get, set, assert) {
  let obj = { foo: 'foo', count: 0 };
  let obj2;

  addObserver(obj, 'foo', function() { this.count++; });
  obj2 = Object.create(obj);

  set(obj2, 'foo', 'bar');

  assert.equal(obj2.count, 1, 'should have invoked observer on inherited');
  assert.equal(obj.count, 0, 'should not have invoked observer on parent');

  obj2.count = 0;
  set(obj, 'foo', 'baz');
  assert.equal(obj.count, 1, 'should have invoked observer on parent');
  assert.equal(obj2.count, 0, 'should not have invoked observer on inherited');
});

testBoth('addObserver should respect targets with methods', function(get, set, assert) {
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
    }
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
    }
  };

  addObserver(observed, 'foo', target1, 'didChange');
  addObserver(observed, 'foo', target2, target2.didChange);

  set(observed, 'foo', 'BAZ');
  assert.equal(target1.count, 1, 'target1 observer should have fired');
  assert.equal(target2.count, 1, 'target2 observer should have fired');
});

testBoth('addObserver should allow multiple objects to observe a property', function(get, set, assert) {
  let observed = { foo: 'foo' };

  let target1 = {
    count: 0,

    didChange() {
      this.count++;
    }
  };

  let target2 = {
    count: 0,

    didChange() {
      this.count++;
    }
  };

  addObserver(observed, 'foo', target1, 'didChange');
  addObserver(observed, 'foo', target2, 'didChange');

  set(observed, 'foo', 'BAZ');
  assert.equal(target1.count, 1, 'target1 observer should have fired');
  assert.equal(target2.count, 1, 'target2 observer should have fired');
});

// ..........................................................
// REMOVE OBSERVER
//

QUnit.module('removeObserver');

testBoth('removing observer should stop firing', function(get, set, assert) {
  let obj = {};
  let count = 0;
  function F() { count++; }
  addObserver(obj, 'foo', F);

  set(obj, 'foo', 'bar');
  assert.equal(count, 1, 'should have invoked observer');

  removeObserver(obj, 'foo', F);

  set(obj, 'foo', 'baz');
  assert.equal(count, 1, 'removed observer shouldn\'t fire');
});

testBoth('local observers can be removed', function(get, set, assert) {
  let barObserved = 0;

  let MyMixin = Mixin.create({
    foo1: observer('bar', function() {
      barObserved++;
    }),

    foo2: observer('bar', function() {
      barObserved++;
    })
  });

  let obj = {};
  MyMixin.apply(obj);

  set(obj, 'bar', 'HI!');
  assert.equal(barObserved, 2, 'precond - observers should be fired');

  removeObserver(obj, 'bar', null, 'foo1');

  barObserved = 0;
  set(obj, 'bar', 'HI AGAIN!');

  assert.equal(barObserved, 1, 'removed observers should not be called');
});

testBoth('removeObserver should respect targets with methods', function(get, set, assert) {
  let observed = { foo: 'foo' };

  let target1 = {
    count: 0,

    didChange() {
      this.count++;
    }
  };

  let target2 = {
    count: 0,

    didChange() {
      this.count++;
    }
  };

  addObserver(observed, 'foo', target1, 'didChange');
  addObserver(observed, 'foo', target2, target2.didChange);

  set(observed, 'foo', 'BAZ');
  assert.equal(target1.count, 1, 'target1 observer should have fired');
  assert.equal(target2.count, 1, 'target2 observer should have fired');

  removeObserver(observed, 'foo', target1, 'didChange');
  removeObserver(observed, 'foo', target2, target2.didChange);

  target1.count = target2.count = 0;
  set(observed, 'foo', 'BAZ');
  assert.equal(target1.count, 0, 'target1 observer should not fire again');
  assert.equal(target2.count, 0, 'target2 observer should not fire again');
});

// ..........................................................
// CHAINED OBSERVERS
//

let obj, count;

QUnit.module('addObserver - dependentkey with chained properties', {
  beforeEach() {
    obj = {
      foo: {
        bar: {
          baz: {
            biff: 'BIFF'
          }
        }
      },
      Capital: {
        foo: {
          bar: {
            baz: {
              biff: 'BIFF'
            }
          }
        }
      }
    };

    count = 0;
  },

  afterEach() {
    obj = count = null;
  }
});


testBoth('depending on a chain with a computed property', function(get, set, assert) {
  defineProperty(obj, 'computed', computed(function () {
    return { foo: 'bar' };
  }));

  let changed = 0;
  addObserver(obj, 'computed.foo', function () {
    changed++;
  });

  assert.equal(cacheFor(obj, 'computed'), undefined, 'addObserver should not compute CP');

  set(obj, 'computed.foo', 'baz');

  assert.equal(changed, 1, 'should fire observer');
});

testBoth('depending on a simple chain', function(get, set, assert) {
  let val;
  addObserver(obj, 'foo.bar.baz.biff', function(target, key) {
    val = get(target, key);
    count++;
  });

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  assert.equal(val, 'BUZZ');
  assert.equal(count, 1);

  set(get(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
  assert.equal(val, 'BLARG');
  assert.equal(count, 2);

  set(get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  assert.equal(val, 'BOOM');
  assert.equal(count, 3);

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  assert.equal(val, 'BLARG');
  assert.equal(count, 4);

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  assert.equal(val, 'BUZZ');
  assert.equal(count, 5);

  let foo = get(obj, 'foo');

  set(obj, 'foo', 'BOO');
  assert.equal(val, undefined);
  assert.equal(count, 6);

  set(foo.bar.baz, 'biff', 'BOOM');
  assert.equal(count, 6, 'should be not have invoked observer');
});

testBoth('depending on a chain with a capitalized first key', function(get, set, assert) {
  let val;

  addObserver(obj, 'Capital.foo.bar.baz.biff', function(target, key) {
    val = get(obj, key);
    count++;
  });

  set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
  assert.equal(val, 'BUZZ');
  assert.equal(count, 1);

  set(get(obj, 'Capital.foo.bar'), 'baz', { biff: 'BLARG' });
  assert.equal(val, 'BLARG');
  assert.equal(count, 2);

  set(get(obj, 'Capital.foo'), 'bar', { baz: { biff: 'BOOM' } });
  assert.equal(val, 'BOOM');
  assert.equal(count, 3);

  set(obj, 'Capital.foo', { bar: { baz: { biff: 'BLARG' } } });
  assert.equal(val, 'BLARG');
  assert.equal(count, 4);

  set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
  assert.equal(val, 'BUZZ');
  assert.equal(count, 5);

  let foo = get(obj, 'foo');

  set(obj, 'Capital.foo', 'BOO');
  assert.equal(val, undefined);
  assert.equal(count, 6);

  set(foo.bar.baz, 'biff', 'BOOM');
  assert.equal(count, 6, 'should be not have invoked observer');
});

// ..........................................................
// SETTING IDENTICAL VALUES
//

QUnit.module('props/observer_test - setting identical values');

testBoth('setting simple prop should not trigger', function(get, set, assert) {
  let obj = { foo: 'bar' };
  let count = 0;

  addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  assert.equal(count, 0, 'should not trigger observer');

  set(obj, 'foo', 'baz');
  assert.equal(count, 1, 'should trigger observer');

  set(obj, 'foo', 'baz');
  assert.equal(count, 1, 'should not trigger observer again');
});

// The issue here is when a computed property is directly set with a value, then has a
// dependent key change (which triggers a cache expiration and recomputation), observers will
// not be fired if the CP setter is called with the last set value.
testBoth('setting a cached computed property whose value has changed should trigger', function(get, set, assert) {
  let obj = {};

  defineProperty(obj, 'foo', computed({
    get: function() { return get(this, 'baz'); },
    set: function(key, value) { return value; }
  }).property('baz'));

  let count = 0;

  addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  assert.equal(count, 1);
  assert.equal(get(obj, 'foo'), 'bar');

  set(obj, 'baz', 'qux');
  assert.equal(count, 2);
  assert.equal(get(obj, 'foo'), 'qux');

  get(obj, 'foo');
  set(obj, 'foo', 'bar');
  assert.equal(count, 3);
  assert.equal(get(obj, 'foo'), 'bar');
});

QUnit.module('changeProperties');

testBoth('observers added/removed during changeProperties should do the right thing.', function(get, set, assert) {
  let obj = {
    foo: 0
  };
  function Observer() {
    this.didChangeCount = 0;
  }
  Observer.prototype = {
    add() {
      addObserver(obj, 'foo', this, 'didChange');
    },
    remove() {
      removeObserver(obj, 'foo', this, 'didChange');
    },
    didChange() {
      this.didChangeCount++;
    }
  };
  let addedBeforeFirstChangeObserver = new Observer();
  let addedAfterFirstChangeObserver = new Observer();
  let addedAfterLastChangeObserver = new Observer();
  let removedBeforeFirstChangeObserver = new Observer();
  let removedBeforeLastChangeObserver = new Observer();
  let removedAfterLastChangeObserver = new Observer();
  removedBeforeFirstChangeObserver.add();
  removedBeforeLastChangeObserver.add();
  removedAfterLastChangeObserver.add();
  changeProperties(function () {
    removedBeforeFirstChangeObserver.remove();
    addedBeforeFirstChangeObserver.add();

    set(obj, 'foo', 1);

    assert.equal(addedBeforeFirstChangeObserver.didChangeCount, 0, 'addObserver called before the first change is deferred');

    addedAfterFirstChangeObserver.add();
    removedBeforeLastChangeObserver.remove();

    set(obj, 'foo', 2);

    assert.equal(addedAfterFirstChangeObserver.didChangeCount, 0, 'addObserver called after the first change is deferred');

    addedAfterLastChangeObserver.add();
    removedAfterLastChangeObserver.remove();
  });

  assert.equal(removedBeforeFirstChangeObserver.didChangeCount, 0, 'removeObserver called before the first change sees none');
  assert.equal(addedBeforeFirstChangeObserver.didChangeCount, 1, 'addObserver called before the first change sees only 1');
  assert.equal(addedAfterFirstChangeObserver.didChangeCount, 1, 'addObserver called after the first change sees 1');
  assert.equal(addedAfterLastChangeObserver.didChangeCount, 1, 'addObserver called after the last change sees 1');
  assert.equal(removedBeforeLastChangeObserver.didChangeCount, 0, 'removeObserver called before the last change sees none');
  assert.equal(removedAfterLastChangeObserver.didChangeCount, 0, 'removeObserver called after the last change sees none');
});


QUnit.module('Keys behavior with observers');


testBoth('should not leak properties on the prototype', function (get, set, assert) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  assert.deepEqual(Object.keys(beer), []);
  removeObserver(beer, 'type', K);
});

testBoth('observing a non existent property', function(get, set, assert) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'brand', K);

  assert.deepEqual(Object.keys(beer), []);

  set(beer, 'brand', 'Corona');
  assert.deepEqual(Object.keys(beer), ['brand']);

  removeObserver(beer, 'brand', K);
});

testBoth('with observers switched on and off', function (get, set, assert) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);

  assert.deepEqual(Object.keys(beer), []);
});

testBoth('observers switched on and off with setter in between', function(get, set, assert) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  set(beer, 'type', 'ale');
  removeObserver(beer, 'type', K);

  assert.deepEqual(Object.keys(beer), ['type']);
});

testBoth('observer switched on and off and then setter', function(get, set, assert) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);
  set(beer, 'type', 'ale');

  assert.deepEqual(Object.keys(beer), ['type']);
});

testBoth('observers switched on and off with setter in between (observed property is not shadowing)', function(get, set, assert) {
  function Beer() { }

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
  removeObserver(beer, 'type', K);
  assert.deepEqual(Object.keys(yetAnotherBeer), ['type'], 'addObserver -> set -> removeObserver');

  let itsMyLastBeer = new Beer();
  set(itsMyLastBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  assert.deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
});

testBoth('observers switched on and off with setter in between (observed property is shadowing one on the prototype)', function(get, set, assert) {
  function Beer() { }
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
  removeObserver(beer, 'type', K);
  assert.deepEqual(Object.keys(yetAnotherBeer), ['type'], 'addObserver -> set -> removeObserver');

  let itsMyLastBeer = new Beer();
  set(itsMyLastBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  assert.deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
});
