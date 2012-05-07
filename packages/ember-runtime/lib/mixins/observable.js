// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set;

/**
  @class

  ## Overview
  
  This mixin provides properties and property observing functionality, core
  features of the Ember object model.
  
  Properties and observers allow one object to observe changes to a
  property on another object. This is one of the fundamental ways that
  models, controllers and views communicate with each other in an Ember
  application.
  
  Any object that has this mixin applied can be used in observer
  operations. That includes Ember.Object and most objects you will
  interact with as you write your Ember application.

  Note that you will not generally apply this mixin to classes yourself,
  but you will use the features provided by this module frequently, so it
  is important to understand how to use it.
  
  ## Using get() and set()
  
  Because of Ember's support for bindings and observers, you will always
  access properties using the get method, and set properties using the
  set method. This allows the observing objects to be notified and
  computed properties to be handled properly.
  
  More documentation about `get` and `set` are below.
  
  ## Observing Property Changes

  You typically observe property changes simply by adding the `observes`
  call to the end of your method declarations in classes that you write.
  For example:

      Ember.Object.create({
        valueObserver: function() {
          // Executes whenever the "value" property changes
        }.observes('value')
      });
    
  Although this is the most common way to add an observer, this capability
  is actually built into the Ember.Object class on top of two methods
  defined in this mixin: `addObserver` and `removeObserver`. You can use
  these two methods to add and remove observers yourself if you need to
  do so at runtime.

  To add an observer for a property, call:

      object.addObserver('propertyKey', targetObject, targetAction)

  This will call the `targetAction` method on the `targetObject` to be called
  whenever the value of the `propertyKey` changes.
  
  Note that if `propertyKey` is a computed property, the observer will be 
  called when any of the property dependencies are changed, even if the 
  resulting value of the computed property is unchanged. This is necessary
  because computed properties are not computed until `get` is called.
  
  @extends Ember.Mixin
*/
Ember.Observable = Ember.Mixin.create(/** @scope Ember.Observable.prototype */ {

  /** @private - compatibility */
  isObserverable: true,

  /**
    Retrieves the value of a property from the object.

    This method is usually similar to using object[keyName] or object.keyName,
    however it supports both computed properties and the unknownProperty
    handler.
    
    Because `get` unifies the syntax for accessing all these kinds
    of properties, it can make many refactorings easier, such as replacing a
    simple property with a computed property, or vice versa.

    ### Computed Properties

    Computed properties are methods defined with the `property` modifier
    declared at the end, such as:

          fullName: function() {
            return this.getEach('firstName', 'lastName').compact().join(' ');
          }.property('firstName', 'lastName')

    When you call `get` on a computed property, the function will be
    called and the return value will be returned instead of the function
    itself.

    ### Unknown Properties

    Likewise, if you try to call `get` on a property whose value is
    undefined, the unknownProperty() method will be called on the object.
    If this method returns any value other than undefined, it will be returned
    instead. This allows you to implement "virtual" properties that are
    not defined upfront.

    @param {String} key The property to retrieve
    @returns {Object} The property value or undefined.
  */
  get: function(keyName) {
    return get(this, keyName);
  },

  /**
    To get multiple properties at once, call getProperties
    with a list of strings or an array:

          record.getProperties('firstName', 'lastName', 'zipCode'); // => { firstName: 'John', lastName: 'Doe', zipCode: '10011' }

   is equivalent to:

          record.getProperties(['firstName', 'lastName', 'zipCode']); // => { firstName: 'John', lastName: 'Doe', zipCode: '10011' }

    @param {String...|Array} list of keys to get
    @returns {Hash}
  */
  getProperties: function() {
    var ret = {};
    var propertyNames = arguments;
    if (arguments.length === 1 && Ember.typeOf(arguments[0]) === 'array') {
      propertyNames = arguments[0];
    }
    for(var i = 0; i < propertyNames.length; i++) {
      ret[propertyNames[i]] = get(this, propertyNames[i]);
    }
    return ret;
  },

  /**
    Sets the key equal to value.

    This method is generally very similar to calling object[key] = value or
    object.key = value, except that it provides support for computed
    properties, the unknownProperty() method and property observers.

    ### Computed Properties

    If you try to set a value on a key that has a computed property handler
    defined (see the get() method for an example), then set() will call
    that method, passing both the value and key instead of simply changing
    the value itself. This is useful for those times when you need to
    implement a property that is composed of one or more member
    properties.

    ### Unknown Properties

    If you try to set a value on a key that is undefined in the target
    object, then the unknownProperty() handler will be called instead. This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the object. If unknownProperty() returns
    undefined, then set() will simply set the value on the object.

    ### Property Observers

    In addition to changing the property, set() will also register a
    property change with the object. Unless you have placed this call
    inside of a beginPropertyChanges() and endPropertyChanges(), any "local"
    observers (i.e. observer methods declared on the same object), will be
    called immediately. Any "remote" observers (i.e. observer methods
    declared on another object) will be placed in a queue and called at a
    later time in a coalesced manner.

    ### Chaining

    In addition to property changes, set() returns the value of the object
    itself so you can do chaining like this:

          record.set('firstName', 'Charles').set('lastName', 'Jolley');

    @param {String} key The property to set
    @param {Object} value The value to set or null.
    @returns {Ember.Observable}
  */
  set: function(keyName, value) {
    set(this, keyName, value);
    return this;
  },

  /**
    To set multiple properties at once, call setProperties
    with a Hash:

          record.setProperties({ firstName: 'Charles', lastName: 'Jolley' });

    @param {Hash} hash the hash of keys and values to set
    @returns {Ember.Observable}
  */
  setProperties: function(hash) {
    return Ember.setProperties(this, hash);
  },

  /**
    Begins a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to begin deferring change
    notifications. When you are done making changes, call endPropertyChanges()
    to deliver the deferred change notifications and end deferring.

    @returns {Ember.Observable}
  */
  beginPropertyChanges: function() {
    Ember.beginPropertyChanges();
    return this;
  },

  /**
    Ends a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call
    beginPropertyChanges() at the beginning of the changes to defer change
    notifications. When you are done making changes, call this method to
    deliver the deferred change notifications and end deferring.

    @returns {Ember.Observable}
  */
  endPropertyChanges: function() {
    Ember.endPropertyChanges();
    return this;
  },

  /**
    Notify the observer system that a property is about to change.

    Sometimes you need to change a value directly or indirectly without
    actually calling get() or set() on it. In this case, you can use this
    method and propertyDidChange() instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call propertyWillChange and propertyDidChange as
    a pair. If you do not, it may get the property change groups out of order
    and cause notifications to be delivered more often than you would like.

    @param {String} key The property key that is about to change.
    @returns {Ember.Observable}
  */
  propertyWillChange: function(keyName){
    Ember.propertyWillChange(this, keyName);
    return this;
  },

  /**
    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without
    actually calling get() or set() on it. In this case, you can use this
    method and propertyWillChange() instead. Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call propertyWillChange and propertyDidChange as
    a pair. If you do not, it may get the property change groups out of order
    and cause notifications to be delivered more often than you would like.

    @param {String} keyName The property key that has just changed.
    @returns {Ember.Observable}
  */
  propertyDidChange: function(keyName) {
    Ember.propertyDidChange(this, keyName);
    return this;
  },
  
  /**
    Convenience method to call `propertyWillChange` and `propertyDidChange` in
    succession.
  
    @param {String} keyName The property key to be notified about.
    @returns {Ember.Observable}
  */
  notifyPropertyChange: function(keyName) {
    this.propertyWillChange(keyName);
    this.propertyDidChange(keyName);
    return this;
  },

  /**
    Adds an observer on a property.

    This is the core method used to register an observer for a property.

    Once you call this method, anytime the key's value is set, your observer
    will be notified. Note that the observers are triggered anytime the
    value is set, regardless of whether it has actually changed. Your
    observer should be prepared to handle that.

    You can also pass an optional context parameter to this method. The
    context will be passed to your observer method whenever it is triggered.
    Note that if you add the same target/method pair on a key multiple times
    with different context parameters, your observer will only be called once
    with the last context you passed.

    ### Observer Methods

    Observer methods you pass should generally have the following signature if
    you do not pass a "context" parameter:

          fooDidChange: function(sender, key, value, rev);

    The sender is the object that changed. The key is the property that
    changes. The value property is currently reserved and unused. The rev
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.

    If you pass a "context" parameter, the context will be passed before the
    revision like so:

          fooDidChange: function(sender, key, value, context, rev);

    Usually you will not need the value, context or revision parameters at
    the end. In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.

    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @returns {Ember.Object} self
  */
  addObserver: function(key, target, method) {
    Ember.addObserver(this, key, target, method);
  },

  /**
    Remove an observer you have previously registered on this object. Pass
    the same key, target, and method you passed to addObserver() and your
    target will no longer receive notifications.

    @param {String} key The key to observer
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke.
    @returns {Ember.Observable} receiver
  */
  removeObserver: function(key, target, method) {
    Ember.removeObserver(this, key, target, method);
  },

  /**
    Returns true if the object currently has observers registered for a
    particular key. You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.

    @param {String} key Key to check
    @returns {Boolean}
  */
  hasObserverFor: function(key) {
    return Ember.hasListeners(this, key+':change');
  },

  /**
    This method will be called when a client attempts to get the value of a
    property that has not been defined in one of the typical ways. Override
    this method to create "virtual" properties.
    
    @param {String} key The name of the unknown property that was requested.
    @returns {Object} The property value or undefined. Default is undefined.
  */
  unknownProperty: function(key) {
    return undefined;
  },

  /**
    This method will be called when a client attempts to set the value of a
    property that has not been defined in one of the typical ways. Override
    this method to create "virtual" properties.
    
    @param {String} key The name of the unknown property to be set.
    @param {Object} value The value the unknown property is to be set to.
  */
  setUnknownProperty: function(key, value) {
    this[key] = value;
  },

  /**
    This is like `get`, but allows you to pass in a dot-separated property
    path.
    
        person.getPath('address.zip'); // return the zip
        person.getPath('children.firstObject.age'); // return the first kid's age

    This reads much better than chained `get` calls.

    @param {String} path The property path to retrieve
    @returns {Object} The property value or undefined.
  */
  getPath: function(path) {
    return Ember.getPath(this, path);
  },

  /**
    This is like `set`, but allows you to specify the property you want to
    set as a dot-separated property path.
    
        person.setPath('address.zip', 10011); // set the zip to 10011
        person.setPath('children.firstObject.age', 6); // set the first kid's age to 6

    This is not as commonly used as `getPath`, but it can be useful.

    @param {String} path The path to the property that will be set
    @param {Object} value The value to set or null.
    @returns {Ember.Observable}
  */
  setPath: function(path, value) {
    Ember.setPath(this, path, value);
    return this;
  },

  /**
    Retrieves the value of a property, or a default value in the case that the property
    returns undefined.
    
        person.getWithDefault('lastName', 'Doe');
    
    @param {String} keyName The name of the property to retrieve
    @param {Object} defaultValue The value to return if the property value is undefined
    @returns {Object} The property value or the defaultValue.
  */
  getWithDefault: function(keyName, defaultValue) {
    return Ember.getWithDefault(this, keyName, defaultValue);
  },

  /**
    Set the value of a property to the current value plus some amount.
    
        person.incrementProperty('age');
        team.incrementProperty('score', 2);
    
    @param {String} keyName The name of the property to increment
    @param {Object} increment The amount to increment by. Defaults to 1
    @returns {Object} The new property value
  */
  incrementProperty: function(keyName, increment) {
    if (!increment) { increment = 1; }
    set(this, keyName, (get(this, keyName) || 0)+increment);
    return get(this, keyName);
  },
  
  /**
    Set the value of a property to the current value minus some amount.
    
        player.decrementProperty('lives');
        orc.decrementProperty('health', 5);
    
    @param {String} keyName The name of the property to decrement
    @param {Object} increment The amount to decrement by. Defaults to 1
    @returns {Object} The new property value
  */
  decrementProperty: function(keyName, increment) {
    if (!increment) { increment = 1; }
    set(this, keyName, (get(this, keyName) || 0)-increment);
    return get(this, keyName);
  },

  /**
    Set the value of a boolean property to the opposite of it's
    current value.
    
        starship.toggleProperty('warpDriveEnaged');
    
    @param {String} keyName The name of the property to toggle
    @returns {Object} The new property value
  */
  toggleProperty: function(keyName) {
    set(this, keyName, !get(this, keyName));
    return get(this, keyName);
  },

  /**
    Returns the cached value of a computed property, if it exists.
    This allows you to inspect the value of a computed property
    without accidentally invoking it if it is intended to be
    generated lazily.

    @param {String} keyName
    @returns {Object} The cached value of the computed property, if any
  */
  cacheFor: function(keyName) {
    return Ember.cacheFor(this, keyName);
  },

  /** @private - intended for debugging purposes */
  observersForKey: function(keyName) {
    return Ember.observersFor(this, keyName);
  }
});



