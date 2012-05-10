// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global Namespace:true DepObj:true*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.ArrayUtils.forEach;

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Added ObservableObject which applies the Ember.Observable mixin.
  * Changed reference to Ember.T_FUNCTION to 'function'
  * Changed all references to sc_super to this._super()
  * Changed Ember.objectForPropertyPath() to Ember.getPath()
  * Removed allPropertiesDidChange test - no longer supported
  * Changed test that uses 'ObjectE' as path to 'objectE' to reflect new
    rule on using capital letters for property paths.
  * Removed test passing context to addObserver.  context param is no longer
    supported.
  * Changed calls to Ember.Binding.flushPendingChanges() -> Ember.run.sync()
  * removed test in observer around line 862 that expected key/value to be
    the last item in the chained path.  Should be root and chained path

*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================

var object, ObjectC, ObjectD, objectA, objectB ;

var ObservableObject = Ember.Object.extend(Ember.Observable);

// ..........................................................
// GET()
//

module("object.get()", {

  setup: function() {
    object = ObservableObject.create(Ember.Observable, {

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: Ember.computed(function() { return 'value'; }).property().volatile(),

      method: function() { return "value"; },

      nullProperty: null,

      unknownProperty: function(key, value) {
        this.lastUnknownProperty = key ;
        this._super(key, value);
        return "unknown" ;
      }

    });
  }

});

test("should get normal properties", function() {
  equal(object.get('normal'), 'value') ;
});

test("should call computed properties and return their result", function() {
  equal(object.get("computed"), "value") ;
});

test("should return the function for a non-computed property", function() {
  var value = object.get("method") ;
  equal(Ember.typeOf(value), 'function') ;
});

test("should return null when property value is null", function() {
  equal(object.get("nullProperty"), null) ;
});

test("should call unknownProperty when value is undefined", function() {
  equal(object.get("unknown"), "unknown") ;
  equal(object.lastUnknownProperty, "unknown") ;
});

// ..........................................................
// Ember.GET()
//
module("Ember.get()", {
  setup: function() {
    objectA = ObservableObject.create({

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: Ember.computed(function() { return 'value'; }).property().volatile(),

      method: function() { return "value"; },

      nullProperty: null,

      unknownProperty: function(key, value) {
        this.lastUnknownProperty = key ;
        this._super(key, value);
        return "unknown" ;
      }

    });

    objectB = {
      normal: 'value',

      nullProperty: null
    };
  }
});

test("should get normal properties on Ember.Observable", function() {
  equal(Ember.get(objectA, 'normal'), 'value') ;
});

test("should call computed properties on Ember.Observable and return their result", function() {
  equal(Ember.get(objectA, "computed"), "value") ;
});

test("should return the function for a non-computed property on Ember.Observable", function() {
  var value = Ember.get(objectA, "method") ;
  equal(Ember.typeOf(value), 'function') ;
});

test("should return null when property value is null on Ember.Observable", function() {
  equal(Ember.get(objectA, "nullProperty"), null) ;
});

test("should call unknownProperty when value is undefined on Ember.Observable", function() {
  equal(Ember.get(object, "unknown"), "unknown") ;
  equal(object.lastUnknownProperty, "unknown") ;
});

test("should get normal properties on standard objects", function() {
  equal(Ember.get(objectB, 'normal'), 'value');
});

test("should return null when property is null on standard objects", function() {
  equal(Ember.get(objectB, 'nullProperty'), null);
});

test("raise if the provided object is null", function() {
  raises(function() {
    Ember.get(null, 'key');
  });
});

test("raise if the provided object is undefined", function() {
  raises(function() {
    Ember.get(undefined, 'key');
  });
});

test("should work when object is Ember (used in Ember.getPath)", function() {
  equal(Ember.getPath('Ember.RunLoop'), Ember.RunLoop, 'Ember.getPath');
  equal(Ember.get('RunLoop'), Ember.RunLoop, 'Ember.get(RunLoop)');
  equal(Ember.get(Ember, 'RunLoop'), Ember.RunLoop, 'Ember.get(Ember, RunLoop)');
});

module("Ember.getPath()");

test("should return a property at a given path relative to the window", function() {
  window.Foo = ObservableObject.create({
    Bar: ObservableObject.create({
      Baz: Ember.computed(function() { return "blargh"; }).property().volatile()
    })
  });

  try {
    equal(Ember.getPath('Foo.Bar.Baz'), "blargh");
  } finally {
    window.Foo = undefined;
  }
});

test("should return a property at a given path relative to the passed object", function() {
  var foo = ObservableObject.create({
    bar: ObservableObject.create({
      baz: Ember.computed(function() { return "blargh"; }).property().volatile()
    })
  });

  equal(Ember.getPath(foo, 'bar.baz'), "blargh");
});

test("should return a property at a given path relative to the window - JavaScript hash", function() {
  window.Foo = {
    Bar: {
      Baz: "blargh"
    }
  };

  try {
    equal(Ember.getPath('Foo.Bar.Baz'), "blargh");
  } finally {
    window.Foo = undefined;
  }
});

test("should return a property at a given path relative to the passed object - JavaScript hash", function() {
  var foo = {
    bar: {
      baz: "blargh"
    }
  };

  equal(Ember.getPath(foo, 'bar.baz'), "blargh");
});

// ..........................................................
// SET()
//

module("object.set()", {

  setup: function() {
    object = ObservableObject.create({

      // normal property
      normal: 'value',

      // computed property
      _computed: "computed",
      computed: Ember.computed(function(key, value) {
        if (value !== undefined) {
          this._computed = value ;
        }
        return this._computed ;
      }).property().volatile(),

      // method, but not a property
      _method: "method",
      method: function(key, value) {
        if (value !== undefined) {
          this._method = value ;
        }
        return this._method ;
      },

      // null property
      nullProperty: null,

      // unknown property
      _unknown: 'unknown',
      unknownProperty: function(key) {
        this._super(key);
        return this._unknown ;
      },

      setUnknownProperty: function(key, value) {
        this._unknown = value ;
        this._super(key, value);
        return this._unknown ;
      }
    });
  }

});

test("should change normal properties and return this", function() {
  var ret = object.set("normal", "changed") ;
  equal(object.normal, "changed") ;
  equal(ret, object) ;
});

test("should call computed properties passing value and return this", function() {
  var ret = object.set("computed", "changed") ;
  equal(object._computed, "changed") ;

  // DISABLED: this is no longer true with accessors
  //equal(Ember.typeOf(object.computed), 'function') ;

  equal(ret, object) ;
});

test("should change normal properties when passing undefined", function() {
  var ret = object.set('normal', undefined);
  equal(object.normal, undefined);
  equal(ret, object);
});

test("should replace the function for a non-computed property and return this", function() {
  var ret = object.set("method", "changed") ;
  equal(object._method, "method") ; // make sure this was NOT run
  ok(Ember.typeOf(object.method) !== 'function') ;
  equal(ret, object) ;
});

test("should replace prover when property value is null", function() {
  var ret = object.set("nullProperty", "changed") ;
  equal(object.nullProperty, "changed") ;
  equal(ret, object) ;
});

test("should call unknownProperty with value when property is undefined", function() {
  var ret = object.set("unknown", "changed") ;
  equal(object._unknown, "changed") ;
  equal(ret, object) ;
});

// ..........................................................
// COMPUTED PROPERTIES
//

module("Computed properties", {
  setup: function() {
    object = ObservableObject.create({

      // REGULAR

      computedCalls: [],
      computed: Ember.computed(function(key, value) {
        this.computedCalls.push(value);
        return 'computed';
      }).property().volatile(),

      computedCachedCalls: [],
      computedCached: Ember.computed(function(key, value) {
        this.computedCachedCalls.push(value);
        return 'computedCached';
      }).property().cacheable(),


      // DEPENDENT KEYS

      changer: 'foo',

      dependentCalls: [],
      dependent: Ember.computed(function(key, value) {
        this.dependentCalls.push(value);
        return 'dependent';
      }).property('changer').volatile(),

      dependentFrontCalls: [],
      dependentFront: Ember.computed('changer', function(key, value) {
        this.dependentFrontCalls.push(value);
        return 'dependentFront';
      }).volatile(),

      dependentCachedCalls: [],
      dependentCached: Ember.computed(function(key, value) {
        this.dependentCachedCalls.push(value);
        return 'dependentCached';
      }).property('changer').cacheable(),

      // everytime it is recomputed, increments call
      incCallCount: 0,
      inc: Ember.computed(function() {
        return this.incCallCount++;
      }).property('changer').cacheable(),

      // depends on cached property which depends on another property...
      nestedIncCallCount: 0,
      nestedInc: Ember.computed(function(key, value) {
        return this.nestedIncCallCount++;
      }).property('inc').cacheable(),

      // two computed properties that depend on a third property
      state: 'on',
      isOn: Ember.computed(function(key, value) {
        if (value !== undefined) this.set('state', 'on');
        return this.get('state') === 'on';
      }).property('state').volatile(),

      isOff: Ember.computed(function(key, value) {
        if (value !== undefined) this.set('state', 'off');
        return this.get('state') === 'off';
      }).property('state').volatile()

    }) ;
  }
});

test("getting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = Ember.String.w('computed computedCached dependent dependentFront dependentCached');

  forEach(keys, function(key) {
    equal(object.get(key), key, Ember.String.fmt('Try #1: object.get(%@) should run function', [key]));
    equal(object.get(key), key, Ember.String.fmt('Try #2: object.get(%@) should run function', [key]));
  });

  // verify each call count.  cached should only be called once
  forEach(Ember.String.w('computedCalls dependentFrontCalls dependentCalls'), function(key) {
    equal(object[key].length, 2, Ember.String.fmt('non-cached property %@ should be called 2x', [key]));
  });

  forEach(Ember.String.w('computedCachedCalls dependentCachedCalls'), function(key) {
    equal(object[key].length, 1, Ember.String.fmt('non-cached property %@ should be called 1x', [key]));
  });

});

test("setting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = Ember.String.w('computed dependent dependentFront computedCached dependentCached');
  var values = Ember.String.w('value1 value2');

  forEach(keys, function(key) {

    equal(object.set(key, values[0]), object, Ember.String.fmt('Try #1: object.set(%@, %@) should run function', [key, values[0]]));

    equal(object.set(key, values[1]), object, Ember.String.fmt('Try #2: object.set(%@, %@) should run function', [key, values[1]]));

    equal(object.set(key, values[1]), object, Ember.String.fmt('Try #3: object.set(%@, %@) should not run function since it is setting same value as before', [key, values[1]]));

  });


  // verify each call count.  cached should only be called once
  forEach(keys, function(key) {
    var calls = object[key + 'Calls'], idx;
    var expectedLength;

    // Cached properties first check their cached value before setting the
    // property. Other properties blindly call set.
    expectedLength = 3;
    equal(calls.length, expectedLength, Ember.String.fmt('set(%@) should be called the right amount of times', [key]));
    for(idx=0;idx<2;idx++) {
      equal(calls[idx], values[idx], Ember.String.fmt('call #%@ to set(%@) should have passed value %@', [idx+1, key, values[idx]]));
    }
  });

});

test("notify change should clear cache", function() {

  // call get several times to collect call count
  object.get('computedCached'); // should run func
  object.get('computedCached'); // should not run func

  object.propertyWillChange('computedCached')
    .propertyDidChange('computedCached');

  object.get('computedCached'); // should run again
  equal(object.computedCachedCalls.length, 2, 'should have invoked method 2x');
});

test("change dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

test("just notifying change of dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

test("changing dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});

test("just notifying change of dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});


// This verifies a specific bug encountered where observers for computed
// properties would fire before their prop caches were cleared.
test("change dependent should clear cache when observers of dependent are called", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  // add observer to verify change...
  object.addObserver('inc', this, function() {
    equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
  });

  // now run
  object.set('changer', 'bar');

});

test('setting one of two computed properties that depend on a third property should clear the kvo cache', function() {
  // we have to call set twice to fill up the cache
  object.set('isOff', true);
  object.set('isOn', true);

  // setting isOff to true should clear the kvo cache
  object.set('isOff', true);
  equal(object.get('isOff'), true, 'object.isOff should be true');
  equal(object.get('isOn'), false, 'object.isOn should be false');
});

test("dependent keys should be able to be specified as property paths", function() {
  var depObj = ObservableObject.create({
    menu: ObservableObject.create({
      price: 5
    }),

    menuPrice: Ember.computed(function() {
      return this.getPath('menu.price');
    }).property('menu.price').cacheable()
  });

  equal(depObj.get('menuPrice'), 5, "precond - initial value returns 5");

  depObj.setPath('menu.price', 6);

  equal(depObj.get('menuPrice'), 6, "cache is properly invalidated after nested property changes");
});

test("nested dependent keys should propagate after they update", function() {
  window.DepObj = ObservableObject.create({
    restaurant: ObservableObject.create({
      menu: ObservableObject.create({
        price: 5
      })
    }),

    price: Ember.computed(function() {
      return this.getPath('restaurant.menu.price');
    }).property('restaurant.menu.price').volatile()
  });

  var bindObj = ObservableObject.create({
    priceBinding: "DepObj.price"
  });

  Ember.run.sync();

  equal(bindObj.get('price'), 5, "precond - binding propagates");

  DepObj.setPath('restaurant.menu.price', 10);

  Ember.run.sync();

  equal(bindObj.get('price'), 10, "binding propagates after a nested dependent keys updates");

  DepObj.setPath('restaurant.menu', ObservableObject.create({
    price: 15
  }));

  Ember.run.sync();

  equal(bindObj.get('price'), 15, "binding propagates after a middle dependent keys updates");
});

test("cacheable nested dependent keys should clear after their dependencies update", function() {
  window.DepObj = ObservableObject.create({
    restaurant: ObservableObject.create({
      menu: ObservableObject.create({
        price: 5
      })
    }),

    price: Ember.computed(function() {
      return this.getPath('restaurant.menu.price');
    }).property('restaurant.menu.price').cacheable()
  });

  Ember.run.sync();

  equal(DepObj.get('price'), 5, "precond - computed property is correct");

  DepObj.setPath('restaurant.menu.price', 10);

  equal(DepObj.get('price'), 10, "cacheable computed properties are invalidated even if no run loop occurred");
  DepObj.setPath('restaurant.menu.price', 20);

  equal(DepObj.get('price'), 20, "cacheable computed properties are invalidated after a second get before a run loop");

  Ember.run.sync();

  equal(DepObj.get('price'), 20, "precond - computed properties remain correct after a run loop");

  DepObj.setPath('restaurant.menu', ObservableObject.create({
    price: 15
  }));

  equal(DepObj.get('price'), 15, "cacheable computed properties are invalidated after a middle property changes");

  DepObj.setPath('restaurant.menu', ObservableObject.create({
    price: 25
  }));

  equal(DepObj.get('price'), 25, "cacheable computed properties are invalidated after a middle property changes again, before a run loop");
});



// ..........................................................
// OBSERVABLE OBJECTS
//

module("Observable objects & object properties ", {

  setup: function() {
    object = ObservableObject.create({

      normal: 'value',
      abnormal: 'zeroValue',
      numberVal: 24,
      toggleVal: true,
      observedProperty: 'beingWatched',
      testRemove: 'observerToBeRemoved',
      normalArray: Ember.A([1,2,3,4,5]),

      getEach: function() {
        var keys = ['normal','abnormal'];
        var ret = [];
        for(var idx=0; idx<keys.length;idx++) {
          ret[ret.length] = this.getPath(keys[idx]);
        }
        return ret ;
      },

      newObserver:function(){
        this.abnormal = 'changedValueObserved';
      },

      testObserver: Ember.observer(function(){
        this.abnormal = 'removedObserver';
      }, 'normal'),

      testArrayObserver: Ember.observer(function(){
        this.abnormal = 'notifiedObserver';
      }, 'normalArray.[]')

    });
  }

});

test('incrementProperty and decrementProperty',function(){
  var newValue = object.incrementProperty('numberVal');
  equal(25,newValue,'numerical value incremented');
  object.numberVal = 24;
  newValue = object.decrementProperty('numberVal');
  equal(23,newValue,'numerical value decremented');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', 5);
  equal(30,newValue,'numerical value incremented by specified increment');
  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal',5);
  equal(20,newValue,'numerical value decremented by specified increment');
});

test('toggle function, should be boolean',function(){
  equal(object.toggleProperty('toggleVal',true,false),object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal',true,false),object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal',undefined,undefined),object.get('toggleVal'));
});

test('should notify array observer when array changes',function(){
  get(object, 'normalArray').replace(0,0,6);
  equal(object.abnormal, 'notifiedObserver', 'observer should be notified');
});

module("object.addObserver()", {
  setup: function() {

    ObjectC = ObservableObject.create({

      objectE:ObservableObject.create({
        propertyVal:"chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      incrementor: 10,

      action: function() {
        this.normal1= 'newZeroValue';
      },

      observeOnceAction: function() {
        this.incrementor= this.incrementor+1;
      },

      chainedObserver:function(){
        this.normal2 = 'chainedPropertyObserved' ;
      }

    });
  }
});

test("should register an observer for a property", function() {
  ObjectC.addObserver('normal', ObjectC, 'action');
  ObjectC.set('normal','newValue');
  equal(ObjectC.normal1, 'newZeroValue');
});

test("should register an observer for a property - Special case of chained property", function() {
  ObjectC.addObserver('objectE.propertyVal',ObjectC,'chainedObserver');
  ObjectC.objectE.set('propertyVal',"chainedPropertyValue");
  equal('chainedPropertyObserved',ObjectC.normal2);
  ObjectC.normal2 = 'dependentValue';
  ObjectC.set('objectE','');
  equal('chainedPropertyObserved',ObjectC.normal2);
});

module("object.removeObserver()", {
  setup: function() {
    ObjectD = ObservableObject.create({

      objectF:ObservableObject.create({
        propertyVal:"chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      ArrayKeys: ['normal','normal1'],

      addAction: function() {
        this.normal1 = 'newZeroValue';
      },
      removeAction: function() {
        this.normal2 = 'newDependentValue';
      },
      removeChainedObserver:function(){
        this.normal2 = 'chainedPropertyObserved' ;
      },

      observableValue: "hello world",

      observer1: function() {
        // Just an observer
      },
      observer2: function() {
        this.removeObserver('observableValue', null, 'observer1');
        this.removeObserver('observableValue', null, 'observer2');
        this.hasObserverFor('observableValue');   // Tickle 'getMembers()'
        this.removeObserver('observableValue', null, 'observer3');
      },
      observer3: function() {
        // Just an observer
      }
    });

  }
});

test("should unregister an observer for a property", function() {
  ObjectD.addObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal','newValue');
  equal(ObjectD.normal1, 'newZeroValue');

  ObjectD.set('normal1','zeroValue');

  ObjectD.removeObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal','newValue');
  equal(ObjectD.normal1, 'zeroValue');
});


test("should unregister an observer for a property - special case when key has a '.' in it.", function() {
  ObjectD.addObserver('objectF.propertyVal',ObjectD,'removeChainedObserver');
  ObjectD.objectF.set('propertyVal',"chainedPropertyValue");
  ObjectD.removeObserver('objectF.propertyVal',ObjectD,'removeChainedObserver');
  ObjectD.normal2 = 'dependentValue';
  ObjectD.objectF.set('propertyVal',"removedPropertyValue");
  equal('dependentValue',ObjectD.normal2);
  ObjectD.set('objectF','');
  equal('dependentValue',ObjectD.normal2);
});


test("removing an observer inside of an observer shouldn’t cause any problems", function() {
  // The observable system should be protected against clients removing
  // observers in the middle of observer notification.
  var encounteredError = false;
  try {
    ObjectD.addObserver('observableValue', null, 'observer1');
    ObjectD.addObserver('observableValue', null, 'observer2');
    ObjectD.addObserver('observableValue', null, 'observer3');
    Ember.run(function() { ObjectD.set('observableValue', "hi world"); });
  }
  catch(e) {
    encounteredError = true;
  }
  equal(encounteredError, false);
});



module("Bind function ", {

  setup: function() {
    objectA = ObservableObject.create({
      name: "Sproutcore",
      location: "Timbaktu"
    });

    objectB = ObservableObject.create({
      normal: "value",
      computed:function() {
        this.normal = 'newValue';
      }
    }) ;

    Namespace = {
      objectA: objectA,
      objectB: objectB
    } ;
  }
});

test("should bind property with method parameter as undefined", function() {
  // creating binding
  objectA.bind("name", "Namespace.objectB.normal",undefined) ;
  Ember.run.sync() ; // actually sets up up the binding

  // now make a change to see if the binding triggers.
  objectB.set("normal", "changedValue") ;

  // support new-style bindings if available
  Ember.run.sync();
  equal("changedValue", objectA.get("name"), "objectA.name is binded");
});

// ..........................................................
// SPECIAL CASES
//

test("changing chained observer object to null should not raise exception", function() {

  var obj = ObservableObject.create({
    foo: ObservableObject.create({
      bar: ObservableObject.create({ bat: "BAT" })
    })
  });

  var callCount = 0;
  obj.foo.addObserver('bar.bat', obj, function(target, key, value) {
    callCount++;
  });

  Ember.run(function() {
    obj.foo.set('bar', null);
  });

  equal(callCount, 1, 'changing bar should trigger observer');
  expect(1);
});
