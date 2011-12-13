// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/suite');

Ember.CopyableTests = Ember.Suite.extend({

  /**
    Must be able to create a new object for testing.
    
    @returns {Object} object
  */
  newObject: Ember.required(Function),
  
  /**
    Compares the two passed in objects.  Returns true if the two objects 
    are logically equivalent.
    
    @param {Object} a
      First object
      
    @param {Object} b
      Second object
      
    @returns {Boolean}
  */
  isEqual: Ember.required(Function),
  
  /**
    Set this to true if you expect the objects you test to be freezable.
    The suite will verify that your objects actually match this.  (i.e. if
    you say you can't test freezable it will verify that your objects really
    aren't freezable.)
    
    @property {Boolean}
  */
  shouldBeFreezable: false
  
});
