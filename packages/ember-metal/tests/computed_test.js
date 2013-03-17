/*globals Global:true */

require('ember-metal/~tests/props_helper');

var obj, count;

module('Ember.computed');

test('computed property should be an instance of descriptor', function() {
  ok(Ember.computed(function() {}) instanceof Ember.Descriptor);
});

test('defining computed property should invoke property on get', function() {

  var obj = {};
  var count = 0;
  Ember.defineProperty(obj, 'foo', Ember.computed(function(key) {
    count++;
    return 'computed '+key;
  }));

  equal(Ember.get(obj, 'foo'), 'computed foo', 'should return value');
  equal(count, 1, 'should have invoked computed property');
});

test('defining computed property should invoke property on set', function() {

  var obj = {};
  var count = 0;
  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    if (value !== undefined) {
      count++;
      this['__'+key] = 'computed '+value;
    }
    return this['__'+key];
  }));

  equal(Ember.set(obj, 'foo', 'bar'), 'bar', 'should return set value');
  equal(count, 1, 'should have invoked computed property');
  equal(Ember.get(obj, 'foo'), 'computed bar', 'should return new value');
});

var objA, objB;
module('Ember.computed should inherit through prototype', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    objB.__foo = 'FOO'; // make a copy;
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'computed bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'computed bar', 'should NOT change B');
});

module('redefining computed property to normal', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    Ember.defineProperty(objB, 'foo'); // make this just a normal property.
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), undefined, 'should get undefined from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), undefined, 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'bar', 'should NOT change B');
});

module('redefining computed property to another property', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    Ember.defineProperty(objA, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'A '+value;
      }
      return this['__'+key];
    }));

    objB = Ember.create(objA);
    objB.__foo = 'FOO';
    Ember.defineProperty(objB, 'foo', Ember.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'B '+value;
      }
      return this['__'+key];
    }));
  },

  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'A BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'B bar', 'should change B');
  equal(get(objA, 'foo'), 'A BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'A BAZ', 'should change A');
  equal(get(objB, 'foo'), 'B bar', 'should NOT change B');
});

module('Ember.computed - metadata');

test("can set metadata on a computed property", function() {
  var computedProperty = Ember.computed(function() { });
  computedProperty.meta({ key: 'keyValue' });

  equal(computedProperty.meta().key, 'keyValue', "saves passed meta hash to the _meta property");
});

test("meta should return an empty hash if no meta is set", function() {
  var computedProperty = Ember.computed(function() { });
  deepEqual(computedProperty.meta(), {}, "returned value is an empty hash");
});

// ..........................................................
// CACHEABLE
//

module('Ember.computed - cacheable', {
  setup: function() {
    obj = {};
    count = 0;
    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      count++;
      return 'bar '+count;
    }));
  },

  teardown: function() {
    obj = count = null;
  }
});

testBoth('cacheable should cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');
  equal(count, 1, 'should only invoke once');
});

testBoth('modifying a cacheable property should update cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');

  equal(set(obj, 'foo', 'baz'), 'baz', 'setting');
  equal(get(obj, 'foo'), 'bar 2', 'third get');
  equal(count, 2, 'should not invoke again');
});

testBoth('inherited property should not pick up cache', function(get, set) {
  var objB = Ember.create(obj);

  equal(get(obj, 'foo'), 'bar 1', 'obj first get');
  equal(get(objB, 'foo'), 'bar 2', 'objB first get');

  equal(get(obj, 'foo'), 'bar 1', 'obj second get');
  equal(get(objB, 'foo'), 'bar 2', 'objB second get');

  set(obj, 'foo', 'baz'); // modify A
  equal(get(obj, 'foo'), 'bar 3', 'obj third get');
  equal(get(objB, 'foo'), 'bar 2', 'objB third get');
});

testBoth('cacheFor should return the cached value', function(get, set) {
  equal(Ember.cacheFor(obj, 'foo'), undefined, "should not yet be a cached value");

  get(obj, 'foo');

  equal(Ember.cacheFor(obj, 'foo'), "bar 1", "should retrieve cached value");
});

testBoth('cacheFor should return falsy cached values', function(get, set) {

  Ember.defineProperty(obj, 'falsy', Ember.computed(function() {
    return false;
  }));

  equal(Ember.cacheFor(obj, 'falsy'), undefined, "should not yet be a cached value");

  get(obj, 'falsy');

  equal(Ember.cacheFor(obj, 'falsy'), false, "should retrieve cached value");
});

testBoth("setting a cached computed property passes the old value as the third argument", function(get, set) {
  var obj = {
    foo: 0
  };

  var receivedOldValue;

  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value, oldValue) {
      receivedOldValue = oldValue;
      return value;
    }).property('foo')
  );

  set(obj, 'plusOne', 1);
  strictEqual(receivedOldValue, undefined, "oldValue should be undefined");

  set(obj, 'plusOne', 2);
  strictEqual(receivedOldValue, 1, "oldValue should be 1");

  set(obj, 'plusOne', 3);
  strictEqual(receivedOldValue, 2, "oldValue should be 2");
});

testBoth("the old value is only passed in if the computed property specifies three arguments", function(get, set) {
  var obj = {
    foo: 0
  };

  var receivedOldValue;

  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value) {
      equal(arguments.length, 2, "computed property is only invoked with two arguments");
      return value;
    }).property('foo')
  );

  set(obj, 'plusOne', 1);
  set(obj, 'plusOne', 2);
  set(obj, 'plusOne', 3);
});

// ..........................................................
// DEPENDENT KEYS
//

module('Ember.computed - dependentkey', {
  setup: function() {
    obj = { bar: 'baz' };
    count = 0;
    Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
      count++;
      return 'bar '+count;
    }).property('bar'));
  },

  teardown: function() {
    obj = count = null;
  }
});

test('should lazily watch dependent keys when watched itself', function () {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  Ember.watch(obj, 'foo');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('should lazily watch dependent keys on set', function (get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  set(obj, 'foo', 'bar');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('should lazily watch dependent keys on get', function (get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  get(obj, 'foo');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('local dependent key should invalidate cache', function(get, set) {
  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate foo

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
});

testBoth('should invalidate multiple nested dependent keys', function(get, set) {

  Ember.defineProperty(obj, 'bar', Ember.computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz'));

  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'baz', 'BIFF'); // should invalidate bar -> foo
  equal(Ember.isWatching(obj, 'bar'), false, 'should not be watching dependent key after cache cleared');
  equal(Ember.isWatching(obj, 'baz'), false, 'should not be watching dependent key after cache cleared');

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(Ember.isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
});

testBoth('circular keys should not blow up', function(get, set) {

  Ember.defineProperty(obj, 'bar', Ember.computed(function(key, value) {
    count++;
    return 'bar '+count;
  }).property('foo'));

  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    count++;
    return 'foo '+count;
  }).property('bar'));

  equal(get(obj, 'foo'), 'foo 1', 'get once');
  equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

  equal(get(obj, 'foo'), 'foo 3', 'should recache');
  equal(get(obj, 'foo'), 'foo 3', 'cached retrieve');
});

testBoth('redefining a property should undo old depenent keys', function(get ,set) {

  equal(Ember.isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1');
  equal(Ember.isWatching(obj, 'bar'), true, 'lazily watching dependent key');

  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz'));

  equal(Ember.isWatching(obj, 'bar'), false, 'after redefining should not be watching dependent key');

  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'bar', 'BIFF'); // should not kill cache
  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'baz', 'BOP');
  equal(get(obj, 'foo'), 'baz 3');
});

// ..........................................................
// CHAINED DEPENDENT KEYS
//

var func, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    Global = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    count = 0;
    func = function() {
      count++;
      return Ember.get(obj, 'foo.bar.baz.biff')+' '+count;
    };
  },

  teardown: function() {
    obj = count = func = Global = null;
  }
};

module('Ember.computed - dependentkey with chained properties', moduleOpts);

testBoth('depending on simple chain', function(get, set) {

  // assign computed property
  Ember.defineProperty(obj, 'prop',
    Ember.computed(func).property('foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(Ember.get(obj, 'foo.bar'),  'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(Ember.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(Ember.get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  Ember.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('depending on Global chain', function(get, set) {

  // assign computed property
  Ember.defineProperty(obj, 'prop', Ember.computed(function() {
    count++;
    return Ember.get('Global.foo.bar.baz.biff')+' '+count;
  }).property('Global.foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(Ember.get(Global, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(Ember.get(Global, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(Ember.get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  Ember.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('chained dependent keys should evaluate computed properties lazily', function(get,set){
  Ember.defineProperty(obj.foo.bar, 'b', Ember.computed(func));
  Ember.defineProperty(obj.foo, 'c', Ember.computed(function(){}).property('bar.b'));
  equal(count, 0, 'b should not run');
});


// ..........................................................
// BUGS
//

module('computed edge cases');

test('adding a computed property should show up in key iteration',function() {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {}));

  var found = [];
  for(var key in obj) found.push(key);
  ok(Ember.EnumerableUtils.indexOf(found, 'foo')>=0, 'should find computed property in iteration found='+found);
  ok('foo' in obj, 'foo in obj should pass');
});


module('Ember.computed - setter');

testBoth('setting a watched computed property', function(get, set) {
  var obj = {
    firstName: 'Yehuda',
    lastName: 'Katz'
  };
  Ember.defineProperty(obj, 'fullName', Ember.computed(
    function(key, value) {
      if (arguments.length > 1) {
        var values = value.split(' ');
        set(this, 'firstName', values[0]);
        set(this, 'lastName', values[1]);
        return value;
      }
      return get(this, 'firstName') + ' ' + get(this, 'lastName');
    }).property('firstName', 'lastName')
  );
  var fullNameWillChange = 0,
      fullNameDidChange = 0,
      firstNameWillChange = 0,
      firstNameDidChange = 0,
      lastNameWillChange = 0,
      lastNameDidChange = 0;
  Ember.addBeforeObserver(obj, 'fullName', function () {
    fullNameWillChange++;
  });
  Ember.addObserver(obj, 'fullName', function () {
    fullNameDidChange++;
  });
  Ember.addBeforeObserver(obj, 'firstName', function () {
    firstNameWillChange++;
  });
  Ember.addObserver(obj, 'firstName', function () {
    firstNameDidChange++;
  });
  Ember.addBeforeObserver(obj, 'lastName', function () {
    lastNameWillChange++;
  });
  Ember.addObserver(obj, 'lastName', function () {
    lastNameDidChange++;
  });

  equal(get(obj, 'fullName'), 'Yehuda Katz');

  set(obj, 'fullName', 'Yehuda Katz');

  set(obj, 'fullName', 'Kris Selden');

  equal(get(obj, 'fullName'), 'Kris Selden');
  equal(get(obj, 'firstName'), 'Kris');
  equal(get(obj, 'lastName'), 'Selden');

  equal(fullNameWillChange, 1);
  equal(fullNameDidChange, 1);
  equal(firstNameWillChange, 1);
  equal(firstNameDidChange, 1);
  equal(lastNameWillChange, 1);
  equal(lastNameDidChange, 1);
});

testBoth('setting a cached computed property that modifies the value you give it', function(get, set) {
  var obj = {
    foo: 0
  };
  Ember.defineProperty(obj, 'plusOne', Ember.computed(
    function(key, value) {
      if (arguments.length > 1) {
        set(this, 'foo', value);
        return value + 1;
      }
      return get(this, 'foo') + 1;
    }).property('foo')
  );
  var plusOneWillChange = 0,
      plusOneDidChange = 0;
  Ember.addBeforeObserver(obj, 'plusOne', function () {
    plusOneWillChange++;
  });
  Ember.addObserver(obj, 'plusOne', function () {
    plusOneDidChange++;
  });

  equal(get(obj, 'plusOne'), 1);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);

  equal(plusOneWillChange, 1);
  equal(plusOneDidChange, 1);

  set(obj, 'foo', 5);
  equal(get(obj, 'plusOne'), 6);

  equal(plusOneWillChange, 2);
  equal(plusOneDidChange, 2);
});

module('Ember.computed - default setter');

testBoth("when setting a value on a computed property that doesn't handle sets", function(get, set) {
  var obj = {}, observerFired = false;

  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return 'foo';
  }));

  Ember.addObserver(obj, 'foo', null, function() {
    observerFired = true;
  });

  Ember.set(obj, 'foo', 'bar');

  equal(Ember.get(obj, 'foo'), 'bar', 'The set value is properly returned');
  ok(!Ember.meta(obj).descs.foo, 'The computed property was removed');
  ok(observerFired, 'The observer was still notified');
});

module('Ember.computed - readOnly');

test('is chainable', function() {
  var computed = Ember.computed(function(){}).readOnly();

  ok(computed instanceof Ember.Descriptor);
  ok(computed instanceof Ember.ComputedProperty);
});

testBoth('protects against setting', function(get, set) {
  var obj = {  };

  Ember.defineProperty(obj, 'bar', Ember.computed(function(key){
    return 'barValue';
  }).readOnly());

  equal(get(obj, 'bar'), 'barValue');

  raises(function(){
    set(obj, 'bar', 'newBar');
  }, /Cannot Set: bar on:/ );

  equal(get(obj, 'bar'), 'barValue');
});

module('CP macros');

testBoth('Ember.computed.not', function(get, set) {
  var obj = {foo: true};
  Ember.defineProperty(obj, 'notFoo', Ember.computed.not('foo'));
  equal(get(obj, 'notFoo'), false);

  obj = {foo: {bar: true}};
  Ember.defineProperty(obj, 'notFoo', Ember.computed.not('foo.bar'));
  equal(get(obj, 'notFoo'), false);
});

testBoth('Ember.computed.empty', function(get, set) {
  var obj = {foo: [], bar: undefined, baz: null, quz: ''};
  Ember.defineProperty(obj, 'fooEmpty', Ember.computed.empty('foo'));
  Ember.defineProperty(obj, 'barEmpty', Ember.computed.empty('bar'));
  Ember.defineProperty(obj, 'bazEmpty', Ember.computed.empty('baz'));
  Ember.defineProperty(obj, 'quzEmpty', Ember.computed.empty('quz'));

  equal(get(obj, 'fooEmpty'), true);
  set(obj, 'foo', [1]);
  equal(get(obj, 'fooEmpty'), false);
  equal(get(obj, 'barEmpty'), true);
  equal(get(obj, 'bazEmpty'), true);
  equal(get(obj, 'quzEmpty'), true);
  set(obj, 'quz', 'asdf');
  equal(get(obj, 'quzEmpty'), false);
});

testBoth('Ember.computed.bool', function(get, set) {
  var obj = {foo: function(){}, bar: 'asdf', baz: null, quz: false};
  Ember.defineProperty(obj, 'fooBool', Ember.computed.bool('foo'));
  Ember.defineProperty(obj, 'barBool', Ember.computed.bool('bar'));
  Ember.defineProperty(obj, 'bazBool', Ember.computed.bool('baz'));
  Ember.defineProperty(obj, 'quzBool', Ember.computed.bool('quz'));
  equal(get(obj, 'fooBool'), true);
  equal(get(obj, 'barBool'), true);
  equal(get(obj, 'bazBool'), false);
  equal(get(obj, 'quzBool'), false);
});

testBoth('Ember.computed.alias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false};
  Ember.defineProperty(obj, 'bay', Ember.computed(function(key){
    return 'apple';
  }));

  Ember.defineProperty(obj, 'barAlias', Ember.computed.alias('bar'));
  Ember.defineProperty(obj, 'bazAlias', Ember.computed.alias('baz'));
  Ember.defineProperty(obj, 'quzAlias', Ember.computed.alias('quz'));
  Ember.defineProperty(obj, 'bayAlias', Ember.computed.alias('bay'));

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);
  equal(get(obj, 'bayAlias'), 'apple');

  set(obj, 'barAlias', 'newBar');
  set(obj, 'bazAlias', 'newBaz');
  set(obj, 'quzAlias', null);

  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});

testBoth('Ember.computed.alias readOnly: true', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false};
  Ember.defineProperty(obj, 'bay', Ember.computed(function(key){
    return 'apple';
  }));

  Ember.defineProperty(obj, 'barAlias', Ember.computed.alias('bar', { readOnly: true }));
  Ember.defineProperty(obj, 'bazAlias', Ember.computed.alias('baz', { readOnly: true }));
  Ember.defineProperty(obj, 'quzAlias', Ember.computed.alias('quz', { readOnly: true }));
  Ember.defineProperty(obj, 'bayAlias', Ember.computed.alias('bay', { readOnly: true }));

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);
  equal(get(obj, 'bayAlias'), 'apple');

  raises(function(){
    set(obj, 'barAlias', 'newBar');
  }, /Cannot Set: barAlias on:/ );

  raises(function(){
    set(obj, 'bazAlias', 'newBaz');
  }, /Cannot Set: bazAlias on:/ );
 
  raises(function(){
    set(obj, 'quzAlias', null);
  }, /Cannot Set: quzAlias on:/ );

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);

  equal(get(obj, 'bar'), 'asdf');
  equal(get(obj, 'baz'), null);
  equal(get(obj, 'quz'), false);
});
