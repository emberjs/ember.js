// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals CoreTest */

// these compiler directives are normally defined in runtime's core.  But
// since the testing framework needs to be totally independent, we redefine
// them here also.
var require = require || function sc_require() {};
var sc_require = sc_require || require;
var sc_resource = sc_resource || function sc_resource() {};

// map used to exist, this is here for backwards compatibility
var Q$ = jQuery;

/** @namespace

  CoreTest is the unit testing library for SproutCore.  It includes a test 
  runner based on QUnit with some useful extensions for testing SproutCore-
  based applications.
  
  You can use CoreTest just like you would use QUnit in your tests directory.
*/
CoreTest = {
  
  /** 
    Empty function.  Useful for some operations. 
  */
  K: function() { return this; },

  /**
    Copied from SproutCore Runtime Core.  Included here to avoid dependencies.

    @param obj {Object} the object to beget
    @returns {Object} the new object.
  */
  beget: function(obj) {
    if (!obj) return null ;
    var K = CoreTest.K; K.prototype = obj ;
    var ret = new K();
    K.prototype = null ; // avoid leaks
    return ret ;
  },
  
  /**
    Copied from SproutCore Runtime Core.  Included here to avoid dependencies.

    @param target {Object} the target object to extend
    @param properties {Object} one or more objects with properties to copy.
    @returns {Object} the target object.
    @static
  */
  mixin: function() {
    // copy reference to target object
    var target = arguments[0] || {};
    var idx = 1;
    var length = arguments.length ;
    var options ;

    // Handle case where we have only one item...extend CoreTest
    if (length === 1) {
      target = this || {};
      idx=0;
    }

    for ( ; idx < length; idx++ ) {
      if (!(options = arguments[idx])) continue ;
      for(var key in options) {
        if (!options.hasOwnProperty(key)) continue ;
        var src = target[key];
        var copy = options[key] ;
        if (target===copy) continue ; // prevent never-ending loop
        if (copy !== undefined) target[key] = copy ;
      }
    }

    return target;
  },
  
  
  /** Borrowed from SproutCore Runtime Core */
  fmt: function(str) {
    // first, replace any ORDERED replacements.
    var args = arguments;
    var idx  = 1; // the current index for non-numerical replacements
    return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
      argIndex = (argIndex) ? parseInt(argIndex,0) : idx++ ;
      s =args[argIndex];
      return ((s===null) ? '(null)' : (s===undefined) ? '' : s).toString(); 
    }) ;
  },
  
  /**
    Returns a stub function that records any passed arguments and a call
    count.  You can pass no parameters, a single function or a hash.  
    
    If you pass no parameters, then this simply returns a function that does 
    nothing but record being called.  
    
    If you pass a function, then the function will execute when the method is
    called, allowing you to stub in some fake behavior.
    
    If you pass a hash, you can supply any properties you want attached to the
    stub function.  The two most useful are "action", which is the function 
    that will execute when the stub runs (as if you just passed a function), 
    and "expect" which should evaluate the stub results.
    
    In your unit test you can verify the stub by calling stub.expect(X), 
    where X is the number of times you expect the function to be called.  If
    you implement your own test function, you can actually pass whatever you
    want.
    
    Calling stub.reset() will reset the record on the stub for further 
    testing.

    @param {String} name the name of the stub to use for logging
    @param {Function|Hash} func the function or hash
    @returns {Function} stub function
  */
  stub: function(name, func) {  

    // normalize param
    var attrs = {};
    if (typeof func === "function") {
      attrs.action = func;
    } else if (typeof func === "object") {
      attrs = func ;
    }

    // create basic stub
    var ret = function() {
      ret.callCount++;
      
      // get arguments into independent array and save in history
      var args = [], loc = arguments.length;
      while(--loc >= 0) args[loc] = arguments[loc];
      args.unshift(this); // save context
      ret.history.push(args);
      
      return ret.action.apply(this, arguments);
    };
    ret.callCount = 0 ;
    ret.history = [];
    ret.stubName = name ;

    // copy attrs
    var key;
    for(key in attrs) {
      if (!attrs.hasOwnProperty(key)) continue ;
      ret[key] = attrs[key];
    }

    // add on defaults
    if (!ret.reset) {
      ret.reset = function() {
        this.callCount = 0;
        this.history = [];
      };
    }
    
    if (!ret.action) {
      ret.action = function() { return this; };
    }
    
    if (!ret.expect) {
      ret.expect = function(callCount) {
        if (callCount === YES) {
          ok(this.callCount > 0, CoreTest.fmt("%@ should be called at least once", this.stubName));
        } else {
          if (callCount === NO) callCount = 0;
          equals(this.callCount, callCount, CoreTest.fmt("%@ should be called X times", this.stubName));
        }
      };
    }
    
    return ret ;
  },

  /** Test is OK */
  OK: 'passed',

  /** Test failed */
  FAIL: 'failed',

  /** Test raised exception */
  ERROR: 'errors',

  /** Test raised warning */
  WARN: 'warnings',

  showUI : false,

  spyOn: function(object, method) {
    if(!object) throw new Error('ERROR: Attempted to spy upon an invalid object');
    if(!object[method]) throw new Error('ERROR: The requested method does not exist on the given object');

    var spy = new CoreTest.Spy;
    object[method] = function() { spy.call(CoreTest.argumentsArray(arguments)) };
    return spy;
  },

  stubMethod: function(object, method) {
    if(!object) throw new Error('ERROR: Attempted to spy upon an invalid object');
    if(!object[method]) throw new Error('ERROR: The requested method does not exist on the given object');

    var stub = new CoreTest.Stub;
    object[method] = function() { return stub.call() };
    return stub;
  }
};

CoreTest.Spy = function() {
  this.wasCalled = false;
};

CoreTest.Spy.prototype.call = function(args) {
  this.wasCalledWithArguments = args;
  this.wasCalled = true;
};

CoreTest.Spy.prototype.wasCalledWith = function() {
  return CoreTest._isIdenticalArray(this.wasCalledWithArguments,CoreTest.argumentsArray(arguments));
};

CoreTest.Stub = function() {
};

CoreTest.Stub.prototype.andReturn = function(value) {
  this.stubbedValue = value;
};

CoreTest.Stub.prototype.call = function() {
  if(this.stubbedValue === undefined) throw new Error('ERROR: You never specified what value the stub should return');
  return this.stubbedValue;
};

CoreTest.argumentsArray = function(args) {
  var arrayOfArgs = [];
  for (var i = 0; i < args.length; i++) arrayOfArgs.push(args[i]);
  return arrayOfArgs;
};

CoreTest._isIdenticalArray = function(array1, array2) {
  if(array1.length !== array2.length) return false;
  for(var i = 0; i < array1.length; i++)
    if(array1[i] !== array2[i]) return false;
  return true;
};
