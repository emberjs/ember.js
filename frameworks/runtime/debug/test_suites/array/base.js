// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok equals same SC */

/**
  Adds a new module of unit tests to verify that the passed object implements
  the SC.Array interface.  To generate, call the ArrayTests array with a 
  test descriptor.  Any properties you pass will be applied to the ArrayTests
  descendant created by the create method.
  
  You should pass at least a newObject() method, which should return a new 
  instance of the object you want to have tested.  You can also implement the
  destroyObject() method, which should destroy a passed object.
  
      SC.ArrayTests.generate("Array", {
        newObject:  function() { return []; }
      });
  
  newObject must accept an optional array indicating the number of items
  that should be in the array.  You should initialize the the item with 
  that many items.  The actual objects you add are up to you.
  
  Unit tests themselves can be added by calling the define() method.  The
  function you pass will be invoked whenever the ArrayTests are generated. The
  parameter passed will be the instance of ArrayTests you should work with.
  
      SC.ArrayTests.define(function(T) {
        T.module("length");
      
        test("verify length", function() {
          var ary = T.newObject();
          equals(ary.get('length'), 0, 'should have 0 initial length');
        });
      }
*/

SC.TestSuite = /** @scope SC.TestSuite.prototype */ {

  /**
    Call this method to define a new test suite.  Pass one or more hashes of
    properties you want added to the new suite.  
    
    @param {Hash} attrs one or more attribute hashes
    @returns {SC.TestSuite} subclass of suite.
  */
  create: function(desc, attrs) {
    var len = arguments.length,
        ret = SC.beget(this),
        idx;
        
    // copy any attributes
    for(idx=1;idx<len;idx++) SC.mixin(ret, arguments[idx]);
    
    if (desc) ret.basedesc = desc;
    
    // clone so that new definitions will be kept separate
    ret.definitions = ret.definitions.slice();
    
    return ret ;
  },

  /**
    Generate a new test suite instance, adding the suite definitions to the 
    current test plan.  Pass a description of the test suite as well as one or
    more attribute hashes to apply to the test plan.
    
    The description you add will be prefixed in front of the 'desc' property
    on the test plan itself.
    
    @param {String} desc suite description
    @param {Hash} attrs one or more attribute hashes
    @returns {SC.TestSuite} suite instance
  */
  generate: function(desc, attrs) {
    var len = arguments.length,
        ret = SC.beget(this),
        idx, defs;
        
    // apply attributes - skip first argument b/c it is a string
    for(idx=1;idx<len;idx++) SC.mixin(ret, arguments[idx]);    
    ret.subdesc = desc ;
    
    // invoke definitions
    defs = ret.definitions ;
    len = defs.length;
    for(idx=0;idx<len;idx++) defs[idx].call(ret, ret);
    
    return ret ;
  },
  
  /**
    Adds the passed function to the array of definitions that will be invoked
    when the suite is generated.
    
    The passed function should expect to have the TestSuite instance passed
    as the first and only parameter.  The function should actually define 
    a module and tests, which will be added to the test suite.
    
    @param {Function} func definition function
    @returns {SC.TestSuite} receiver
  */
  define: function(func) {
    this.definitions.push(func);
    return this ;
  },
  
  /** 
    Definition functions.  These are invoked in order when  you generate a 
    suite to add unit tests and modules to the test plan.
  */
  definitions: [],
  
  /**
    Generates a module description by merging the based description, sub 
    description and the passed description.  This is usually used inside of 
    a suite definition function.
    
    @param {String} str detailed description for this module
    @returns {String} generated description
  */
  desc: function(str) {
    return this.basedesc.fmt(this.subdesc, str);
  },
  
  /**
    The base description string.  This should accept two formatting options,
    a sub description and a detailed description.  This is the description
    set when you call extend()
  */
  basedesc: "%@ > %@",
  
  /**
    Default setup method for use with modules.  This method will call the
    newObject() method and set its return value on the object property of 
    the receiver.
  */
  setup: function() {
    this.object = this.newObject();
  },
  
  /**
    Default teardown method for use with modules.  This method will call the
    destroyObject() method, passing the current object property on the 
    receiver.  It will also clear the object property.
  */
  teardown: function() {
    if (this.object) this.destroyObject(this.object);
    this.object = null;
  },
  
  /**
    Default method to create a new object instance.  You will probably want
    to override this method when you generate() a suite with a function that
    can generate the type of object you want to test.
    
    @returns {Object} generated object
  */
  newObject: function() { return null; },
  
  /**
    Default method to destroy a generated object instance after a test has 
    completed.  If you override newObject() you can also override this method
    to cleanup the object you just created.
    
    Default method does nothing.
  */
  destroyObject: function(obj) { 
    // do nothing.
  },
  
  /**
    Generates a default module with the description you provide.  This is 
    a convenience function for use inside of a definition function.  You could
    do the same thing by calling:
    
        var T = this ;
        module(T.desc(description), {
          setup: function() { T.setup(); },
          teardown: function() { T.teardown(); }
        }
    
    @param {String} desc detailed description
    @returns {SC.TestSuite} receiver
  */
  module: function(desc) {
    var T = this ;
    module(T.desc(desc), {
      setup: function() { T.setup(); },
      teardown: function() { T.teardown(); }
    });
  }
  
};

SC.ArraySuite = SC.TestSuite.create("Verify SC.Array compliance: %@#%@", {
  
  /** 
    Override to return a set of simple values such as numbers or strings.
    Return null if your set does not support primitives.
  */
  simple: function(amt) {
    var ret = [];
    if (amt === undefined) amt = 0;
    while(--amt >= 0) ret[amt] = amt ;
    return ret ;
  },

  /**  Override with the name of the key we should get/set on hashes */
  hashValueKey: 'foo',
  
  /**
    Override to return hashes of values if supported.  Or return null.
  */
  hashes: function(amt) {
    var ret = [];  
    if (amt === undefined) amt = 0;
    while(--amt >= 0) {
      ret[amt] = {};
      ret[amt][this.hashValueKey] = amt ;
    }
    return ret ;
  },
  
  /** Override with the name of the key we should get/set on objects */
  objectValueKey: "foo",
  
  /**
    Override to return observable objects if supported.  Or return null.
  */
  objects: function(amt) {
    var ret = [];  
    if (amt === undefined) amt = 0;
    while(--amt >= 0) {
      var o = {};
      o[this.objectValueKey] = amt ;
      ret[amt] = SC.Object.create(o);
    }
    return ret ;
  },

  /**
    Returns an array of content items in your preferred format.  This will
    be used whenever the test does not care about the specific object content.
  */
  expected: function(amt) {
    return this.simple(amt);
  },
  
  /**
    Example of how to implement newObject
  */
  newObject: function(expected) {
    if (!expected || SC.typeOf(expected) === SC.T_NUMBER) {
      expected = this.expected(expected);
    }
    
    return expected.slice();
  },
  
  
  /**
    Creates an observer object for use when tracking object modifications.
  */
  observer: function(obj) {
    return SC.Object.create({

      // ..........................................................
      // NORMAL OBSERVER TESTING
      // 
      
      observer: function(target, key, value) {
        this.notified[key] = true ;
        this.notifiedValue[key] = value ;
      },

      resetObservers: function() {
        this.notified = {} ;
        this.notifiedValue = {} ;
      },

      observe: function() {
        var keys = SC.$A(arguments) ;
        var loc = keys.length ;
        while(--loc >= 0) {
          obj.addObserver(keys[loc], this, this.observer) ;
        }
        return this ;
      },

      didNotify: function(key) {
        return !!this.notified[key] ;
      },

      init: function() {
        sc_super() ;
        this.resetObservers() ;
      },
      
      // ..........................................................
      // RANGE OBSERVER TESTING
      // 
      
      callCount: 0,

      // call afterward to verify
      expectRangeChange: function(source, object, key, indexes, context) {
        equals(this.callCount, 1, 'expects one callback');
        
        if (source !== undefined && source !== NO) {
          ok(this.source, source, 'source should equal array');
        }
        
        if (object !== undefined && object !== NO) {
          equals(this.object, object, 'object');
        }
        
        if (key !== undefined && key !== NO) {
          equals(this.key, key, 'key');
        }
        
        if (indexes !== undefined && indexes !== NO) {
          if (indexes.isIndexSet) {
            ok(this.indexes && this.indexes.isIndexSet, 'indexes should be index set');
            ok(indexes.isEqual(this.indexes), 'indexes should match %@ (actual: %@)'.fmt(indexes, this.indexes));
          } else equals(this.indexes, indexes, 'indexes');
        }
          
        if (context !== undefined && context !== NO) {
          equals(this.context, context, 'context should match');
        }
        
      },
      
      rangeDidChange: function(source, object, key, indexes, context) {
        this.callCount++ ;
        this.source = source ;
        this.object = object ;
        this.key    = key ;
        
        // clone this because the index set may be reused after this callback
        // runs.
        this.indexes = (indexes && indexes.isIndexSet) ? indexes.clone() : indexes;
        this.context = context ;          
      }
      
    });  
  },
  
  /**
    Verifies that the passed object matches the passed array.
  */
  validateAfter: function(obj, after, observer, lengthDidChange, enumerableDidChange) {
    var loc = after.length;
    equals(obj.get('length'), loc, 'length should update (%@)'.fmt(obj)) ;
    while(--loc >= 0) {
      equals(obj.objectAt(loc), after[loc], 'objectAt(%@)'.fmt(loc)) ;
    }

    // note: we only test that the length notification happens when we expect
    // it.  If we don't expect a length notification, it is OK for a class
    // to trigger a change anyway so we don't check for this case.
    if (enumerableDidChange !== NO) {
      equals(observer.didNotify("[]"), YES, 'should notify []') ;
    }
    
    if (lengthDidChange) {
      equals(observer.didNotify('length'), YES, 'should notify length change');
    }
  }
  
});

// Simple verification of length
SC.ArraySuite.define(function(T) {
  T.module("length");
  
  test("should return 0 on empty array", function() {
    equals(T.object.get('length'), 0, 'should have empty length');
  });
  
  test("should return array length", function() {
    var obj = T.newObject(3);
    equals(obj.get('length'), 3, 'should return length');
  });
  
});
