// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals CoreTest module */

/** @class

  A test Suite defines a group of reusable unit tests that can be added to a 
  test plan at any time by calling the generate() method.  Suites are most
  useful for defining groups of tests that validate compliance with a mixin.
  You can then generate customized versions of the test suite for different
  types of objects to ensure that both the mixin and the object implementing
  the mixin use the API properly.
  
  ## Using a Suite
  
  To use a Suite, call the generate() method on the suite inside on of your
  unit test files.  This will generate new modules and tests in the suite
  and add them to your test plan.
  
  Usually you will need to customize the suite to apply to a specific object.
  You can supply these customizations through an attribute hash passed to the
  generate() method.  See the documentation on the specific test suite for
  information on the kind of customizations you may need to provide.
  
  ### Example
  
      // generates the SC.ArrayTestSuite tests for a built-in array.
      SC.ArrayTests.generate('Array', {
        newObject: function() { return []; }
      });
  
  ## Defining a Suite
  
  To define a test suite, simply call the extend() method, passing any 
  attributes you want to define on the suite along with this method.  You can
  then add functions that will define the test suite with the define() method.
  
  Functions you pass to define will have an instance of the test suite passed
  as their first parameter when invoked.

  ### Example 
  
      SC.ArrayTests = CoreTest.Suite.create("Verify SC.Array compliance", {
      
        // override to generate a new object that implements SC.Array
        newObject: function() { return null; }
      });
    
      SC.ArrayTests.define(function(T) {
        T.module("length tests");
      
        test("new length", function() {
          equals(T.object.get('length'), 0, 'array length');
        });
      
      });
  
  @since SproutCore 1.0
  
*/
CoreTest.Suite = /** @scope CoreTest.Suite.prototype */ {

  /**
    Call this method to define a new test suite.  Pass one or more hashes of
    properties you want added to the new suite.  
    
    @param {Hash} attrs one or more attribute hashes
    @returns {CoreTest.Suite} subclass of suite.
  */
  create: function(desc, attrs) {
    var len = arguments.length,
        ret = CoreTest.beget(this),
        idx;
        
    // copy any attributes
    for(idx=1;idx<len;idx++) CoreTest.mixin(ret, arguments[idx]);
    
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
    @returns {CoreTest.Suite} suite instance
  */
  generate: function(desc, attrs) {
    var len = arguments.length,
        ret = CoreTest.beget(this),
        idx, defs;
        
    // apply attributes - skip first argument b/c it is a string
    for(idx=1;idx<len;idx++) CoreTest.mixin(ret, arguments[idx]);    
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
    @returns {CoreTest.Suite} receiver
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
    @returns {CoreTest.Suite} receiver
  */
  module: function(desc) {
    var T = this ;
    module(T.desc(desc), {
      setup: function() { T.setup(); },
      teardown: function() { T.teardown(); }
    });
  }
  
};
