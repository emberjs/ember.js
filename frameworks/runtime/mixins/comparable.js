// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  Implements some standard methods for comparing objects. Add this mixin to
  any class you create that can compare its instances.

  You should implement the compare() method.

  @since SproutCore 1.0
*/
SC.Comparable = {

  /**
    walk like a duck. Indicates that the object can be compared.

    @type Boolean
  */
  isComparable: YES,

  /**
    Override to return the result of the comparison of the two parameters. The
    compare method should return
    
    <pre>
      -1 if a < b
       0 if a == b
       1 if a > b
    </pre>


    Default implementation raises an exception.

    @param a {Object} the first object to compare
    @param b {Object} the second object to compare
    @returns {Integer} the result of the comparison
  */
  compare: function(a, b) {
    throw new Error("%@.compare() is not implemented".fmt(this.toString()));
  }

};
