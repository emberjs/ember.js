// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// Unit test some standard SC.Array implementations.

// ..........................................................
// BUILT-IN ARRAY
//

sc_require('debug/test_suites/array');

SC.ArraySuite.generate("built-in Array");

// ..........................................................
// DUMMY ARRAY (BASIC FAKE IMPLEMENTATION)
//

// Test that illustrates how to build a SproutCore Array-like
// that correctly participates in KVO.
var DummyArray = SC.Object.extend(SC.Array, {

  // The SC.Array Interface requires a length property
  length: 0,

  content: null,

  // The SC.Array mixin sends all mutations through replace.
  // As a result, we can implement KVO notification in
  // replace.
  replace: function(idx, amt, objects) {
    if (!this.content) { this.content = [] ; }

    var len = objects ? objects.get('length') : 0;

    // SC.Array implementations must call arrayContentWillChange
    // before making mutations. This allows observers to perform
    // operations based on the state of the Array before the
    // change, such as reflecting removals.
    this.arrayContentWillChange(idx, amt, len);
    this.beginPropertyChanges() ;

    // Mutate the underlying Array
    this.content.replace(idx,amt,objects) ;

    // Update the length property
    this.set('length', this.content.length) ;
    this.endPropertyChanges();

    // Both arrayContentDidChange and enumerableContentDidChange will invoke
    // "this.notifyPropertyChange('[]')". To prevent multiple notifications 
    // these calls are made as grouped property changes.
    this.beginPropertyChanges();
    
    // Call the general-purpose enumerableContentDidChange
    // Enumerable method.
    this.enumerableContentDidChange(idx, amt, len - amt) ;
    
    // SC.Array implementations must call arrayContentDidChange
    // after making mutations. This allows observers to perform
    // operations based on the mutation. For instance, a listener
    // might want to reflect additions onto itself.
    this.arrayContentDidChange(idx, amt, len);
    this.endPropertyChanges();
  },

  // SC.Arrays must implement objectAt, which returns an object
  // for a given index.
  objectAt: function(idx) {
    if (!this.content) { this.content = [] ; }
    return this.content[idx] ;
  }

});

SC.ArraySuite.generate("DummyArray", {
  newObject: function(expected) {
    if (!expected || typeof expected === SC.T_NUMBER) {
      expected = this.expected(expected);
    }
    return DummyArray.create({ content: expected, length: expected.length }) ;
  }
});

