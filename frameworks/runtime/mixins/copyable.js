// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  Implements some standard methods for copying an object.  Add this mixin to
  any object you create that can create a copy of itself.  This mixin is
  added automatically to the built-in array.

  You should generally implement the copy() method to return a copy of the
  receiver.

  Note that frozenCopy() will only work if you also implement SC.Freezable.

  @since SproutCore 1.0
*/
SC.Copyable = /** @scope SC.Copyable.prototype */{

  /**
    Walk like a duck.  Indicates that the object can be copied.

    @type Boolean
  */
  isCopyable: YES,

  /**
    Override to return a copy of the receiver.  Default implementation raises
    an exception.

    @param deep {Boolean} if true, a deep copy of the object should be made
    @returns {Object} copy of receiver
  */
  copy: function(deep) {
    var className = SC._object_className(this.constructor);
    throw new Error("%@.copy() is not implemented".fmt(className));
  },

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
    var isFrozen = this.get ? this.get('isFrozen') : this.isFrozen;
    if (isFrozen === YES) return this;
    else if (isFrozen === undefined) throw new Error("%@ does not support freezing".fmt(this));
    else return this.copy().freeze();
  }
};

// Make Array copyable
SC.mixin(Array.prototype, SC.Copyable);
/**
  Override to return a copy of the receiver.  Default implementation raises
  an exception.

  @param deep {Boolean} if true, a deep copy of the object should be made
  @returns {Object} copy of receiver
*/
Array.prototype.copy = function(deep) {
	var ret = this.slice(), idx;
	if (deep) {
      idx = ret.length;
	  while (idx--) ret[idx] = SC.copy(ret[idx], true);
	}
	return ret;
};
