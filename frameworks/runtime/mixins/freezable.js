// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Standard Error that should be raised when you try to modify a frozen object.

  @type Error
*/
SC.FROZEN_ERROR = new Error("Cannot modify a frozen object");

/**
  @class

  The SC.Freezable mixin implements some basic methods for marking an object
  as frozen.  Once an object is frozen it should be read only.  No changes
  may be made the internal state of the object.

  Enforcement
  ---

  To fully support freezing in your subclass, you must include this mixin and
  override any method that might alter any property on the object to instead
  raise an exception.  You can check the state of an object by checking the
  isFrozen property.

  Although future versions of JavaScript may support language-level freezing
  object objects, that is not the case today.  Even if an object is freezable,
  it is still technically possible to modify the object, even though it could
  break other parts of your application that do not expect a frozen object to
  change.  It is, therefore, very important that you always respect the
  isFrozen property on all freezable objects.

  Example

  The example below shows a simple object that implement the SC.Freezable
  protocol.

        Contact = SC.Object.extend(SC.Freezable, {

          firstName: null,

          lastName: null,

          // swaps the names
          swapNames: function() {
            if (this.get('isFrozen')) throw SC.FROZEN_ERROR;
            var tmp = this.get('firstName');
            this.set('firstName', this.get('lastName'));
            this.set('lastName', tmp);
            return this;
          }

        });

        c = Context.create({ firstName: "John", lastName: "Doe" });
        c.swapNames();  => returns c
        c.freeze();
        c.swapNames();  => EXCEPTION

  Copying
  ---

  Usually the SC.Freezable protocol is implemented in cooperation with the
  SC.Copyable protocol, which defines a frozenCopy() method that will return
  a frozen object, if the object implements this method as well.

*/
SC.Freezable = /** @scope SC.Freezable.prototype */ {

  /**
    Walk like a duck.

    @type Boolean
  */
  isFreezable: YES,

  /**
    Set to YES when the object is frozen.  Use this property to detect whether
    your object is frozen or not.

    @type Boolean
  */
  isFrozen: NO,

  /**
    Freezes the object.  Once this method has been called the object should
    no longer allow any properties to be edited.

    @returns {Object} receiver
  */
  freeze: function() {
    // NOTE: Once someone actually implements Object.freeze() in the browser,
    // add a call to that here also.

    if (this.set) this.set('isFrozen', YES);
    else this.isFrozen = YES;
    return this;
  }

};


// Add to Array
SC.mixin(Array.prototype, SC.Freezable);
