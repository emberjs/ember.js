/**
@module ember
@submodule ember-runtime
*/

import { assert } from 'ember-metal/debug';
import {
  get,
  getWithDefault
} from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import getProperties from 'ember-metal/get_properties';
import setProperties from 'ember-metal/set_properties';
import { Mixin } from 'ember-metal/mixin';
import { hasListeners } from 'ember-metal/events';
import {
  beginPropertyChanges,
  propertyWillChange,
  propertyDidChange,
  endPropertyChanges
} from 'ember-metal/property_events';
import {
  addObserver,
  removeObserver,
  observersFor
} from 'ember-metal/observer';
import { cacheFor } from 'ember-metal/computed';
import isNone from 'ember-metal/is_none';

/**
  ## Overview

  This mixin provides properties and property observing functionality, core
  features of the Ember object model.

  Properties and observers allow one object to observe changes to a
  property on another object. This is one of the fundamental ways that
  models, controllers and views communicate with each other in an Ember
  application.

  Any object that has this mixin applied can be used in observer
  operations. That includes `Ember.Object` and most objects you will
  interact with as you write your Ember application.

  Note that you will not generally apply this mixin to classes yourself,
  but you will use the features provided by this module frequently, so it
  is important to understand how to use it.

  ## Using `get()` and `set()`

  Because of Ember's support for bindings and observers, you will always
  access properties using the get method, and set properties using the
  set method. This allows the observing objects to be notified and
  computed properties to be handled properly.

  More documentation about `get` and `set` are below.

  ## Observing Property Changes

  You typically observe property changes simply by adding the `observes`
  call to the end of your method declarations in classes that you write.
  For example:

  ```javascript
  Ember.Object.extend({
    valueObserver: Ember.observer('value', function(sender, key, value, rev) {
      // Executes whenever the "value" property changes
      // See the addObserver method for more information about the callback arguments
    })
  });
  ```

  Although this is the most common way to add an observer, this capability
  is actually built into the `Ember.Object` class on top of two methods
  defined in this mixin: `addObserver` and `removeObserver`. You can use
  these two methods to add and remove observers yourself if you need to
  do so at runtime.

  To add an observer for a property, call:

  ```javascript
  object.addObserver('propertyKey', targetObject, targetAction)
  ```

  This will call the `targetAction` method on the `targetObject` whenever
  the value of the `propertyKey` changes.

  Note that if `propertyKey` is a computed property, the observer will be
  called when any of the property dependencies are changed, even if the
  resulting value of the computed property is unchanged. This is necessary
  because computed properties are not computed until `get` is called.

  @class Observable
  @namespace Ember
  @public
*/
export default Mixin.create({

  /**
    Retrieves the value of a property from the object.

    This method is usually similar to using `object[keyName]` or `object.keyName`,
    however it supports both computed properties and the unknownProperty
    handler.

    Because `get` unifies the syntax for accessing all these kinds
    of properties, it can make many refactorings easier, such as replacing a
    simple property with a computed property, or vice versa.

    ### Computed Properties

    Computed properties are methods defined with the `property` modifier
    declared at the end, such as:

    ```javascript
    fullName: function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName')
    ```

    When you call `get` on a computed property, the function will be
    called and the return value will be returned instead of the function
    itself.

    ### Unknown Properties

    Likewise, if you try to call `get` on a property whose value is
    `undefined`, the `unknownProperty()` method will be called on the object.
    If this method returns any value other than `undefined`, it will be returned
    instead. This allows you to implement "virtual" properties that are
    not defined upfront.

    @method get
    @param {String} keyName The property to retrieve
    @return {Object} The property value or undefined.
    @public
  */
  get(keyName) {
    return get(this, keyName);
  },

  /**
    To get the values of multiple properties at once, call `getProperties`
    with a list of strings or an array:

    ```javascript
    record.getProperties('firstName', 'lastName', 'zipCode');
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    is equivalent to:

    ```javascript
    record.getProperties(['firstName', 'lastName', 'zipCode']);
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    @method getProperties
    @param {String...|Array} list of keys to get
    @return {Object}
    @public
  */
  getProperties(...args) {
    return getProperties.apply(null, [this].concat(args));
  },

  /**
    Sets the provided key or path to the value.

    This method is generally very similar to calling `object[key] = value` or
    `object.key = value`, except that it provides support for computed
    properties, the `setUnknownProperty()` method and property observers.

    ### Computed Properties

    If you try to set a value on a key that has a computed property handler
    defined (see the `get()` method for an example), then `set()` will call
    that method, passing both the value and key instead of simply changing
    the value itself. This is useful for those times when you need to
    implement a property that is composed of one or more member
    properties.

    ### Unknown Properties

    If you try to set a value on a key that is undefined in the target
    object, then the `setUnknownProperty()` handler will be called instead. This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the object. If `setUnknownProperty()` returns
    undefined, then `set()` will simply set the value on the object.

    ### Property Observers

    In addition to changing the property, `set()` will also register a property
    change with the object. Unless you have placed this call inside of a
    `beginPropertyChanges()` and `endPropertyChanges(),` any "local" observers
    (i.e. observer methods declared on the same object), will be called
    immediately. Any "remote" observers (i.e. observer methods declared on
    another object) will be placed in a queue and called at a later time in a
    coalesced manner.

    @method set
    @param {String} keyName The property to set
    @param {Object} value The value to set or `null`.
    @return {Object} The passed value
    @public
  */
  set(keyName, value) {
    return set(this, keyName, value);
  },


  /**
    Sets a list of properties at once. These properties are set inside
    a single `beginPropertyChanges` and `endPropertyChanges` batch, so
    observers will be buffered.

    ```javascript
    record.setProperties({ firstName: 'Charles', lastName: 'Jolley' });
    ```

    @method setProperties
    @param {Object} hash the hash of keys and values to set
    @return {Object} The passed in hash
    @public
  */
  setProperties(hash) {
    return setProperties(this, hash);
  },

  /**
    Begins a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to begin deferring change
    notifications. When you are done making changes, call
    `endPropertyChanges()` to deliver the deferred change notifications and end
    deferring.

    @method beginPropertyChanges
    @return {Ember.Observable}
    @private
  */
  beginPropertyChanges() {
    beginPropertyChanges();
    return this;
  },

  /**
    Ends a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call
    `beginPropertyChanges()` at the beginning of the changes to defer change
    notifications. When you are done making changes, call this method to
    deliver the deferred change notifications and end deferring.

    @method endPropertyChanges
    @return {Ember.Observable}
    @private
  */
  endPropertyChanges() {
    endPropertyChanges();
    return this;
  },

  /**
    Notify the observer system that a property is about to change.

    Sometimes you need to change a value directly or indirectly without
    actually calling `get()` or `set()` on it. In this case, you can use this
    method and `propertyDidChange()` instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call `propertyWillChange` and `propertyDidChange`
    as a pair. If you do not, it may get the property change groups out of
    order and cause notifications to be delivered more often than you would
    like.

    @method propertyWillChange
    @param {String} keyName The property key that is about to change.
    @return {Ember.Observable}
    @private
  */
  propertyWillChange(keyName) {
    propertyWillChange(this, keyName);
    return this;
  },

  /**
    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without
    actually calling `get()` or `set()` on it. In this case, you can use this
    method and `propertyWillChange()` instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call `propertyWillChange` and `propertyDidChange`
    as a pair. If you do not, it may get the property change groups out of
    order and cause notifications to be delivered more often than you would
    like.

    @method propertyDidChange
    @param {String} keyName The property key that has just changed.
    @return {Ember.Observable}
    @private
  */
  propertyDidChange(keyName) {
    propertyDidChange(this, keyName);
    return this;
  },

  /**
    Convenience method to call `propertyWillChange` and `propertyDidChange` in
    succession.

    @method notifyPropertyChange
    @param {String} keyName The property key to be notified about.
    @return {Ember.Observable}
    @public
  */
  notifyPropertyChange(keyName) {
    this.propertyWillChange(keyName);
    this.propertyDidChange(keyName);
    return this;
  },

  /**
    Adds an observer on a property.

    This is the core method used to register an observer for a property.

    Once you call this method, any time the key's value is set, your observer
    will be notified. Note that the observers are triggered any time the
    value is set, regardless of whether it has actually changed. Your
    observer should be prepared to handle that.

    You can also pass an optional context parameter to this method. The
    context will be passed to your observer method whenever it is triggered.
    Note that if you add the same target/method pair on a key multiple times
    with different context parameters, your observer will only be called once
    with the last context you passed.

    ### Observer Methods

    Observer methods you pass should generally have the following signature if
    you do not pass a `context` parameter:

    ```javascript
    fooDidChange: function(sender, key, value, rev) { };
    ```

    The sender is the object that changed. The key is the property that
    changes. The value property is currently reserved and unused. The rev
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.

    If you pass a `context` parameter, the context will be passed before the
    revision like so:

    ```javascript
    fooDidChange: function(sender, key, value, context, rev) { };
    ```

    Usually you will not need the value, context or revision parameters at
    the end. In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.

    @method addObserver
    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @public
  */
  addObserver(key, target, method) {
    addObserver(this, key, target, method);
  },

  /**
    Remove an observer you have previously registered on this object. Pass
    the same key, target, and method you passed to `addObserver()` and your
    target will no longer receive notifications.

    @method removeObserver
    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @public
  */
  removeObserver(key, target, method) {
    removeObserver(this, key, target, method);
  },

  /**
    Returns `true` if the object currently has observers registered for a
    particular key. You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.

    @method hasObserverFor
    @param {String} key Key to check
    @return {Boolean}
    @private
  */
  hasObserverFor(key) {
    return hasListeners(this, key + ':change');
  },

  /**
    Retrieves the value of a property, or a default value in the case that the
    property returns `undefined`.

    ```javascript
    person.getWithDefault('lastName', 'Doe');
    ```

    @method getWithDefault
    @param {String} keyName The name of the property to retrieve
    @param {Object} defaultValue The value to return if the property value is undefined
    @return {Object} The property value or the defaultValue.
    @public
  */
  getWithDefault(keyName, defaultValue) {
    return getWithDefault(this, keyName, defaultValue);
  },

  /**
    Set the value of a property to the current value plus some amount.

    ```javascript
    person.incrementProperty('age');
    team.incrementProperty('score', 2);
    ```

    @method incrementProperty
    @param {String} keyName The name of the property to increment
    @param {Number} increment The amount to increment by. Defaults to 1
    @return {Number} The new property value
    @public
  */
  incrementProperty(keyName, increment) {
    if (isNone(increment)) { increment = 1; }
    assert('Must pass a numeric value to incrementProperty', (!isNaN(parseFloat(increment)) && isFinite(increment)));
    return set(this, keyName, (parseFloat(get(this, keyName)) || 0) + increment);
  },

  /**
    Set the value of a property to the current value minus some amount.

    ```javascript
    player.decrementProperty('lives');
    orc.decrementProperty('health', 5);
    ```

    @method decrementProperty
    @param {String} keyName The name of the property to decrement
    @param {Number} decrement The amount to decrement by. Defaults to 1
    @return {Number} The new property value
    @public
  */
  decrementProperty(keyName, decrement) {
    if (isNone(decrement)) { decrement = 1; }
    assert('Must pass a numeric value to decrementProperty', (!isNaN(parseFloat(decrement)) && isFinite(decrement)));
    return set(this, keyName, (get(this, keyName) || 0) - decrement);
  },

  /**
    Set the value of a boolean property to the opposite of its
    current value.

    ```javascript
    starship.toggleProperty('warpDriveEngaged');
    ```

    @method toggleProperty
    @param {String} keyName The name of the property to toggle
    @return {Boolean} The new property value
    @public
  */
  toggleProperty(keyName) {
    return set(this, keyName, !get(this, keyName));
  },

  /**
    Returns the cached value of a computed property, if it exists.
    This allows you to inspect the value of a computed property
    without accidentally invoking it if it is intended to be
    generated lazily.

    @method cacheFor
    @param {String} keyName
    @return {Object} The cached value of the computed property, if any
    @public
  */
  cacheFor(keyName) {
    return cacheFor(this, keyName);
  },

  // intended for debugging purposes
  observersForKey(keyName) {
    return observersFor(this, keyName);
  }
});
