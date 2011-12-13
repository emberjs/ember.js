// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth Global */

require('ember-metal/~tests/props_helper');

// ..........................................................
// ADD OBSERVER
// 

module('Ember.addObserver');

testBoth('observer should fire when property is modified', function(get,set) {
  
  var obj = {};
  var count = 0;
  
  Ember.addObserver(obj, 'foo', function() { 
    equals(get(obj, 'foo'), 'bar', 'should invoke AFTER value changed');
    count++; 
  });

  set(obj, 'foo', 'bar');
  equals(count, 1, 'should have invoked observer');
});

testBoth('observer should fire when dependent property is modified', function(get, set) {
  var obj = { bar: 'bar' };
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return get(this,'bar').toUpperCase();
  }).property('bar'));
  
  var count = 0;
  Ember.addObserver(obj, 'foo', function() { 
    equals(get(obj, 'foo'), 'BAZ', 'should have invoked after prop change');
    count++; 
  });
  
  set(obj, 'bar', 'baz');
  equals(count, 1, 'should have invoked observer');
});

testBoth('nested observers should fire in order', function(get,set) {
  var obj = { foo: 'foo', bar: 'bar' };
  var fooCount = 0, barCount = 0;
  
  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });
  Ember.addObserver(obj, 'bar', function() {
    set(obj, 'foo', 'BAZ');
    equals(fooCount, 1, 'fooCount should have fired already');
    barCount++;
  });

  set(obj, 'bar', 'BIFF');
  equals(barCount, 1, 'barCount should have fired');
  equals(fooCount, 1, 'foo should have fired');
  
});

testBoth('suspending property changes will defer', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;

  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });

  Ember.beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  set(obj, 'foo', 'BAZ');
  Ember.endPropertyChanges(obj);

  equals(fooCount, 1, 'foo should have fired once');
});

testBoth('suspending property changes safely despite exceptions', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;
  var exc = new Error("Something unexpected happened!");

  expect(2);
  Ember.addObserver(obj, 'foo' ,function() { fooCount++; });

  try {
    Ember.changeProperties(function(){
      set(obj, 'foo', 'BIFF');
      set(obj, 'foo', 'BAZ');
      throw exc;
    });
  } catch(err) {
    if (err != exc)
      throw err;
  }

  equals(fooCount, 1, 'foo should have fired once');

  Ember.changeProperties(function(){
    set(obj, 'foo', 'BIFF2');
    set(obj, 'foo', 'BAZ2');
  });

  equals(fooCount, 2, 'foo should have fired again once');
});

testBoth('suspending property changes will not defer before observers', function(get,set) {
  var obj = { foo: 'foo' };
  var fooCount = 0;

  Ember.addBeforeObserver(obj, 'foo' ,function() { fooCount++; });

  Ember.beginPropertyChanges(obj);
  set(obj, 'foo', 'BIFF');
  equals(fooCount, 1, 'should fire before observer immediately');
  set(obj, 'foo', 'BAZ');
  Ember.endPropertyChanges(obj);

  equals(fooCount, 1, 'should not fire before observer twice');
});

testBoth('addObserver should propogate through prototype', function(get,set) {
  var obj = { foo: 'foo', count: 0 }, obj2;
  
  Ember.addObserver(obj, 'foo', function() { this.count++; });
  obj2 = Ember.create(obj);
  
  set(obj2, 'foo', 'bar');

  equals(obj2.count, 1, 'should have invoked observer on inherited');
  equals(obj.count, 0, 'should not have invoked observer on parent');
  
  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equals(obj.count, 1, 'should have invoked observer on parent');
  equals(obj2.count, 0, 'should not have invoked observer on inherited');  
});

testBoth('addObserver should respect targets with methods', function(get,set){
  var observed = { foo: 'foo' };
  
  var target1 = { 
    count: 0, 
    
    didChange: function(obj, keyName, value) {
      equals(this, target1, 'should invoke with this');
      equals(obj, observed, 'param1 should be observed object');
      equals(keyName, 'foo', 'param2 should be keyName');
      equals(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  var target2 = { 
    count: 0, 
    
    didChange: function(obj, keyName, value) {
      equals(this, target2, 'should invoke with this');
      equals(obj, observed, 'param1 should be observed object');
      equals(keyName, 'foo', 'param2 should be keyName');
      equals(value, 'BAZ', 'param3 should new value');
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, target2.didChange);
  
  set(observed, 'foo', 'BAZ');
  equals(target1.count, 1, 'target1 observer should have fired');
  equals(target2.count, 1, 'target2 observer should have fired');

});

testBoth('addObserver should preserve additional context passed when firing the observer', function(get, set) {
  var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    didChange: function(obj, keyName, value, ctx1, ctx2) {
      equals(ctx1, "biff", "first context is passed");
      equals(ctx2, "bang", "second context is passed");
      equals(5, arguments.length);
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange', "biff", "bang");

  set(observed, 'foo', 'BAZ');
  equals(target1.count, 1, 'target1 observer should have fired');

  set(observed, 'foo', 'BAZ2');
  equals(target1.count, 2, 'target1 observer should have fired');
});


testBoth('addObserver should allow multiple objects to observe a property', function(get, set) { var observed = { foo: 'foo' };

  var target1 = {
    count: 0,

    didChange: function(obj, keyName, value) {
      this.count++;
    }
  };

  var target2 = {
    count: 0,

    didChange: function(obj, keyName, value) {
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, 'didChange');

  set(observed, 'foo', 'BAZ');
  equals(target1.count, 1, 'target1 observer should have fired');
  equals(target2.count, 1, 'target2 observer should have fired');
});

// ..........................................................
// REMOVE OBSERVER
// 

module('Ember.removeObserver');

testBoth('removing observer should stop firing', function(get,set) {
  
  var obj = {};
  var count = 0;
  function F() { count++; }
  Ember.addObserver(obj, 'foo', F);
  
  set(obj, 'foo', 'bar');
  equals(count, 1, 'should have invoked observer');
  
  Ember.removeObserver(obj, 'foo', F);
});

testBoth('local observers can be removed', function(get, set) {
  var barObserved = 0;

  var MyMixin = Ember.Mixin.create({
    foo1: Ember.observer(function() {
      barObserved++;
    }, 'bar'),

    foo2: Ember.observer(function() {
      barObserved++;
    }, 'bar')
  });

  var obj = {};
  MyMixin.apply(obj);

  set(obj, 'bar', 'HI!');
  equals(barObserved, 2, 'precond - observers should be fired');

  Ember.removeObserver(obj, 'bar', null, 'foo1');

  barObserved = 0;
  set(obj, 'bar', 'HI AGAIN!');

  equals(barObserved, 1, 'removed observers should not be called');
});

testBoth('removeObserver should respect targets with methods', function(get,set){
  var observed = { foo: 'foo' };
  
  var target1 = { 
    count: 0, 
    
    didChange: function() {
      this.count++;
    }
  };

  var target2 = { 
    count: 0, 
    
    didChange: function() {
      this.count++;
    }
  };

  Ember.addObserver(observed, 'foo', target1, 'didChange');
  Ember.addObserver(observed, 'foo', target2, target2.didChange);
  
  set(observed, 'foo', 'BAZ');
  equals(target1.count, 1, 'target1 observer should have fired');
  equals(target2.count, 1, 'target2 observer should have fired');

  Ember.removeObserver(observed, 'foo', target1, 'didChange');
  Ember.removeObserver(observed, 'foo', target2, target2.didChange);

  target1.count = target2.count = 0;
  set(observed, 'foo', 'BAZ');
  equals(target1.count, 0, 'target1 observer should not fire again');
  equals(target2.count, 0, 'target2 observer should not fire again');
});

// ..........................................................
// BEFORE OBSERVER
// 

module('Ember.addBeforeObserver');

testBoth('observer should fire before a property is modified', function(get,set) {
  
  var obj = { foo: 'foo' };
  var count = 0;
  
  Ember.addBeforeObserver(obj, 'foo', function() { 
    equals(get(obj, 'foo'), 'foo', 'should invoke before value changed');
    count++; 
  });
  
  set(obj, 'foo', 'bar');
  equals(count, 1, 'should have invoked observer');
});

testBoth('observer should fire before dependent property is modified', function(get, set) {
  var obj = { bar: 'bar' };
  Ember.defineProperty(obj, 'foo', Ember.computed(function() {
    return get(this,'bar').toUpperCase();
  }).property('bar'));
  
  var count = 0;
  Ember.addBeforeObserver(obj, 'foo', function() { 
    equals(get(obj, 'foo'), 'BAR', 'should have invoked after prop change');
    count++; 
  });
  
  set(obj, 'bar', 'baz');
  equals(count, 1, 'should have invoked observer');
});

testBoth('addBeforeObserver should propogate through prototype', function(get,set) {
  var obj = { foo: 'foo', count: 0 }, obj2;
  
  Ember.addBeforeObserver(obj, 'foo', function() { this.count++; });
  obj2 = Ember.create(obj);

  set(obj2, 'foo', 'bar');
  equals(obj2.count, 1, 'should have invoked observer on inherited');
  equals(obj.count, 0, 'should not have invoked observer on parent');
  
  obj2.count = 0;
  set(obj, 'foo', 'baz');
  equals(obj.count, 1, 'should have invoked oberver on parent');
  equals(obj2.count, 0, 'should not have invoked observer on inherited');  
});

testBoth('addBeforeObserver should respect targets with methods', function(get,set){
  var observed = { foo: 'foo' };
  
  var target1 = { 
    count: 0, 
    
    willChange: function(obj, keyName, value) {
      equals(this, target1, 'should invoke with this');
      equals(obj, observed, 'param1 should be observed object');
      equals(keyName, 'foo', 'param2 should be keyName');
      equals(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  var target2 = { 
    count: 0, 
    
    willChange: function(obj, keyName, value) {
      equals(this, target2, 'should invoke with this');
      equals(obj, observed, 'param1 should be observed object');
      equals(keyName, 'foo', 'param2 should be keyName');
      equals(value, 'foo', 'param3 should old value');
      this.count++;
    }
  };

  Ember.addBeforeObserver(observed, 'foo', target1, 'willChange');
  Ember.addBeforeObserver(observed, 'foo', target2, target2.willChange);
  
  set(observed, 'foo', 'BAZ');
  equals(target1.count, 1, 'target1 observer should have fired');
  equals(target2.count, 1, 'target2 observer should have fired');
  
});

// ..........................................................
// CHAINED OBSERVERS
// 

var obj, count;

module('Ember.computed - dependentkey with chained properties', {
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
  },
  
  teardown: function() {
    obj = count = Global = null;
  } 
});

testBoth('depending on a simple chain', function(get, set) { 

  var val ;
  Ember.addObserver(obj, 'foo.bar.baz.biff', function(target, key, value) { 
    val = value;
    count++; 
  });
  
  set(Ember.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 1);

  set(Ember.getPath(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
  equals(val, 'BLARG');
  equals(count, 2);

  set(Ember.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(val, 'BOOM');
  equals(count, 3);
  
  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(val, 'BLARG');
  equals(count, 4);
  
  set(Ember.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 5);

  var foo = get(obj, 'foo');
  
  set(obj, 'foo', 'BOO');
  equals(val, undefined);
  equals(count, 6);
  
  set(foo.bar.baz, 'biff', "BOOM");
  equals(count, 6, 'should be not have invoked observer');
});

testBoth('depending on complex chain', function(get, set) {
  
  var val ;
  Ember.addObserver(obj, 'foo.bar*baz.biff', function(target, key, value) { 
    val = value;
    count++; 
  });
  
  set(Ember.getPath(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 1);

  set(Ember.getPath(obj, 'foo.bar'), 'baz', { biff: 'BLARG' });
  equals(val, 'BLARG');
  equals(count, 2);

  // // NOTHING SHOULD CHANGE AFTER THIS POINT BECAUSE OF THE CHAINED *

  set(Ember.get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equals(val, 'BLARG');
  equals(count, 2);
  
  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(val, 'BLARG');
  equals(count, 2);
  

});

testBoth('depending on a Global chain', function(get, set) { 

  var val ;
  Ember.addObserver(obj, 'Global.foo.bar.baz.biff', function(target, key, value){ 
    val = value;
    count++; 
  });
  
  set(Ember.getPath(Global, 'foo.bar.baz'),  'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 1);

  set(Ember.getPath(Global, 'foo.bar'),  'baz', { biff: 'BLARG' });
  equals(val, 'BLARG');
  equals(count, 2);

  set(Ember.get(Global, 'foo'),  'bar', { baz: { biff: 'BOOM' } });
  equals(val, 'BOOM');
  equals(count, 3);
  
  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(val, 'BLARG');
  equals(count, 4);
  
  set(Ember.getPath(Global, 'foo.bar.baz'),  'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 5);

  var foo = get(obj, 'foo');
  
  set(Global, 'foo', 'BOO');
  equals(val, undefined);
  equals(count, 6);
  
  set(foo.bar.baz, 'biff', "BOOM");
  equals(count, 6, 'should be not have invoked observer');
});

testBoth('depending on complex chain', function(get, set) {
  
  var val ;
  Ember.addObserver(obj, 'Global.foo.bar*baz.biff', function(target, key, value){ 
    val = value;
    count++; 
  });
  
  set(Ember.getPath(Global, 'foo.bar.baz'),  'biff', 'BUZZ');
  equals(val, 'BUZZ');
  equals(count, 1);

  set(Ember.getPath(Global, 'foo.bar'),  'baz', { biff: 'BLARG' });
  equals(val, 'BLARG');
  equals(count, 2);

  // // NOTHING SHOULD CHANGE AFTER THIS POINT BECAUSE OF THE CHAINED *

  set(Ember.get(Global, 'foo'),  'bar', { baz: { biff: 'BOOM' } });
  equals(val, 'BLARG');
  equals(count, 2);
  
  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equals(val, 'BLARG');
  equals(count, 2);

});

// ..........................................................
// SETTING IDENTICAL VALUES
// 

module('props/observer_test - setting identical values');

testBoth('setting simple prop should not trigger', function(get, set) {
  
  var obj = { foo: 'bar' };
  var count = 0;
  
  Ember.addObserver(obj, 'foo', function() { count++; });
  
  set(obj, 'foo', 'bar');
  equals(count, 0, 'should not trigger observer');
  
  set(obj, 'foo', 'baz');
  equals(count, 1, 'should trigger observer');
  
  set(obj, 'foo', 'baz');
  equals(count, 1, 'should not trigger observer again');
});

testBoth('setting computed prop with same value should not trigger', function(get, set) {
  
  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(key, value) {
    if (value !== undefined) this._value = value+' X';
    return this._value;
  }));
  
  var count = 0;
  
  Ember.addObserver(obj, 'foo', function() { count++; });
  
  set(obj, 'foo', 'bar');
  equals(count, 1, 'should trigger observer since we do not have existing val');
  
  set(obj, 'foo', 'baz');
  equals(count, 2, 'should trigger observer');
  
  set(obj, 'foo', 'baz');
  equals(count, 2, 'should not trigger observer again');
});
