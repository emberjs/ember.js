import { ENV } from 'ember-environment';
import { testBoth } from 'internal-test-helpers';
import {
  addObserver,
  removeObserver,
  _addBeforeObserver,
  _suspendObserver,
  _suspendObservers,
  _removeBeforeObserver,
  propertyWillChange,
  propertyDidChange,
  defineProperty,
  computed,
  cacheFor,
  Mixin,
  mixin,
  observer,
  _beforeObserver,
  _immediateObserver,
  run,
  beginPropertyChanges,
  endPropertyChanges,
  changeProperties
} from '..';

function K() {}

// ..........................................................
// ADD OBSERVER
//

QUnit.module('addObserver');

testBoth('observer should fire when property is modified', function(get, set) {
  let obj = {};
  let count = 0;

  addObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'bar', 'should invoke AFTER value changed');
    count++;
  });

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');
});

testBoth('observer should fire when dependent property is modified', function(get, set) {
  let obj = { bar: 'bar' };
  defineProperty(obj, 'foo', computed(function() {
    return get(this, 'bar').toUpperCase();
  }).property('bar'));

  get(obj, 'foo');

  let count = 0;
  addObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'BAZ', 'should have invoked after prop change');
    count++;
  });

  set(obj, 'bar', 'baz');
  equal(count, 1, 'should have invoked observer');
});

testBoth('observer should continue to fire after dependent properties are accessed', function(get, set) {
  let observerCount = 0;
  let obj = {};

  defineProperty(obj, 'prop', computed(function () { return Math.random(); }));
  defineProperty(obj, 'anotherProp', computed('prop', function () { return get(this, 'prop') + Math.random(); }));

  addObserver(obj, 'prop', function () { observerCount++; });

  get(obj, 'anotherProp');

  for (let i = 0; i < 10; i++) {
    propertyWillChange(obj, 'prop');
    propertyDidChange(obj, 'prop');
  }

  equal(observerCount, 10, 'should continue to fire indefinitely');
});

if (ENV.EXTEND_PROTOTYPES.Function) {
  testBoth('observer added declaratively via brace expansion should fire when property changes', function (get, set) {
    let obj = { };
    let count = 0;

    mixin(obj, {
      observeFooAndBar: function () {
        count++;
      }.observes('{foo,bar}')
    });

    set(obj, 'foo', 'foo');
    equal(count, 1, 'observer specified via brace expansion invoked on property change');

    set(obj, 'bar', 'bar');
    equal(count, 2, 'observer specified via brace expansion invoked on property change');

    set(obj, 'baz', 'baz');
    equal(count, 2, 'observer not invoked on unspecified property');
  });

  testBoth('observer specified declaratively via brace expansion should fire when dependent property changes', function (get, set) {
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
    equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

    set(obj, 'quux', 'Quux');
    equal(count, 2, 'observer not fired on unspecified property');
  });
}

testBoth('observers watching multiple properties via brace expansion should fire when the properties change', function (get, set) {
  let obj = { };
  let count = 0;

  mixin(obj, {
    observeFooAndBar: observer('{foo,bar}', function () {
      count++;
    })
  });

  set(obj, 'foo', 'foo');
  equal(count, 1, 'observer specified via brace expansion invoked on property change');

  set(obj, 'bar', 'bar');
  equal(count, 2, 'observer specified via brace expansion invoked on property change');

  set(obj, 'baz', 'baz');
  equal(count, 2, 'observer not invoked on unspecified property');
});

testBoth('observers watching multiple properties via brace expansion should fire when dependent properties change', function (get, set) {
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
  equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

  set(obj, 'quux', 'Quux');
  equal(count, 2, 'observer not fired on unspecified property');
});

testBoth('nested observers should fire in order', function(get, set) {
  let obj = { foo: 'foo', bar: 'bar' };
  let fooCount = 0;
  let barCount = 0;

  addObserver(obj, 'foo', function() { fooCount++; });
  addObserver(obj, 'bar', function() {
    set(obj, 'foo', 'BAZ');
    equal(fooCount, 1, 'fooCount should have fired already');
    barCount++;
  });

  set(obj, 'bar', 'BIFF');
  equal(barCount, 1, 'barCount should have fired');
  equal(fooCount, 1, 'foo should have fired');
});

testBoth('removing an chain observer on change should not fail', function(get, set) {
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

  equal(count1, 1, 'observer1 fired');
  equal(count2, 1, 'observer2 fired');
  equal(count3, 1, 'observer3 fired');
  equal(count4, 0, 'observer4 did not fire');
});

testBoth('removing an chain before observer on change should not fail', function(get, set) {
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
    _removeBeforeObserver(obj1, 'foo.bar', observer1);
    _removeBeforeObserver(obj2, 'foo.bar', observer2);
    _removeBeforeObserver(obj4, 'foo.bar', observer4);
  }
  function observer4() { count4++; }

  _addBeforeObserver(obj1, 'foo.bar', observer1);
  _addBeforeObserver(obj2, 'foo.bar', observer2);
  _addBeforeObserver(obj3, 'foo.bar', observer3);
  _addBeforeObserver(obj4, 'foo.bar', observer4);

  set(foo, 'bar', 'baz');

  equal(count1, 1, 'observer1 fired');
  equal(count2, 1, 'observer2 fired');
  equal(count3, 1, 'observer3 fired');
  equal(count4, 0, 'observer4 did not fire');
});

testBoth('suspending an observer should not fire during callback', function(get, set) {
  let obj = {};
  let target, otherTarget;

  target = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  addObserver(obj, 'foo', target, target.method);
  addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
    /*jshint validthis:true */
    equal(this, target);

    set(obj, 'foo', '2');

    return 'result';
  }

  set(obj, 'foo', '1');

  equal(_suspendObserver(obj, 'foo', target, target.method, callback), 'result');

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});


testBoth('suspending an observer should not defer change notifications during callback', function(get, set) {
  let obj = {};
  let target, otherTarget;

  target = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  addObserver(obj, 'foo', target, target.method);
  addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
    /*jshint validthis:true */
    equal(this, target);

    set(obj, 'foo', '2');

    return 'result';
  }

  set(obj, 'foo', '1');

  beginPropertyChanges();
  equal(_suspendObserver(obj, 'foo', target, target.method, callback), 'result');
  endPropertyChanges();

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});

testBoth('suspending observers should not fire during callback', function(get, set) {
  let obj = {};
  let target, otherTarget;

  target = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  addObserver(obj, 'foo', target, target.method);
  addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
    /*jshint validthis:true */
    equal(this, target);

    set(obj, 'foo', '2');

    return 'result';
  }

  set(obj, 'foo', '1');

  equal(_suspendObservers(obj, ['foo'], target, target.method, callback), 'result');

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});


testBoth('suspending observers should not defer change notifications during callback', function(get, set) {
  let obj = {};
  let target, otherTarget;

  target = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  otherTarget = {
    values: [],
    method() { this.values.push(get(obj, 'foo')); }
  };

  addObserver(obj, 'foo', target, target.method);
  addObserver(obj, 'foo', otherTarget, otherTarget.method);

  function callback() {
    /*jshint validthis:true */
    equal(this, target);

    set(obj, 'foo', '2');

    return 'result';
  }

  set(obj, 'foo', '1');

  beginPropertyChanges();
  equal(_suspendObservers(obj, ['foo'], target, target.method, callback), 'result');
  endPropertyChanges();

  set(obj, 'foo', '3');

  deepEqual(target.values, ['1', '3'], 'should invoke');
  deepEqual(otherTarget.values, ['1', '2', '3'], 'should invoke');
});

testBoth('deferring property change notifications', function(get, set) {
  let obj = { foo: 'foo' };
  let fooCount = 0;

  addObserver(obj, 'foo', function() { fooCount++; });

  beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  set(obj, 'foo', 'BAZ');
  endPropertyChanges(obj);

  equal(fooCount, 1, 'foo should have fired once');
});

testBoth('deferring property change notifications safely despite exceptions', function(get, set) {
  let obj = { foo: 'foo' };
  let fooCount = 0;
  let exc = new Error('Something unexpected happened!');

  expect(2);
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

  equal(fooCount, 1, 'foo should have fired once');

  changeProperties(function() {
    set(obj, 'foo', 'BIFF2');
    set(obj, 'foo', 'BAZ2');
  });

  equal(fooCount, 2, 'foo should have fired again once');
});

testBoth('deferring property change notifications will not defer before observers', function(get, set) {
  let obj = { foo: 'foo' };
  let fooCount = 0;

  _addBeforeObserver(obj, 'foo', function() { fooCount++; });

  beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  equal(fooCount, 1, 'should fire before observer immediately');
  set(obj, 'foo', 'BAZ');
  endPropertyChanges(obj);

  equal(fooCount, 1, 'should not fire before observer twice');
});

testBoth('addObserver should propagate through prototype', function(get, set) {
  let obj = { foo: 'foo', count: 0 };
  let obj2;

  addObserver(obj, 'foo', function() { this.count++; });
  obj2 = Object.create(obj);

  set(obj2, 'foo', 'bar');

  equal(obj2.count, 1, 'should have invoked observer on inherited');
  equal(obj.count, 0, 'should not have invoked observer on parent');

  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equal(obj.count, 1, 'should have invoked observer on parent');
  equal(obj2.count, 0, 'should not have invoked observer on inherited');
});

testBoth('addObserver should respect targets with methods', function(get, set) {
  let observed = { foo: 'foo' };

  let target1 = {
    count: 0,

    didChange(obj, keyName) {
      let value = get(obj, keyName);
      equal(this, target1, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  let target2 = {
    count: 0,

    didChange(obj, keyName) {
      let value = get(obj, keyName);
      equal(this, target2, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  addObserver(observed, 'foo', target1, 'didChange');
  addObserver(observed, 'foo', target2, target2.didChange);

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');
});

testBoth('addObserver should allow multiple objects to observe a property', function(get, set) {
  let observed = { foo: 'foo' };

  let target1 = {
    count: 0,

    didChange(obj, keyName, value) {
      this.count++;
    }
  };

  let target2 = {
    count: 0,

    didChange(obj, keyName, value) {
      this.count++;
    }
  };

  addObserver(observed, 'foo', target1, 'didChange');
  addObserver(observed, 'foo', target2, 'didChange');

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');
});

// ..........................................................
// REMOVE OBSERVER
//

QUnit.module('removeObserver');

testBoth('removing observer should stop firing', function(get, set) {
  let obj = {};
  let count = 0;
  function F() { count++; }
  addObserver(obj, 'foo', F);

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');

  removeObserver(obj, 'foo', F);

  set(obj, 'foo', 'baz');
  equal(count, 1, 'removed observer shouldn\'t fire');
});

testBoth('local observers can be removed', function(get, set) {
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
  equal(barObserved, 2, 'precond - observers should be fired');

  removeObserver(obj, 'bar', null, 'foo1');

  barObserved = 0;
  set(obj, 'bar', 'HI AGAIN!');

  equal(barObserved, 1, 'removed observers should not be called');
});

testBoth('removeObserver should respect targets with methods', function(get, set) {
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
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');

  removeObserver(observed, 'foo', target1, 'didChange');
  removeObserver(observed, 'foo', target2, target2.didChange);

  target1.count = target2.count = 0;
  set(observed, 'foo', 'BAZ');
  equal(target1.count, 0, 'target1 observer should not fire again');
  equal(target2.count, 0, 'target2 observer should not fire again');
});

// ..........................................................
// BEFORE OBSERVER
//

QUnit.module('_addBeforeObserver');

testBoth('observer should fire before a property is modified', function(get, set) {
  let obj = { foo: 'foo' };
  let count = 0;

  _addBeforeObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'foo', 'should invoke before value changed');
    count++;
  });

  set(obj, 'foo', 'bar');
  equal(count, 1, 'should have invoked observer');
});

testBoth('observer should fire before dependent property is modified', function(get, set) {
  let obj = { bar: 'bar' };
  defineProperty(obj, 'foo', computed(function() {
    return get(this, 'bar').toUpperCase();
  }).property('bar'));

  get(obj, 'foo');

  let count = 0;
  _addBeforeObserver(obj, 'foo', function() {
    equal(get(obj, 'foo'), 'BAR', 'should have invoked after prop change');
    count++;
  });

  set(obj, 'bar', 'baz');
  equal(count, 1, 'should have invoked observer');
});

testBoth('before observer watching multiple properties via brace expansion should fire when properties change', function (get, set) {
  let obj = {};
  let count = 0;

  mixin(obj, {
    fooAndBarWatcher: _beforeObserver('{foo,bar}', function () {
      count++;
    })
  });

  set(obj, 'foo', 'foo');
  equal(count, 1, 'observer specified via brace expansion invoked on property change');

  set(obj, 'bar', 'bar');
  equal(count, 2, 'observer specified via brace expansion invoked on property change');

  set(obj, 'baz', 'baz');
  equal(count, 2, 'observer not invoked on unspecified property');
});

testBoth('before observer watching multiple properties via brace expansion should fire when dependent property changes', function (get, set) {
  let obj = { baz: 'Initial' };
  let count = 0;

  defineProperty(obj, 'foo', computed(function() {
    return get(this, 'bar').toLowerCase();
  }).property('bar'));

  defineProperty(obj, 'bar', computed(function() {
    return get(this, 'baz').toUpperCase();
  }).property('baz'));

  mixin(obj, {
    fooAndBarWatcher: _beforeObserver('{foo,bar}', function () {
      count++;
    })
  });

  get(obj, 'foo');
  set(obj, 'baz', 'Baz');
  // fire once for foo, once for bar
  equal(count, 2, 'observer specified via brace expansion invoked on dependent property change');

  set(obj, 'quux', 'Quux');
  equal(count, 2, 'observer not fired on unspecified property');
});

testBoth('_addBeforeObserver should propagate through prototype', function(get, set) {
  let obj = { foo: 'foo', count: 0 };
  let obj2;

  _addBeforeObserver(obj, 'foo', function() { this.count++; });
  obj2 = Object.create(obj);

  set(obj2, 'foo', 'bar');
  equal(obj2.count, 1, 'should have invoked observer on inherited');
  equal(obj.count, 0, 'should not have invoked observer on parent');

  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equal(obj.count, 1, 'should have invoked observer on parent');
  equal(obj2.count, 0, 'should not have invoked observer on inherited');
});

testBoth('_addBeforeObserver should respect targets with methods', function(get, set) {
  let observed = { foo: 'foo' };

  let target1 = {
    count: 0,

    willChange(obj, keyName) {
      let value = get(obj, keyName);
      equal(this, target1, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  let target2 = {
    count: 0,

    willChange(obj, keyName) {
      let value = get(obj, keyName);
      equal(this, target2, 'should invoke with this');
      equal(obj, observed, 'param1 should be observed object');
      equal(keyName, 'foo', 'param2 should be keyName');
      equal(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  _addBeforeObserver(observed, 'foo', target1, 'willChange');
  _addBeforeObserver(observed, 'foo', target2, target2.willChange);

  set(observed, 'foo', 'BAZ');
  equal(target1.count, 1, 'target1 observer should have fired');
  equal(target2.count, 1, 'target2 observer should have fired');
});

// ..........................................................
// CHAINED OBSERVERS
//

let obj, count;

QUnit.module('addObserver - dependentkey with chained properties', {
  setup() {
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

  teardown() {
    obj = count = null;
  }
});


testBoth('depending on a chain with a computed property', function (get, set) {
  defineProperty(obj, 'computed', computed(function () {
    return { foo: 'bar' };
  }));

  let changed = 0;
  addObserver(obj, 'computed.foo', function () {
    changed++;
  });

  equal(cacheFor(obj, 'computed'), undefined, 'addObserver should not compute CP');

  set(obj, 'computed.foo', 'baz');

  equal(changed, 1, 'should fire observer');
});

testBoth('depending on a simple chain', function(get, set) {
  let val;
  addObserver(obj, 'foo.bar.baz.biff', function(target, key) {
    val = get(target, key);
    count++;
  });

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 1);

  set(get(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
  equal(val, 'BLARG');
  equal(count, 2);

  set(get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(val, 'BOOM');
  equal(count, 3);

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(val, 'BLARG');
  equal(count, 4);

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 5);

  let foo = get(obj, 'foo');

  set(obj, 'foo', 'BOO');
  equal(val, undefined);
  equal(count, 6);

  set(foo.bar.baz, 'biff', 'BOOM');
  equal(count, 6, 'should be not have invoked observer');
});

testBoth('depending on a chain with a capitalized first key', function(get, set) {
  let val;

  addObserver(obj, 'Capital.foo.bar.baz.biff', function(target, key) {
    val = get(obj, key);
    count++;
  });

  set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 1);

  set(get(obj, 'Capital.foo.bar'), 'baz', { biff: 'BLARG' });
  equal(val, 'BLARG');
  equal(count, 2);

  set(get(obj, 'Capital.foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(val, 'BOOM');
  equal(count, 3);

  set(obj, 'Capital.foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(val, 'BLARG');
  equal(count, 4);

  set(get(obj, 'Capital.foo.bar.baz'), 'biff', 'BUZZ');
  equal(val, 'BUZZ');
  equal(count, 5);

  let foo = get(obj, 'foo');

  set(obj, 'Capital.foo', 'BOO');
  equal(val, undefined);
  equal(count, 6);

  set(foo.bar.baz, 'biff', 'BOOM');
  equal(count, 6, 'should be not have invoked observer');
});

QUnit.module('_removeBeforeObserver');

// ..........................................................
// SETTING IDENTICAL VALUES
//

QUnit.module('props/observer_test - setting identical values');

testBoth('setting simple prop should not trigger', function(get, set) {
  let obj = { foo: 'bar' };
  let count = 0;

  addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  equal(count, 0, 'should not trigger observer');

  set(obj, 'foo', 'baz');
  equal(count, 1, 'should trigger observer');

  set(obj, 'foo', 'baz');
  equal(count, 1, 'should not trigger observer again');
});

// The issue here is when a computed property is directly set with a value, then has a
// dependent key change (which triggers a cache expiration and recomputation), observers will
// not be fired if the CP setter is called with the last set value.
testBoth('setting a cached computed property whose value has changed should trigger', function(get, set) {
  let obj = {};

  defineProperty(obj, 'foo', computed({
    get: function() { return get(this, 'baz'); },
    set: function(key, value) { return value; }
  }).property('baz'));

  let count = 0;

  addObserver(obj, 'foo', function() { count++; });

  set(obj, 'foo', 'bar');
  equal(count, 1);
  equal(get(obj, 'foo'), 'bar');

  set(obj, 'baz', 'qux');
  equal(count, 2);
  equal(get(obj, 'foo'), 'qux');

  get(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(count, 3);
  equal(get(obj, 'foo'), 'bar');
});

QUnit.module('Ember.immediateObserver (Deprecated)');

testBoth('immediate observers should fire synchronously', function(get, set) {
  expectDeprecation(/Usage of `Ember.immediateObserver` is deprecated, use `Ember.observer` instead./);
  let obj = {};
  let observerCalled = 0;
  let mixin;

  // explicitly create a run loop so we do not inadvertently
  // trigger deferred behavior
  run(function() {
    mixin = Mixin.create({
      fooDidChange: _immediateObserver('foo', function() {
        observerCalled++;
        equal(get(this, 'foo'), 'barbaz', 'newly set value is immediately available');
      })
    });

    mixin.apply(obj);

    defineProperty(obj, 'foo', computed({
      get: function() { return 'yes hello this is foo'; },
      set: function(key, value) { return value; }
    }));

    equal(get(obj, 'foo'), 'yes hello this is foo', 'precond - computed property returns a value');
    equal(observerCalled, 0, 'observer has not yet been called');

    set(obj, 'foo', 'barbaz');

    equal(observerCalled, 1, 'observer was called once');
  });
});


if (ENV.EXTEND_PROTOTYPES.Function) {
  testBoth('immediate observers added declaratively via brace expansion fire synchronously', function (get, set) {
    let obj = {};
    let observerCalled = 0;
    let mixin;

    // explicitly create a run loop so we do not inadvertently
    // trigger deferred behavior
    run(function() {
      expectDeprecation(function() {
        mixin = Mixin.create({
          fooDidChange: function() {
            observerCalled++;
            equal(get(this, 'foo'), 'barbaz', 'newly set value is immediately available');
          }.observesImmediately('{foo,bar}')
        });
      }, /Function#observesImmediately is deprecated. Use Function#observes instead/);

      mixin.apply(obj);

      defineProperty(obj, 'foo', computed({
        get: function(key) { return 'yes hello this is foo'; },
        set: function(key, value) { return value; }
      }));

      equal(get(obj, 'foo'), 'yes hello this is foo', 'precond - computed property returns a value');
      equal(observerCalled, 0, 'observer has not yet been called');

      set(obj, 'foo', 'barbaz');

      equal(observerCalled, 1, 'observer was called once');
    });
  });
}

testBoth('immediate observers watching multiple properties via brace expansion fire synchronously', function (get, set) {
  expectDeprecation(/Usage of `Ember.immediateObserver` is deprecated, use `Ember.observer` instead./);
  let obj = {};
  let observerCalled = 0;
  let mixin;

  // explicitly create a run loop so we do not inadvertently
  // trigger deferred behavior
  run(function() {
    mixin = Mixin.create({
      fooDidChange: _immediateObserver('{foo,bar}', function() {
        observerCalled++;
        equal(get(this, 'foo'), 'barbaz', 'newly set value is immediately available');
      })
    });

    mixin.apply(obj);

    defineProperty(obj, 'foo', computed({
      get: function() { return 'yes hello this is foo'; },
      set: function(key, value) { return value; }
    }));

    equal(get(obj, 'foo'), 'yes hello this is foo', 'precond - computed property returns a value');
    equal(observerCalled, 0, 'observer has not yet been called');

    set(obj, 'foo', 'barbaz');

    equal(observerCalled, 1, 'observer was called once');
  });
});

testBoth('immediate observers are for internal properties only', function(get, set) {
  expectDeprecation(/Usage of `Ember.immediateObserver` is deprecated, use `Ember.observer` instead./);
  expectAssertion(function() {
    _immediateObserver('foo.bar', function() { return this; });
  }, 'Immediate observers must observe internal properties only, not properties on other objects.');
});

QUnit.module('changeProperties');

testBoth('observers added/removed during changeProperties should do the right thing.', function(get, set) {
  let obj = {
    foo: 0
  };
  function Observer() {
    this.willChangeCount = 0;
    this.didChangeCount = 0;
  }
  Observer.prototype = {
    add() {
      _addBeforeObserver(obj, 'foo', this, 'willChange');
      addObserver(obj, 'foo', this, 'didChange');
    },
    remove() {
      _removeBeforeObserver(obj, 'foo', this, 'willChange');
      removeObserver(obj, 'foo', this, 'didChange');
    },
    willChange() {
      this.willChangeCount++;
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

    equal(addedBeforeFirstChangeObserver.willChangeCount, 1, '_addBeforeObserver called before the first change invoked immediately');
    equal(addedBeforeFirstChangeObserver.didChangeCount, 0, 'addObserver called before the first change is deferred');

    addedAfterFirstChangeObserver.add();
    removedBeforeLastChangeObserver.remove();

    set(obj, 'foo', 2);

    equal(addedAfterFirstChangeObserver.willChangeCount, 1, '_addBeforeObserver called after the first change invoked immediately');
    equal(addedAfterFirstChangeObserver.didChangeCount, 0, 'addObserver called after the first change is deferred');

    addedAfterLastChangeObserver.add();
    removedAfterLastChangeObserver.remove();
  });

  equal(removedBeforeFirstChangeObserver.willChangeCount, 0, '_removeBeforeObserver called before the first change sees none');
  equal(removedBeforeFirstChangeObserver.didChangeCount, 0, 'removeObserver called before the first change sees none');
  equal(addedBeforeFirstChangeObserver.willChangeCount, 1, '_addBeforeObserver called before the first change sees only 1');
  equal(addedBeforeFirstChangeObserver.didChangeCount, 1, 'addObserver called before the first change sees only 1');
  equal(addedAfterFirstChangeObserver.willChangeCount, 1, '_addBeforeObserver called after the first change sees 1');
  equal(addedAfterFirstChangeObserver.didChangeCount, 1, 'addObserver called after the first change sees 1');
  equal(addedAfterLastChangeObserver.willChangeCount, 0, '_addBeforeObserver called after the last change sees none');
  equal(addedAfterLastChangeObserver.didChangeCount, 0, 'addObserver called after the last change sees none');
  equal(removedBeforeLastChangeObserver.willChangeCount, 1, '_removeBeforeObserver called before the last change still sees 1');
  equal(removedBeforeLastChangeObserver.didChangeCount, 1, 'removeObserver called before the last change still sees 1');
  equal(removedAfterLastChangeObserver.willChangeCount, 1, '_removeBeforeObserver called after the last change still sees 1');
  equal(removedAfterLastChangeObserver.didChangeCount, 1, 'removeObserver called after the last change still sees 1');
});


QUnit.module('Keys behavior with observers');


testBoth('should not leak properties on the prototype', function () {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  deepEqual(Object.keys(beer), []);
  removeObserver(beer, 'type', K);
});

testBoth('observing a non existent property', function (get, set) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'brand', K);

  deepEqual(Object.keys(beer), []);

  set(beer, 'brand', 'Corona');
  deepEqual(Object.keys(beer), ['brand']);

  removeObserver(beer, 'brand', K);
});

testBoth('with observers switched on and off', function (get, set) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);

  deepEqual(Object.keys(beer), []);
});

testBoth('observers switched on and off with setter in between', function (get, set) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  set(beer, 'type', 'ale');
  removeObserver(beer, 'type', K);

  deepEqual(Object.keys(beer), ['type']);
});

testBoth('observer switched on and off and then setter', function (get, set) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();

  addObserver(beer, 'type', K);
  removeObserver(beer, 'type', K);
  set(beer, 'type', 'ale');

  deepEqual(Object.keys(beer), ['type']);
});

testBoth('observers switched on and off with setter in between (observed property is not shadowing)', function (get, set) {
  function Beer() { }

  let beer = new Beer();
  set(beer, 'type', 'ale');
  deepEqual(Object.keys(beer), ['type'], 'only set');

  let otherBeer = new Beer();
  addObserver(otherBeer, 'type', K);
  set(otherBeer, 'type', 'ale');
  deepEqual(Object.keys(otherBeer), ['type'], 'addObserver -> set');

  let yetAnotherBeer = new Beer();
  addObserver(yetAnotherBeer, 'type', K);
  set(yetAnotherBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  deepEqual(Object.keys(yetAnotherBeer), ['type'], 'addObserver -> set -> removeObserver');

  let itsMyLastBeer = new Beer();
  set(itsMyLastBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
});

testBoth('observers switched on and off with setter in between (observed property is shadowing one on the prototype)', function (get, set) {
  function Beer() { }
  Beer.prototype.type = 'ipa';

  let beer = new Beer();
  set(beer, 'type', 'ale');
  deepEqual(Object.keys(beer), ['type'], 'after set');

  let otherBeer = new Beer();
  addObserver(otherBeer, 'type', K);
  set(otherBeer, 'type', 'ale');
  deepEqual(Object.keys(otherBeer), ['type'], 'addObserver -> set');

  let yetAnotherBeer = new Beer();
  addObserver(yetAnotherBeer, 'type', K);
  set(yetAnotherBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  deepEqual(Object.keys(yetAnotherBeer), ['type'], 'addObserver -> set -> removeObserver');

  let itsMyLastBeer = new Beer();
  set(itsMyLastBeer, 'type', 'ale');
  removeObserver(beer, 'type', K);
  deepEqual(Object.keys(itsMyLastBeer), ['type'], 'set -> removeObserver');
});
