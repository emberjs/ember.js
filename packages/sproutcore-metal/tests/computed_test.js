// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth Global */

require('sproutcore-metal/~tests/props_helper');

var obj, count;

module('SC.computed');

test('computed property should be an instance of descriptor', function() {
  ok(SC.computed(function() {}) instanceof SC.Descriptor);
});

test('defining computed property should invoke property on get', function() {

  var obj = {};
  var count = 0;
  SC.defineProperty(obj, 'foo', SC.computed(function(key) {
    count++;
    return 'computed '+key;
  }));

  equals(SC.get(obj, 'foo'), 'computed foo', 'should return value');
  equals(count, 1, 'should have invoked computed property');

  if (SC.USES_ACCESSORS) {
    count = 0;
    equals(SC.get(obj, 'foo'), 'computed foo', 'should return value');
    equals(count, 1, 'should have invoked computed property');
  }
});

test('defining computed property should invoke property on set', function() {

  var obj = {};
  var count = 0;
  SC.defineProperty(obj, 'foo', SC.computed(function(key, value) {
    if (value !== undefined) {
      count++;
      this['__'+key] = 'computed '+value;
    }
    return this['__'+key];
  }));
  
  equals(SC.set(obj, 'foo', 'bar'), 'bar', 'should return set value');
  equals(count, 1, 'should have invoked computed property');
  equals(SC.get(obj, 'foo'), 'computed bar', 'should return new value');
  
  if (SC.USES_ACCESSORS) {
    count = 0;
    equals(obj.foo = 'bar', 'bar', 'shoudl return set value');
    equals(count, 1, 'should have invoked computed property');
    equals(SC.get(obj, 'foo'), 'computed bar', 'should return value');
  }
});

var objA, objB;
module('SC.computed should inherit through prototype', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    SC.defineProperty(objA, 'foo', SC.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = SC.create(objA);
    objB.__foo = 'FOO'; // make a copy;
  },
  
  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equals(get(objA, 'foo'), 'FOO', 'should get FOO from A');  
  equals(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equals(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equals(get(objB, 'foo'), 'FOO', 'should NOT change B');
  
  set(objB, 'foo', 'bar');
  equals(get(objB, 'foo'), 'computed bar', 'should change B');
  equals(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equals(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equals(get(objB, 'foo'), 'computed bar', 'should NOT change B');
});

module('redefining computed property to normal', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    SC.defineProperty(objA, 'foo', SC.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'computed '+value;
      }
      return this['__'+key];
    }));

    objB = SC.create(objA);
    SC.defineProperty(objB, 'foo'); // make this just a normal property.
  },
  
  teardown: function() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equals(get(objA, 'foo'), 'FOO', 'should get FOO from A');  
  equals(get(objB, 'foo'), undefined, 'should get undefined from B');

  set(objA, 'foo', 'BIFF');
  equals(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equals(get(objB, 'foo'), undefined, 'should NOT change B');
  
  set(objB, 'foo', 'bar');
  equals(get(objB, 'foo'), 'bar', 'should change B');
  equals(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equals(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equals(get(objB, 'foo'), 'bar', 'should NOT change B');
});

module('redefining computed property to another property', {
  setup: function() {
    objA = { __foo: 'FOO' } ;
    SC.defineProperty(objA, 'foo', SC.computed(function(key, value) {
      if (value !== undefined) {
        this['__'+key] = 'A '+value;
      }
      return this['__'+key];
    }));

    objB = SC.create(objA);
    objB.__foo = 'FOO';
    SC.defineProperty(objB, 'foo', SC.computed(function(key, value) {
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
  equals(get(objA, 'foo'), 'FOO', 'should get FOO from A');  
  equals(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equals(get(objA, 'foo'), 'A BIFF', 'should change A');
  equals(get(objB, 'foo'), 'FOO', 'should NOT change B');
  
  set(objB, 'foo', 'bar');
  equals(get(objB, 'foo'), 'B bar', 'should change B');
  equals(get(objA, 'foo'), 'A BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equals(get(objA, 'foo'), 'A BAZ', 'should change A');
  equals(get(objB, 'foo'), 'B bar', 'should NOT change B');
});


// ..........................................................
// CACHEABLE
// 

module('SC.computed - cacheable', {
  setup: function() {
    obj = {};
    count = 0;
    SC.defineProperty(obj, 'foo', SC.computed(function() {
      count++;
      return 'bar '+count;    
    }).cacheable());
  },
  
  teardown: function() {
    obj = count = null;
  }
});

testBoth('cacheable should cache', function(get, set) {
  equals(get(obj, 'foo'), 'bar 1', 'first get');
  equals(get(obj, 'foo'), 'bar 1', 'second get');
  equals(count, 1, 'should only invoke once');
});

testBoth('modifying a cacheable property should update cache', function(get, set) {
  equals(get(obj, 'foo'), 'bar 1', 'first get');
  equals(get(obj, 'foo'), 'bar 1', 'second get');

  equals(set(obj, 'foo', 'baz'), 'baz', 'setting');
  equals(get(obj, 'foo'), 'bar 2', 'third get');
  equals(count, 2, 'should not invoke again');
});

testBoth('inherited property should not pick up cache', function(get, set) {
  var objB = SC.create(obj);

  equals(get(obj, 'foo'), 'bar 1', 'obj first get');
  equals(get(objB, 'foo'), 'bar 2', 'objB first get');

  equals(get(obj, 'foo'), 'bar 1', 'obj second get');
  equals(get(objB, 'foo'), 'bar 2', 'objB second get');
  
  set(obj, 'foo', 'baz'); // modify A
  equals(get(obj, 'foo'), 'bar 3', 'obj third get');
  equals(get(objB, 'foo'), 'bar 2', 'objB third get');
});

// ..........................................................
// DEPENDENT KEYS
// 

SC.STOP = true;

module('SC.computed - dependentkey', {
  setup: function() {
    obj = { bar: 'baz' };
    count = 0;
    SC.defineProperty(obj, 'foo', SC.computed(function() {
      count++;
      return 'bar '+count;    
    }).property('bar').cacheable());
  },
  
  teardown: function() {
    obj = count = null;
  }
});

testBoth('local dependent key should invalidate cache', function(get, set) {
  equals(get(obj, 'foo'), 'bar 1', 'get once');
  equals(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate foo

  equals(get(obj, 'foo'), 'bar 2', 'should recache');
  equals(get(obj, 'foo'), 'bar 2', 'cached retrieve');
});

testBoth('should invalidate multiple nested dependent keys', function(get, set) {
  
  SC.defineProperty(obj, 'bar', SC.computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz').cacheable());
  
  equals(get(obj, 'foo'), 'bar 1', 'get once');
  equals(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'baz', 'BIFF'); // should invalidate bar -> foo

  equals(get(obj, 'foo'), 'bar 2', 'should recache');
  equals(get(obj, 'foo'), 'bar 2', 'cached retrieve');
});

testBoth('circular keys should not blow up', function(get, set) {
  
  SC.defineProperty(obj, 'bar', SC.computed(function() {
    count++;
    return 'bar '+count;
  }).property('foo').cacheable());

  SC.defineProperty(obj, 'foo', SC.computed(function() {
    count++;
    return 'foo '+count;
  }).property('bar').cacheable());
  
  equals(get(obj, 'foo'), 'foo 1', 'get once');
  equals(get(obj, 'foo'), 'foo 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

  equals(get(obj, 'foo'), 'foo 3', 'should recache');
  equals(get(obj, 'foo'), 'foo 3', 'cached retrieve');
});

testBoth('redefining a property should undo old depenent keys', function(get ,set) {

  equals(get(obj, 'foo'), 'bar 1');

  SC.defineProperty(obj, 'foo', SC.computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz').cacheable());

  equals(get(obj, 'foo'), 'baz 2');
  
  set(obj, 'bar', 'BIFF'); // should not kill cache
  equals(get(obj, 'foo'), 'baz 2');
  
  set(obj, 'baz', 'BOP');
  equals(get(obj, 'foo'), 'baz 3');
});

// ..........................................................
// CHAINED DEPENDENT KEYS
// 

var func;

module('SC.computed - dependentkey with chained properties', {
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
      return SC.getPath(obj, 'foo.bar.baz.biff')+' '+count;    
    };
  },
  
  teardown: function() {
    obj = count = func = Global = null;
  }
});

testBoth('depending on simple chain', function(get, set) {

  // assign computed property
  SC.defineProperty(obj, 'prop', 
    SC.computed(func).property('foo.bar.baz.biff').cacheable());

  equals(get(obj, 'prop'), 'BIFF 1');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 2');
  equals(get(obj, 'prop'), 'BUZZ 2');
  
  set(SC.getPath(obj, 'foo.bar'),  'baz', { biff: 'BLOB' });
  equals(get(obj, 'prop'), 'BLOB 3');
  equals(get(obj, 'prop'), 'BLOB 3');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(get(obj, 'prop'), 'BOOM 5');
  equals(get(obj, 'prop'), 'BOOM 5');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 6');
  equals(get(obj, 'prop'), 'BUZZ 6');
  
  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'BLARG 7');
  equals(get(obj, 'prop'), 'BLARG 7');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 8');
  equals(get(obj, 'prop'), 'BUZZ 8');
  
  SC.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equals(get(obj, 'prop'), 'NONE');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'NONE'); // should do nothing
  equals(count, 8, 'should be not have invoked computed again');

});

testBoth('depending on complex chain', function(get, set) {

  // assign computed property
  SC.defineProperty(obj, 'prop', 
    SC.computed(func).property('foo.bar*baz.biff').cacheable());

  equals(get(obj, 'prop'), 'BIFF 1');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 2');
  equals(get(obj, 'prop'), 'BUZZ 2');
  
  set(SC.getPath(obj, 'foo.bar'),  'baz', { biff: 'BLOB' });
  equals(get(obj, 'prop'), 'BLOB 3');
  equals(get(obj, 'prop'), 'BLOB 3');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');

  // NOTHING SHOULD CHANGE AFTER THIS POINT BECAUSE OF THE CHAINED *
  
  set(SC.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  SC.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equals(get(obj, 'prop'), 'NONE');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'NONE'); // should do nothing
  equals(count, 4, 'should be not have invoked computed again');

});

testBoth('depending on Global chain', function(get, set) {

  // assign computed property
  SC.defineProperty(obj, 'prop', SC.computed(function() {
    count++;
    return SC.getPath('Global.foo.bar.baz.biff')+' '+count;    
  }).property('Global.foo.bar.baz.biff').cacheable());

  equals(get(obj, 'prop'), 'BIFF 1');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 2');
  equals(get(obj, 'prop'), 'BUZZ 2');
  
  set(SC.getPath(Global, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equals(get(obj, 'prop'), 'BLOB 3');
  equals(get(obj, 'prop'), 'BLOB 3');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.get(Global, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(get(obj, 'prop'), 'BOOM 5');
  equals(get(obj, 'prop'), 'BOOM 5');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 6');
  equals(get(obj, 'prop'), 'BUZZ 6');
  
  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'BLARG 7');
  equals(get(obj, 'prop'), 'BLARG 7');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 8');
  equals(get(obj, 'prop'), 'BUZZ 8');
  
  SC.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equals(get(obj, 'prop'), 'NONE');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'NONE'); // should do nothing
  equals(count, 8, 'should be not have invoked computed again');

});

testBoth('depending on complex Global chain', function(get, set) {

  // assign computed property
  SC.defineProperty(obj, 'prop', SC.computed(function() {
    count++;
    return SC.getPath('Global.foo.bar.baz.biff')+' '+count;    
  }).property('Global.foo.bar*baz.biff').cacheable());

  equals(get(obj, 'prop'), 'BIFF 1');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 2');
  equals(get(obj, 'prop'), 'BUZZ 2');
  
  set(SC.getPath(Global, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equals(get(obj, 'prop'), 'BLOB 3');
  equals(get(obj, 'prop'), 'BLOB 3');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');

  // NOTHING SHOULD CHANGE AFTER THIS POINT BECAUSE OF THE CHAINED *
  
  set(SC.get(Global, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  set(SC.getPath(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(get(obj, 'prop'), 'BUZZ 4');
  equals(get(obj, 'prop'), 'BUZZ 4');
  
  SC.defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equals(get(obj, 'prop'), 'NONE');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(get(obj, 'prop'), 'NONE'); // should do nothing
  equals(count, 4, 'should be not have invoked computed again');

});

// ..........................................................
// BUGS
// 

module('computed edge cases');

test('adding a computed property should show up in key iteration',function() {

  var obj = {};
  SC.defineProperty(obj, 'foo', SC.computed(function() {}));
  
  var found = [];
  for(var key in obj) found.push(key);
  ok(found.indexOf('foo')>=0, 'should find computed property in iteration found='+found);
  ok('foo' in obj, 'foo in obj should pass');
});

