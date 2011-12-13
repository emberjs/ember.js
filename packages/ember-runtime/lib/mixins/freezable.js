// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================




  
var get = Ember.get, set = Ember.set;

/**
  @namespace

  The Ember.Freezable mixin implements some basic methods for marking an object
  as frozen. Once an object is frozen it should be read only. No changes
  may be made the internal state of the object.

  ## Enforcement

  To fully support freezing in your subclass, you must include this mixin and
  override any method that might alter any property on the object to instead
  raise an exception. You can check the state of an object by checking the
  isFrozen property.

  Although future versions of JavaScript may support language-level freezing
  object objects, that is not the case today. Even if an object is freezable,
  it is still technically possible to modify the object, even though it could
  break other parts of your application that do not expect a frozen object to
  change. It is, therefore, very important that you always respect the
  isFrozen property on all freezable objects.

  ## Example Usage

  The example below shows a simple object that implement the Ember.Freezable
  protocol.

        Contact = Ember.Object.extend(Ember.Freezable, {

          firstName: null,

          lastName: null,

          // swaps the names
          swapNames: function() {
            if (this.get('isFrozen')) throw Ember.FROZEN_ERROR;
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

  ## Copying

  Usually the Ember.Freezable protocol is implemented in cooperation with the
  Ember.Copyable protocol, which defines a frozenCopy() method that will return
  a frozen object, if the object implements this method as well.

  @since Ember 0.9
*/
Ember.Freezable = Ember.Mixin.create({

  /**
    Set to YES when the object is frozen.  Use this property to detect whether
    your object is frozen or not.

    @property {Boolean}
  */
  isFrozen: false,

  /**
    Freezes the object.  Once this method has been called the object should
    no longer allow any properties to be edited.

    @returns {Object} reciever
  */
  freeze: function() {
    if (get(this, 'isFrozen')) return this;
    set(this, 'isFrozen', true);
    return this;
  }

});

Ember.FROZEN_ERROR = "Frozen object cannot be modified.";



