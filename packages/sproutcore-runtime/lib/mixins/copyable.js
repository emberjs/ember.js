// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


require('sproutcore-runtime/system/string');


  
var get = SC.get, set = SC.set;

/**
  @namespace

  Implements some standard methods for copying an object.  Add this mixin to
  any object you create that can create a copy of itself.  This mixin is
  added automatically to the built-in array.

  You should generally implement the copy() method to return a copy of the
  receiver.

  Note that frozenCopy() will only work if you also implement SC.Freezable.

  @since SproutCore 1.0
*/
SC.Copyable = SC.Mixin.create({

  /**
    Override to return a copy of the receiver.  Default implementation raises
    an exception.

    @param deep {Boolean} if true, a deep copy of the object should be made
    @returns {Object} copy of receiver
  */
  copy: SC.required(Function),

  /**
    If the object implements SC.Freezable, then this will return a new copy
    if the object is not frozen and the receiver if the object is frozen.

    Raises an exception if you try to call this method on a object that does
    not support freezing.

    You should use this method whenever you want a copy of a freezable object
    since a freezable object can simply return itself without actually
    consuming more memory.

    @returns {Object} copy of receiver or receiver
  */
  frozenCopy: function() {
    if (SC.Freezable && SC.Freezable.detect(this)) {
      return get(this, 'isFrozen') ? this : this.copy().freeze();
    } else {
      throw new Error(SC.String.fmt("%@ does not support freezing",this));
    }
  }
});



