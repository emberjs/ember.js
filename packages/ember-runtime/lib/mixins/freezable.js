/**
@module ember
@submodule ember-runtime
*/

import { deprecate } from 'ember-metal/debug';
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';

/**
  The `Ember.Freezable` mixin implements some basic methods for marking an
  object as frozen. Once an object is frozen it should be read only. No changes
  may be made the internal state of the object.

  ## Enforcement

  To fully support freezing in your subclass, you must include this mixin and
  override any method that might alter any property on the object to instead
  raise an exception. You can check the state of an object by checking the
  `isFrozen` property.

  Although future versions of JavaScript may support language-level freezing
  object objects, that is not the case today. Even if an object is freezable,
  it is still technically possible to modify the object, even though it could
  break other parts of your application that do not expect a frozen object to
  change. It is, therefore, very important that you always respect the
  `isFrozen` property on all freezable objects.

  ## Example Usage

  The example below shows a simple object that implement the `Ember.Freezable`
  protocol.

  ```javascript
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

  c = Contact.create({ firstName: "John", lastName: "Doe" });
  c.swapNames();  // returns c
  c.freeze();
  c.swapNames();  // EXCEPTION
  ```

  ## Copying

  Usually the `Ember.Freezable` protocol is implemented in cooperation with the
  `Ember.Copyable` protocol, which defines a `frozenCopy()` method that will
  return a frozen object, if the object implements this method as well.

  @class Freezable
  @namespace Ember
  @since Ember 0.9
  @deprecated Use `Object.freeze` instead.
  @private
*/
export var Freezable = Mixin.create({

  init() {
    deprecate(
      '`Ember.Freezable` is deprecated, use `Object.freeze` instead.',
      false,
      { id: 'ember-runtime.freezable-init', until: '3.0.0' }
    );
    this._super.apply(this, arguments);
  },

  /**
    Set to `true` when the object is frozen. Use this property to detect
    whether your object is frozen or not.

    @property isFrozen
    @type Boolean
    @private
  */
  isFrozen: false,

  /**
    Freezes the object. Once this method has been called the object should
    no longer allow any properties to be edited.

    @method freeze
    @return {Object} receiver
    @private
  */
  freeze() {
    if (get(this, 'isFrozen')) {
      return this;
    }

    set(this, 'isFrozen', true);
    return this;
  }

});

export var FROZEN_ERROR = 'Frozen object cannot be modified.';
