// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('ext/function');
sc_require('private/observer_set');
sc_require('private/chain_observer');

/**
  Set to YES to have all observing activity logged to the console.  This
  should be used for debugging only.

  @type Boolean
*/
SC.LOG_OBSERVERS = false;

SC.OBSERVES_HANDLER_ADD = 0;
SC.OBSERVES_HANDLER_REMOVE = 1;

/**
  @class

  Key-Value-Observing (KVO) simply allows one object to observe changes to a
  property on another object. It is one of the fundamental ways that models,
  controllers and views communicate with each other in a SproutCore
  application.  Any object that has this module applied to it can be used in
  KVO-operations.

  This module is applied automatically to all objects that inherit from
  SC.Object, which includes most objects bundled with the SproutCore
  framework.  You will not generally apply this module to classes yourself,
  but you will use the features provided by this module frequently, so it is
  important to understand how to use it.

  Enabling Key Value Observing
  ---

  With KVO, you can write functions that will be called automatically whenever
  a property on a particular object changes.  You can use this feature to
  reduce the amount of "glue code" that you often write to tie the various
  parts of your application together.

  To use KVO, just use the KVO-aware methods get() and set() to access
  properties instead of accessing properties directly.  Instead of writing:

        var aName = contact.firstName;
        contact.firstName = 'Charles';

  use:

        var aName = contact.get('firstName');
        contact.set('firstName', 'Charles');

  get() and set() work just like the normal "dot operators" provided by
  JavaScript but they provide you with much more power, including not only
  observing but computed properties as well.

  Observing Property Changes
  ---

  You typically observe property changes simply by adding the observes()
  call to the end of your method declarations in classes that you write.  For
  example:

        SC.Object.create({
          valueObserver: function () {
            // Executes whenever the "Value" property changes
          }.observes('value')
        });

  Although this is the most common way to add an observer, this capability is
  actually built into the SC.Object class on top of two methods defined in
  this mixin called addObserver() and removeObserver().  You can use these two
  methods to add and remove observers yourself if you need to do so at run
  time.

  To add an observer for a property, just call:

        object.addObserver('propertyKey', targetObject, targetAction);

  This will call the 'targetAction' method on the targetObject to be called
  whenever the value of the propertyKey changes.

  Observer Parameters
  ---

  An observer function typically does not need to accept any parameters,
  however you can accept certain arguments when writing generic observers.
  An observer function can have the following arguments:

        propertyObserver(target, key, value, revision);

  - *target* - This is the object whose value changed.  Usually this.
  - *key* - The key of the value that changed
  - *value* - this property is no longer used.  It will always be null
  - *revision* - this is the revision of the target object

  Implementing Manual Change Notifications
  ---

  Sometimes you may want to control the rate at which notifications for
  a property are delivered, for example by checking first to make sure
  that the value has changed.

  To do this, you need to implement a computed property for the property
  you want to change and override automaticallyNotifiesObserversFor().

  The example below will only notify if the "balance" property value actually
  changes:


        automaticallyNotifiesObserversFor: function (key) {
          return (key === 'balance') ? NO : sc_super();
        },

        balance: function (key, value) {
          var balance = this._balance;
          if ((value !== undefined) && (balance !== value)) {
            this.propertyWillChange(key);
            balance = this._balance = value;
            this.propertyDidChange(key);
          }
          return balance;
        }


  Implementation Details
  ---

  Internally, SproutCore keeps track of observable information by adding a
  number of properties to the object adopting the observable.  All of these
  properties begin with "_kvo_" to separate them from the rest of your object.

  @since SproutCore 1.0
*/
SC.Observable = /** @scope SC.Observable.prototype */{

  /**
    Walk like that ol' duck

    @type Boolean
  */
  isObservable: YES,

  /**
    Determines whether observers should be automatically notified of changes
    to a key.

    If you are manually implementing change notifications for a property, you
    can override this method to return NO for properties you do not want the
    observing system to automatically notify for.

    The default implementation always returns YES.

    @param {String} key the key that is changing
    @returns {Boolean} YES if automatic notification should occur.
  */
  automaticallyNotifiesObserversFor: function (key) {
    return YES;
  },

  // ..........................................
  // PROPERTIES
  //
  // Use these methods to get/set properties.  This will handle observing
  // notifications as well as allowing you to define functions that can be
  // used as properties.

  /**
    Retrieves the value of key from the object.

    This method is generally very similar to using object[key] or object.key,
    however it supports both computed properties and the unknownProperty
    handler.

    Computed Properties
    ---

    Computed properties are methods defined with the property() modifier
    declared at the end, such as:

          fullName: function () {
            return this.getEach('firstName', 'lastName').compact().join(' ');
          }.property('firstName', 'lastName')

    When you call get() on a computed property, the property function will be
    called and the return value will be returned instead of the function
    itself.

    Unknown Properties
    ---

    Likewise, if you try to call get() on a property whose values is
    undefined, the unknownProperty() method will be called on the object.
    If this method returns any value other than undefined, it will be returned
    instead.  This allows you to implement "virtual" properties that are
    not defined upfront.

    @param {String} key the property to retrieve
    @returns {Object} the property value or undefined.

  */
  get: function (key) {
    var ret = this[key], cache;
    if (ret === undefined) {
      return this.unknownProperty(key);
    } else if (ret && ret.isProperty) {
      if (ret.isCacheable) {
        cache = this._kvo_cache;
        if (!cache) cache = this._kvo_cache = {};
        return (cache[ret.cacheKey] !== undefined) ? cache[ret.cacheKey] : (cache[ret.cacheKey] = ret.call(this, key));
      } else return ret.call(this, key);
    } else return ret;
  },

  /**
    Sets the key equal to value.

    This method is generally very similar to calling object[key] = value or
    object.key = value, except that it provides support for computed
    properties, the unknownProperty() method and property observers.

    Computed Properties
    ---

    If you try to set a value on a key that has a computed property handler
    defined (see the get() method for an example), then set() will call
    that method, passing both the value and key instead of simply changing
    the value itself.  This is useful for those times when you need to
    implement a property that is composed of one or more member
    properties.

    Unknown Properties
    ---

    If you try to set a value on a key that is undefined in the target
    object, then the unknownProperty() handler will be called instead.  This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the object.  If unknownProperty() returns
    undefined, then set() will simply set the value on the object.

    Property Observers
    ---

    In addition to changing the property, set() will also register a
    property change with the object.  Unless you have placed this call
    inside of a beginPropertyChanges() and endPropertyChanges(), any "local"
    observers (i.e. observer methods declared on the same object), will be
    called immediately.  Any "remote" observers (i.e. observer methods
    declared on another object) will be placed in a queue and called at a
    later time in a coalesced manner.

    Chaining
    ---

    In addition to property changes, set() returns the value of the object
    itself so you can do chaining like this:

          record.set('firstName', 'Charles').set('lastName', 'Jolley');

    @param {String|Hash} key the property to set
    @param {Object} value the value to set or null.
    @returns {SC.Observable}
  */
  set: function (key, value) {
    var func   = this[key],
        notify = this.automaticallyNotifiesObserversFor(key),
        ret    = value,
        cachedep, cache, idx, dfunc;

    if (value === undefined && SC.typeOf(key) === SC.T_HASH) {
      var hash = key;

      for (key in hash) {
        if (!hash.hasOwnProperty(key)) continue;
        this.set(key, hash[key]);
      }

      return this;
    }

    // if there are any dependent keys and they use caching, then clear the
    // cache.  (If we're notifying, then propertyDidChange will do this for
    // us.)
    if (!notify && this._kvo_cacheable && (cache = this._kvo_cache)) {
      // lookup the cached dependents for this key.  if undefined, compute.
      // note that if cachdep is set to null is means we figure out it has no
      // cached dependencies already.  this is different from undefined.
      cachedep = this._kvo_cachedep;
      if (!cachedep || (cachedep = cachedep[key]) === undefined) {
        cachedep = this._kvo_computeCachedDependentsFor(key);
      }

      if (cachedep) {
        idx = cachedep.length;
        while (--idx >= 0) {
          dfunc = cachedep[idx];
          cache[dfunc.cacheKey] = cache[dfunc.lastSetValueKey] = undefined;
        }
      }
    }

    // set the value.
    if (func && func.isProperty) {
      cache = this._kvo_cache;
      if (func.isVolatile || !cache || (cache[func.lastSetValueKey] !== value)) {
        if (!cache) cache = this._kvo_cache = {};

        cache[func.lastSetValueKey] = value;
        if (notify) this.propertyWillChange(key);
        ret = func.call(this, key, value);

        // update cached value
        if (func.isCacheable) cache[func.cacheKey] = ret;
        if (notify) this.propertyDidChange(key, ret, YES);
      }

    } else if (func === undefined) {
      if (notify) this.propertyWillChange(key);
      this.unknownProperty(key, value);
      if (notify) this.propertyDidChange(key, ret);

    } else {
      if (this[key] !== value) {
        if (notify) this.propertyWillChange(key);
        ret = this[key] = value;
        if (notify) this.propertyDidChange(key, ret);
      }
    }

    return this;
  },

  /**
    Called whenever you try to get or set an undefined property.

    This is a generic property handler.  If you define it, it will be called
    when the named property is not yet set in the object.  The default does
    nothing.

    @param {String} key the key that was requested
    @param {Object} value The value if called as a setter, undefined if called as a getter.
    @returns {Object} The new value for key.
  */
  unknownProperty: function (key, value) {
    if (value !== undefined) { this[key] = value; }
    return value;
  },

  /**
    Begins a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished.  If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to suspend change notifications.
    When you are done making changes, call endPropertyChanges() to allow
    notification to resume.

    @returns {SC.Observable}
  */
  beginPropertyChanges: function () {
    this._kvo_changeLevel = (this._kvo_changeLevel || 0) + 1;
    return this;
  },

  /**
    Ends a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished.  If you plan to make a
    large number of changes to an object at one time, you should call
    beginPropertyChanges() at the beginning of the changes to suspend change
    notifications. When you are done making changes, call this method to allow
    notification to resume.

    @returns {SC.Observable}
  */
  endPropertyChanges: function () {
    this._kvo_changeLevel = (this._kvo_changeLevel || 1) - 1;
    var level = this._kvo_changeLevel, changes = this._kvo_changes;
    if ((level <= 0) && changes && (changes.length > 0) && !SC.Observers.isObservingSuspended) {
      this._notifyPropertyObservers();
    }
    return this;
  },

  /**
    Notify the observer system that a property is about to change.

    Sometimes you need to change a value directly or indirectly without
    actually calling get() or set() on it.  In this case, you can use this
    method and propertyDidChange() instead.  Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call propertyWillChange and propertyDidChange as
    a pair.  If you do not, it may get the property change groups out of order
    and cause notifications to be delivered more often than you would like.

    @param {String} key The property key that is about to change.
    @returns {SC.Observable}
  */
  propertyWillChange: function (key) {
    return this;
  },

  /**
    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without
    actually calling get() or set() on it.  In this case, you can use this
    method and propertyWillChange() instead.  Calling these two methods
    together will notify all observers that the property has potentially
    changed value.

    Note that you must always call propertyWillChange and propertyDidChange as
    a pair. If you do not, it may get the property change groups out of order
    and cause notifications to be delivered more often than you would like.

    @param {String} key The property key that has just changed.
    @param {Object} value The new value of the key.  May be null.
    @param {Boolean} _keepCache Private property
    @returns {SC.Observable}
  */
  propertyDidChange: function (key, value, _keepCache) {
    this._kvo_revision = (this._kvo_revision || 0) + 1;
    var level = this._kvo_changeLevel || 0,
        cachedep, idx, dfunc, func,
        log = SC.LOG_OBSERVERS && (this.LOG_OBSERVING !== NO);

    // If any dependent keys contain this property in their path,
    // invalidate the cache of the computed property and re-setup chain with
    // new value.
    var chains = this._kvo_property_chains;
    if (chains) {
      var keyChains = chains[key];

      if (keyChains) {
        this.beginPropertyChanges();
        keyChains = SC.clone(keyChains);
        keyChains.forEach(function (chain) {
          // Invalidate the property that depends on the changed key.
          chain.notifyPropertyDidChange();
        });
        this.endPropertyChanges();
      }
    }

    var cache = this._kvo_cache;
    if (cache) {

      // clear any cached value
      if (!_keepCache) {
        func = this[key];
        if (func && func.isProperty) {
          cache[func.cacheKey] = cache[func.lastSetValueKey] = undefined;
        }
      }

      if (this._kvo_cacheable) {
        // if there are any dependent keys and they use caching, then clear the
        // cache.  This is the same code as is in set.  It is inlined for perf.
        cachedep = this._kvo_cachedep;
        if (!cachedep || (cachedep = cachedep[key]) === undefined) {
          cachedep = this._kvo_computeCachedDependentsFor(key);
        }

        if (cachedep) {
          idx = cachedep.length;
          while (--idx >= 0) {
            dfunc = cachedep[idx];
            cache[dfunc.cacheKey] = cache[dfunc.lastSetValueKey] = undefined;
          }
        }
      }
    }

    // save in the change set if queuing changes
    var suspended = SC.Observers.isObservingSuspended;
    if ((level > 0) || suspended) {
      var changes = this._kvo_changes;
      if (!changes) changes = this._kvo_changes = SC.CoreSet.create();
      changes.add(key);

      if (suspended) {
        if (log) console.log("%@%@: will not notify observers because observing is suspended".fmt(SC.KVO_SPACES, this));
        SC.Observers.objectHasPendingChanges(this);
      }

    // otherwise notify property observers immediately
    } else this._notifyPropertyObservers(key);

    return this;
  },

  // ..........................................
  // DEPENDENT KEYS
  //

  /**
    Use this to indicate that one key changes if other keys it depends on
    change.  Pass the key that is dependent and additional keys it depends
    upon.  You can either pass the additional keys inline as arguments or
    in a single array.

    You generally do not call this method, but instead pass dependent keys to
    your property() method when you declare a computed property.

    You can call this method during your init to register the keys that should
    trigger a change notification for your computed properties.

    @param {String} key the dependent key
    @param {Array|String} dependentKeys one or more dependent keys
    @returns {Object} this
  */
  registerDependentKey: function (key, dependentKeys) {
    var dependents      = this._kvo_dependents,
      // chainDependents = this._kvo_chain_dependents,
      keys, idx, lim, dep, queue;

    // normalize input.
    if (typeof dependentKeys === "object" && (dependentKeys instanceof Array)) {
      keys = dependentKeys;
      lim  = 0;
    } else {
      keys = arguments;
      lim  = 1;
    }
    idx  = keys.length;

    // define dependents if not defined already.
    if (!dependents) this._kvo_dependents = dependents = {};

    // for each key, build array of dependents, add this key...
    // note that we ignore the first argument since it is the key...
    while (--idx >= lim) {
      dep = keys[idx];

      if (dep.indexOf('.') >= 0) {
        SC._PropertyChain.createChain(dep, this, key).activate();
      } else {
        // add dependent key to dependents array of key it depends on
        queue = dependents[dep];
        if (!queue) { queue = dependents[dep] = []; }
        queue.push(key);
      }
    }
  },

  /** @private
    Register a property chain so that dependent keys can be invalidated
    when a property on this object changes.

    @param {String} property the property on this object that invalidates the chain
    @param {SC._PropertyChain} chain the chain to notify
  */
  registerDependentKeyWithChain: function (property, chain) {
    var chains = this._chainsFor(property);
    chains.add(chain);
  },

  /** @private
    Removes a property chain from the object.

    @param {String} property the property on this object that invalidates the chain
    @param {SC._PropertyChain} chain the chain to notify
  */
  removeDependentKeyWithChain: function (property, chain) {
    var chains = this._chainsFor(property);
    chains.remove(chain);

    if (chains.get('length') === 0) {
      delete this._kvo_property_chains[property];
    }
  },

  /** @private
    Returns an instance of SC.CoreSet in which to save SC._PropertyChains.

    @param {String} property the property associated with the SC._PropertyChain
    @returns {SC.CoreSet}
  */
  _chainsFor: function (property) {
    this._kvo_property_chains = this._kvo_property_chains || {};
    var chains = this._kvo_property_chains[property] || SC.CoreSet.create();
    this._kvo_property_chains[property] = chains;

    return chains;
  },

  /** @private

    Helper method used by computeCachedDependents.  Just loops over the
    array of dependent keys.  If the passed function is cacheable, it will
    be added to the queue.  Also, recursively call on each keys dependent
    keys.

    @param {Array} queue the queue to add functions to
    @param {Array} keys the array of dependent keys for this key
    @param {Hash} dependents the _kvo_dependents cache
    @param {SC.Set} seen already seen keys
    @returns {void}
  */
  _kvo_addCachedDependents: function (queue, keys, dependents, seen) {
    var idx = keys.length,
        func, key, deps;

    while (--idx >= 0) {
      key  = keys[idx];
      seen.add(key);

      // if the value for this key is a computed property, then add it to the
      // set if it is cacheable, and process any of its dependent keys also.
      func = this[key];
      if (func && (func instanceof Function) && func.isProperty) {
        if (func.isCacheable) queue.push(func); // handle this func
        if ((deps = dependents[key]) && deps.length > 0) { // and any dependents
          this._kvo_addCachedDependents(queue, deps, dependents, seen);
        }
      }
    }

  },

  /** @private

    Called by set() whenever it needs to determine which cached dependent
    keys to clear.  Recursively searches dependent keys to determine all
    cached property directly or indirectly affected.

    The return value is also saved for future reference

    @param {String} key the key to compute
    @returns {Array}
  */
  _kvo_computeCachedDependentsFor: function (key) {
    var cached     = this._kvo_cachedep,
        dependents = this._kvo_dependents,
        keys       = dependents ? dependents[key] : null,
        queue, seen;
    if (!cached) cached = this._kvo_cachedep = {};

    // if there are no dependent keys, then just set and return null to avoid
    // this mess again.
    if (!keys || keys.length === 0) return cached[key] = null;

    // there are dependent keys, so we need to do the work to find out if
    // any of them or their dependent keys are cached.
    queue = cached[key] = [];
    seen  = SC._TMP_SEEN_SET = (SC._TMP_SEEN_SET || SC.CoreSet.create());
    seen.add(key);
    this._kvo_addCachedDependents(queue, keys, dependents, seen);
    seen.clear(); // reset

    if (queue.length === 0) queue = cached[key] = null; // turns out nothing
    return queue;
  },

  // ..........................................
  // OBSERVERS
  //

  _kvo_for: function (kvoKey, type) {
    var ret = this[kvoKey];

    if (!this._kvo_cloned) this._kvo_cloned = {};

    // if the item does not exist, create it.  Unless type is passed,
    // assume array.
    if (!ret) {
      ret = this[kvoKey] = (type === undefined) ? [] : type.create();
      this._kvo_cloned[kvoKey] = YES;

    // if item does exist but has not been cloned, then clone it.  Note
    // that all types must implement copy().0
    } else if (!this._kvo_cloned[kvoKey]) {
      ret = this[kvoKey] = ret.copy();
      this._kvo_cloned[kvoKey] = YES;
    }

    return ret;
  },

  /**
    Adds an observer on a property.

    This is the core method used to register an observer for a property.

    Once you call this method, anytime the key's value is set, your observer
    will be notified.  Note that the observers are triggered anytime the
    value is set, regardless of whether it has actually changed.  Your
    observer should be prepared to handle that.

    You can also pass an optional context parameter to this method.  The
    context will be passed to your observer method whenever it is triggered.
    Note that if you add the same target/method pair on a key multiple times
    with different context parameters, your observer will only be called once
    with the last context you passed.

    Observer Methods
    ---

    Observer methods you pass should generally have the following signature if
    you do not pass a "context" parameter:

          fooDidChange: function (sender, key, value, rev);

    The sender is the object that changed.  The key is the property that
    changes.  The value property is currently reserved and unused.  The rev
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.

    If you pass a "context" parameter, the context will be passed before the
    revision like so:

          fooDidChange: function (sender, key, value, context, rev);

    Usually you will not need the value, context or revision parameters at
    the end.  In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.

    @param {String} key the key to observer
    @param {Object} target the target object to invoke
    @param {String|Function} method the method to invoke.
    @param {Object} context optional context
    @returns {SC.Object} self
  */
  addObserver: function (key, target, method, context) {
    var kvoKey, chain;

    // normalize.  if a function is passed to target, make it the method.
    if (method === undefined) {
      method = target;
      target = this;
    }
    if (!target) target = this;

    if (typeof method === "string") method = target[method];
    if (!method) throw new Error("You must pass a method to addObserver()");

    // Normalize key...
    key = key.toString();
    if (key.indexOf('.') >= 0) {

      // create the chain and save it for later so we can tear it down if
      // needed.
      chain = SC._ChainObserver.createChain(this, key, target, method, context);
      chain.masterTarget = target;
      chain.masterMethod = method;

      // Save in set for chain observers.
      this._kvo_for(SC.keyFor('_kvo_chains', key)).push(chain);

    // Create observers if needed...
    } else {

      // Special case to support reduced properties.  If the property
      // key begins with '@' and its value is unknown, then try to get its
      // value.  This will configure the dependent keys if needed.
      if ((this[key] === undefined) && (key.indexOf('@') === 0)) {
        this.get(key);
      }

      if (target === this) target = null; // use null for observers only.
      kvoKey = SC.keyFor('_kvo_observers', key);
      this._kvo_for(kvoKey, SC.ObserverSet).add(target, method, context);
      this._kvo_for('_kvo_observed_keys', SC.CoreSet).add(key);
    }

    if (this.didAddObserver) this.didAddObserver(key, target, method);
    return this;
  },

  /**
    Remove an observer you have previously registered on this object.  Pass
    the same key, target, and method you passed to addObserver() and your
    target will no longer receive notifications.

    @param {String} key the key to observer
    @param {Object} target the target object to invoke
    @param {String|Function} method the method to invoke.
    @returns {SC.Observable} receiver
  */
  removeObserver: function (key, target, method) {

    var kvoKey, chains, chain, observers, idx;

    // normalize.  if a function is passed to target, make it the method.
    if (method === undefined) {
      method = target;
      target = this;
    }
    if (!target) target = this;

    if (typeof method === "string") method = target[method];
    if (!method) throw new Error("You must pass a method to removeObserver()");

    // if the key contains a '.', this is a chained observer.
    key = key.toString();
    if (key.indexOf('.') >= 0) {

      // try to find matching chains
      kvoKey = SC.keyFor('_kvo_chains', key);
      if (chains = this[kvoKey]) {

        // if chains have not been cloned yet, do so now.
        chains = this._kvo_for(kvoKey);

        // remove any chains
        idx = chains.length;
        while (--idx >= 0) {
          chain = chains[idx];
          if (chain && (chain.masterTarget === target) && (chain.masterMethod === method)) {
            chains[idx] = chain.destroyChain();
          }
        }
      }

    // otherwise, just like a normal observer.
    } else {
      if (target === this) target = null; // use null for observers only.
      kvoKey = SC.keyFor('_kvo_observers', key);
      if (observers = this[kvoKey]) {
        // if observers have not been cloned yet, do so now
        observers = this._kvo_for(kvoKey);
        observers.remove(target, method);

        // Remove the key when no members remain.
        if (observers.getMembers().length === 0) {
          this._kvo_for('_kvo_observed_keys', SC.CoreSet).remove(key);
        }
      }
    }

    if (this.didRemoveObserver) this.didRemoveObserver(key, target, method);
    return this;
  },

  /**
    Returns YES if the object currently has observers registered for a
    particular key.  You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.

    @param {String} key key to check
    @returns {Boolean}
  */
  hasObserverFor: function (key) {
    SC.Observers.flush(this); // hookup as many observers as possible.

    var observers = this[SC.keyFor('_kvo_observers', key)],
      locals = this[SC.keyFor('_kvo_local', key)];

    if (locals && locals.length > 0) return YES;
    if (observers && observers.getMembers().length > 0) return YES;
    return NO;
  },

  /**
    This method will register any observers and computed properties saved on
    the object.  Normally you do not need to call this method yourself.  It
    is invoked automatically just before property notifications are sent and
    from the init() method of SC.Object.  You may choose to call this
    from your own initialization method if you are using SC.Observable in
    a non-SC.Object-based object.

    This method looks for several private variables, which you can setup,
    to initialize:

      - _observers: this should contain an array of key names for observers
        you need to configure.

      - _bindings: this should contain an array of key names that configure
        bindings.

      - _properties: this should contain an array of key names for computed
        properties.

    @returns {Object} this
  */
  initObservable: function () {
    if (this._observableInited) return;
    this._observableInited = YES;

    var loc, keys, key, value, observer, propertyPaths, propertyPathsLength,
        len, ploc, path, propertyKey, keysLen;

    // Loop through observer functions and register them
    if (keys = this._observers) {
      len = keys.length;
      for (loc = 0; loc < len; loc++) {
        key = keys[loc];
        observer = this[key];
        propertyPaths = observer.propertyPaths;
        propertyPathsLength = (propertyPaths) ? propertyPaths.length : 0;
        for (ploc = 0 ; ploc < propertyPathsLength; ploc++) {
          path = propertyPaths[ploc];
          this.addObservesHandler(observer, path);
        }
      }
    }

    // Add Bindings
    this.bindings = []; // will be filled in by the bind() method.
    if (keys = this._bindings) {
      for (loc = 0, keysLen = keys.length; loc < keysLen; loc++) {
        // get propertyKey
        key = keys[loc];
        value = this[key];
        propertyKey = key.slice(0, -7); // contentBinding => content

        // Replace the short form property with the new binding object.
        this[key] = this.bind(propertyKey, value);
      }
    }

    // Add Properties
    if (keys = this._properties) {
      for (loc = 0, keysLen = keys.length; loc < keysLen; loc++) {
        key = keys[loc];
        if (value = this[key]) {

          // activate cacheable only if needed for perf reasons
          if (value.isCacheable) this._kvo_cacheable = YES;

          // register dependent keys
          if (value.dependentKeys && (value.dependentKeys.length > 0)) {
            this.registerDependentKey(key, value.dependentKeys);
          }
        }
      }
    }

    // Clean up these properties once they have been used.
    delete this._bindings;
    delete this._properties;

    return this;
  },

  /**
    This method will destroy the observable.

    @returns {Object} this
  */
  destroyObservable: function () {
    var key, keys,
      len,
      observer,
      path,
      propertyPaths,
      propertyPathsLength;

    // Destroy bindings
    this.bindings.invoke('destroy');
    delete this.bindings;

    // Loop through observer functions and remove them
    if (keys = this._observers) {
      len = keys.length;
      for (var loc = 0; loc < len; loc++) {
        key = keys[loc];
        observer = this[key];
        propertyPaths = observer.propertyPaths;
        propertyPathsLength = (propertyPaths) ? propertyPaths.length : 0;

        for (var ploc = 0; ploc < propertyPathsLength; ploc++) {
          path = propertyPaths[ploc];
          this.removeObservesHandler(observer, path);
        }
      }
    }

    delete this._observers;

    return this;
  },

  /**
    Will add an observes handler to this object for a given property path.

    In most cases, the path provided is relative to this object. However,
    if the path begins with a capital character then the path is considered
    relative to the window object.

    @param {Function} observer the function on this object that will be
      notified of changes
    @param {String} path a property path string
    @return {Object} returns this
  */
  addObservesHandler: function (observer, path) {
    this._configureObservesHandler(SC.OBSERVES_HANDLER_ADD, observer, path);
    return this;
  },

  /**
    Will remove an observes handler from this object for a given property path.

    In most cases, the path provided is relative to this object. However,
    if the path begins with a capital character then the path is considered
    relative to the window object.

    @param {Function} observer the function on this object that will be
      notified of changes
    @param {String} path a property path string
    @return {Object} returns this
  */
  removeObservesHandler: function (observer, path) {
    this._configureObservesHandler(SC.OBSERVES_HANDLER_REMOVE, observer, path);
    return this;
  },

  /** @private

    Used to either add or remove an observer handler on this object
    for a given property path.

    In most cases, the path provided is relative to this object. However,
    if the path begins with a capital character then the path is considered
    relative to the window object.

    You must supply an action that is to be performed by this method. The
    action can either be `SC.OBSERVES_HANDLER_ADD` or `SC.OBSERVES_HANDLER_REMOVE`.

    @param {Function} observer the function on this object that will be
      notified of changes
    @param {String} path a property path string
    @param {String} path a dot-notation property path string
  */
  _configureObservesHandler: function (action, observer, path) {
    var dotIndex, root;

    switch (action) {
    case SC.OBSERVES_HANDLER_ADD:
      action = "addObserver";
      break;
    case SC.OBSERVES_HANDLER_REMOVE:
      action = "removeObserver";
      break;
    default:
      throw new Error("invalid action provided: " + action);
    }

    dotIndex = path.indexOf('.');

    if (dotIndex < 0) {
      this[action](path, this, observer);
    } else if (path.indexOf('*') === 0) {
      this[action](path.slice(1), this, observer);
    } else {
      root = null;

      if (dotIndex === 0) {
        root = this;
        path = path.slice(1);
      } else if (dotIndex === 4 && path.slice(0, 5) === 'this.') {
        root = this;
        path = path.slice(5);
      } else if (dotIndex < 0 && path.length === 4 && path === 'this') {
        root = this;
        path = '';
      } else if (dotIndex > 0 && path[0] === path.charAt(0).toLowerCase()) {
        // if the first character for the given path is lower case
        // then we assume the path is relative to this
        root = this;
      }

      SC.Observers[action](path, this, observer, root);
    }
  },

  // ..........................................
  // NOTIFICATION
  //

  /**
    Returns an array with all of the observers registered for the specified
    key.  This is intended for debugging purposes only.  You generally do not
    want to rely on this method for production code.

    @param {String} key the key to evaluate
    @returns {Array} array of Observer objects, describing the observer.
  */
  observersForKey: function (key) {
    SC.Observers.flush(this); // hookup as many observers as possible.

    var observers = this[SC.keyFor('_kvo_observers', key)];
    return observers ? observers.getMembers() : [];
  },

  // this private method actually notifies the observers for any keys in the
  // observer queue.  If you pass a key it will be added to the queue.
  _notifyPropertyObservers: function (key) {
    if (!this._observableInited) this.initObservable();

    SC.Observers.flush(this); // hookup as many observers as possible.

    var log = SC.LOG_OBSERVERS && this.LOG_OBSERVING !== NO,
        observers, changes, dependents, starObservers, idx, keys, rev,
        members, membersLength, member, memberLoc, target, method, loc, func,
        context, spaces, cache;

    if (log) {
      spaces = SC.KVO_SPACES = (SC.KVO_SPACES || '') + '  ';
      console.log('%@%@: notifying observers after change to key "%@"'.fmt(spaces, this, key));
    }

    // Get any starObservers -- they will be notified of all changes.
    starObservers =  this['_kvo_observers_*'];

    // prevent notifications from being sent until complete
    this._kvo_changeLevel = (this._kvo_changeLevel || 0) + 1;

    // keep sending notifications as long as there are changes
    while (((changes = this._kvo_changes) && (changes.length > 0)) || key) {

      // increment revision
      rev = ++this.propertyRevision;

      // save the current set of changes and swap out the kvo_changes so that
      // any set() calls by observers will be saved in a new set.
      if (!changes) changes = SC.CoreSet.create();
      this._kvo_changes = null;

      // Add the passed key to the changes set.  If a '*' was passed, then
      // add all keys in the observers to the set...
      // once finished, clear the key so the loop will end.
      if (key === '*') {
        changes.add('*');
        changes.addEach(this._kvo_for('_kvo_observed_keys', SC.CoreSet));

      } else if (key) changes.add(key);

      // Now go through the set and add all dependent keys...
      if (dependents = this._kvo_dependents) {

        // NOTE: each time we loop, we check the changes length, this
        // way any dependent keys added to the set will also be evaluated...
        for (idx = 0; idx < changes.length; idx++) {
          key = changes[idx];
          keys = dependents[key];

          // for each dependent key, add to set of changes.  Also, if key
          // value is a cacheable property, clear the cached value...
          if (keys && (loc = keys.length)) {
            if (log) {
              console.log("%@...including dependent keys for %@: %@".fmt(spaces, key, keys));
            }
            cache = this._kvo_cache;
            if (!cache) cache = this._kvo_cache = {};
            while (--loc >= 0) {
              changes.add(key = keys[loc]);
              if (func = this[key]) {
                this[func.cacheKey] = undefined;
                cache[func.cacheKey] = cache[func.lastSetValueKey] = undefined;
              } // if (func=)
            } // while (--loc)
          } // if (keys &&
        } // for(idx...
      } // if (dependents...)

      // now iterate through all changed keys and notify observers.
      while (changes.length > 0) {
        key = changes.pop(); // the changed key

        // find any observers and notify them...
        observers = this[SC.keyFor('_kvo_observers', key)];

        if (observers) {
          // We need to clone the 'members' structure here in case any of the
          // observers we're about to notify happen to remove observers for
          // this key, which would mutate the structure underneath us.
          // (Cloning it rather than mutating gives us a clear policy:  if you
          // were registered as an observer at the time notification begins,
          // you will be notified, regardless of whether you're removed as an
          // observer during that round of notification.  Similarly, if you're
          // added as an observer during the notification round by another
          // observer, you will not be notified until the next time.)
          members = observers.getMembers();
          membersLength = members.length;
          for (memberLoc = 0; memberLoc < membersLength; memberLoc++) {
            member = members[memberLoc];

            if (member[3] === rev) continue; // skip notified items.

            if (!member[1]) console.log(member);

            target = member[0] || this;
            method = member[1];
            context = member[2];
            member[3] = rev;

            if (log) console.log('%@...firing observer on %@ for key "%@"'.fmt(spaces, target, key));
            if (context !== undefined) {
              method.call(target, this, key, null, context, rev);
            } else {
              method.call(target, this, key, null, rev);
            }
          }
        }

        // look for local observers.  Local observers are added by SC.Object
        // as an optimization to avoid having to add observers for every
        // instance when you are just observing your local object.
        members = this[SC.keyFor('_kvo_local', key)];
        if (members) {
          // Note:  Since, unlike above, we don't expect local observers to be
          //        removed in general, we will not clone 'members'.
          membersLength = members.length;
          for (memberLoc = 0; memberLoc < membersLength; memberLoc++) {
            member = members[memberLoc];
            method = this[member]; // try to find observer function
            if (method) {
              if (log) console.log('%@...firing local observer %@.%@ for key "%@"'.fmt(spaces, this, member, key));
              method.call(this, this, key, null, rev);
            }
          }
        }

        // if there are starObservers, do the same thing for them
        if (starObservers && key !== '*') {
          // We clone the structure per the justification, above, for regular
          // observers.
          members = starObservers.getMembers();
          membersLength = members.length;
          for (memberLoc = 0; memberLoc < membersLength; memberLoc++) {
            member = members[memberLoc];
            target = member[0] || this;
            method = member[1];
            context = member[2];

            if (log) console.log('%@...firing * observer on %@ for key "%@"'.fmt(spaces, target, key));
            if (context !== undefined) {
              method.call(target, this, key, null, context, rev);
            } else {
              method.call(target, this, key, null, rev);
            }
          }
        }

        // if there is a default property observer, call that also
        if (this.propertyObserver) {
          if (log) console.log('%@...firing %@.propertyObserver for key "%@"'.fmt(spaces, this, key));
          this.propertyObserver(this, key, null, rev);
        }
      } // while(changes.length>0)

      // changes set should be empty. release it for reuse
      if (changes) changes.destroy();

      // key is no longer needed; clear it to avoid infinite loops
      key = null;

    } // while (changes)

    // done with loop, reduce change level so that future sets can resume
    this._kvo_changeLevel = (this._kvo_changeLevel || 1) - 1;

    if (log) SC.KVO_SPACES = spaces.slice(0, -2);

    return YES; // finished successfully
  },

  // ..........................................
  // BINDINGS
  //

  /**
    Manually add a new binding to an object.  This is the same as doing
    the more familiar propertyBinding: 'property.path' approach.

    @param {String} toKey the key to bind to
    @param {Object} target target or property path to bind from
    @param {String|Function} method method for target to bind from
    @returns {SC.Binding} new binding instance
  */
  bind: function (toKey, target, method) {
    var binding, pathType;

    //@if(debug)
    // Developer support.
    if (!target) {
      throw new Error("Developer Error: Attempt to bind key `%@` to null or undefined target".fmt(toKey));
    }
    //@endif

    // normalize...
    if (method !== undefined) target = [target, method];

    pathType = typeof target;

    // if a string or array (i.e. tuple) is passed, convert this into a
    // binding.  If a binding default was provided, use that.
    if (pathType === "string" || (pathType === "object" && (target instanceof Array))) {
      binding = this[toKey + 'BindingDefault'] || SC.Binding;
      binding = binding.beget().from(target);
    } else {
      // If a binding object was provided, clone it so that it gets
      // connected again if the original example binding was already
      // connected.
      binding = target.beget();
    }

    // finish configuring the binding and then connect it.
    binding = binding.to(toKey, this).connect();
    this.bindings.push(binding);

    return binding;
  },

  /**
    didChangeFor allows you to determine if a property has changed since the
    last time the method was called. You must pass a unique context as the
    first parameter (so didChangeFor can identify which method is calling it),
    followed by a list of keys that should be checked for changes.

    For example, in your render method you might pass the following context:
    if (this.didChangeFor('render','height','width')) {
       // Only render if changed
    }

    In your view's update method, you might instead pass 'update':

    if (this.didChangeFor('update', 'height', 'width')) {
      // Only update height and width properties
    }

    This method works by comparing property revision counts. Every time a
    property changes, an internal counter is incremented. When didChangeFor is
    invoked, the current revision count of the property is compared to the
    revision count from the last time this method was called.

    @param {String|Object} context a unique identifier
    @param {String…} propertyNames one or more property names
  */
  didChangeFor: function (context) {
    var valueCache, revisionCache, seenValues, seenRevisions, ret,
        currentRevision, idx, key, value;
    context = SC.hashFor(context); // get a hash key we can use in caches.

    // setup caches...
    valueCache = this._kvo_didChange_valueCache;
    if (!valueCache) valueCache = this._kvo_didChange_valueCache = {};
    revisionCache = this._kvo_didChange_revisionCache;
    if (!revisionCache) revisionCache = this._kvo_didChange_revisionCache = {};

    // get the cache of values and revisions already seen in this context
    seenValues = valueCache[context] || {};
    seenRevisions = revisionCache[context] || {};

    // prepare too loop!
    ret = false;
    currentRevision = this._kvo_revision || 0;
    idx = arguments.length;
    while (--idx >= 1) {  // NB: loop only to 1 to ignore context arg.
      key = arguments[idx];

      // has the kvo revision changed since the last time we did this?
      if (seenRevisions[key] != currentRevision) {
        // yes, check the value with the last seen value
        value = this.get(key);
        if (seenValues[key] !== value) {
          ret = true; // did change!
          seenValues[key] = value;
        }
      }
      seenRevisions[key] = currentRevision;
    }

    valueCache[context] = seenValues;
    revisionCache[context] = seenRevisions;
    return ret;
  },

  /**
    Sets the property only if the passed value is different from the
    current value.  Depending on how expensive a get() is on this property,
    this may be more efficient.

    NOTE: By default, the set() method will not set the value unless it has
    changed. However, this check can skipped by setting .property().idempotent(NO)
    setIfChanged() may be useful in this case.

    @param {String|Hash} key the key to change
    @param {Object} value the value to change
    @returns {SC.Observable}
  */
  setIfChanged: function (key, value) {
    if (value === undefined && SC.typeOf(key) === SC.T_HASH) {
      var hash = key;

      for (key in hash) {
        if (!hash.hasOwnProperty(key)) continue;
        this.setIfChanged(key, hash[key]);
      }

      return this;
    }

    return (this.get(key) !== value) ? this.set(key, value) : this;
  },

  /**
    Navigates the property path, returning the value at that point.

    If any object in the path is undefined, returns undefined.
    @param {String} path The property path you want to retrieve
  */
  getPath: function (path) {
    var tuple = SC.tupleForPropertyPath(path, this);
    if (tuple === null || tuple[0] === null) return undefined;
    return SC.get(tuple[0], tuple[1]);
  },

  /**
    Navigates the property path, finally setting the value.

    @param {String} path the property path to set
    @param {Object} value the value to set
    @returns {SC.Observable}
  */
  setPath: function (path, value) {
    if (path.indexOf('.') >= 0) {
      var tuple = SC.tupleForPropertyPath(path, this);
      if (!tuple || !tuple[0]) return null;
      tuple[0].set(tuple[1], value);
    } else this.set(path, value); // shortcut
    return this;
  },

  /**
    Navigates the property path, finally setting the value but only if
    the value does not match the current value.  This will avoid sending
    unnecessary change notifications.

    @param {String} path the property path to set
    @param {Object} value the value to set
    @returns {Object} this
  */
  setPathIfChanged: function (path, value) {
    if (path.indexOf('.') >= 0) {
      var tuple = SC.tupleForPropertyPath(path, this);
      if (!tuple || !tuple[0]) return null;
      if (tuple[0].get(tuple[1]) !== value) {
        tuple[0].set(tuple[1], value);
      }
    } else this.setIfChanged(path, value); // shortcut
    return this;
  },

  /**
    Convenience method to get an array of properties.

    Pass in multiple property keys or an array of property keys.  This
    method uses getPath() so you can also pass key paths.

    @returns {Array} Values of property keys.
  */
  getEach: function () {
    var keys = SC.A(arguments),
      ret = [], idx, idxLen;

    for (idx = 0, idxLen = keys.length; idx < idxLen; idx++) {
      ret[ret.length] = this.getPath(keys[idx]);
    }
    return ret;
  },


  /**
    Increments the value of a property.

    @param {String} key property name
    @param {Number} increment the amount to increment (optional)
    @returns {Number} new value of property
  */
  incrementProperty: function (key, increment) {
    if (!increment) increment = 1;
    this.set(key, (this.get(key) || 0) + increment);
    return this.get(key);
  },

  /**
    Decrements the value of a property.

    @param {String} key property name
    @param {Number} increment the amount to decrement (optional)
    @returns {Number} new value of property
  */
  decrementProperty: function (key, increment) {
    if (!increment) increment = 1;
    this.set(key, (this.get(key) || 0) - increment);
    return this.get(key);
  },

  /**
    Inverts a property.  Property should be a bool.

    @param {String} key property name
    @param {Object} value optional parameter for "true" value
    @param {Object} alt optional parameter for "false" value
    @returns {Object} new value
  */
  toggleProperty: function (key, value, alt) {
    if (value === undefined) value = true;
    if (alt === undefined) alt = false;
    value = (this.get(key) == value) ? alt : value;
    this.set(key, value);
    return this.get(key);
  },

  /**
    Convenience method to call propertyWillChange/propertyDidChange.

    Sometimes you need to notify observers that a property has changed value
    without actually changing this value.  In those cases, you can use this
    method as a convenience instead of calling propertyWillChange() and
    propertyDidChange().

    @param {String} key The property key that has just changed.
    @param {Object} value The new value of the key.  May be null.
    @returns {SC.Observable}
  */
  notifyPropertyChange: function (key, value) {
    this.propertyWillChange(key);
    this.propertyDidChange(key, value);
    return this;
  },

  /**
    Notifies observers of all possible property changes.

    Sometimes when you make a major update to your object, it is cheaper to
    simply notify all observers that their property might have changed than
    to figure out specifically which properties actually did change.

    In those cases, you can simply call this method to notify all property
    observers immediately.  Note that this ignores property groups.

    @returns {SC.Observable}
  */
  allPropertiesDidChange: function () {
    this._kvo_cache = null; //clear cached props
    this._notifyPropertyObservers('*');
    return this;
  },

  /**
    Allows you to inspect a property for changes. Whenever the named property
    changes, a log will be printed to the console. This (along with removeProbe)
    are convenience methods meant for debugging purposes.

    @param {String} key The name of the property you want probed for changes
  */
  addProbe: function (key) { this.addObserver(key, SC.logChange); },

  /**
    Stops a running probe from observing changes to the observer.

    @param {String} key The name of the property you want probed for changes
  */
  removeProbe: function (key) { this.removeObserver(key, SC.logChange); },

  /**
    Logs the named properties to the console.

    @param {String...} propertyNames one or more property names
  */
  logProperty: function () {
    var props = SC.$A(arguments),
        prop, propsLen, idx;
    for (idx = 0, propsLen = props.length; idx < propsLen; idx++) {
      prop = props[idx];
      console.log('%@:%@: '.fmt(SC.guidFor(this), prop), this.get(prop));
    }
  },

  propertyRevision: 1

};

/** @private used by addProbe/removeProbe */
SC.logChange = function logChange(target, key, value) {
  console.log("CHANGE: %@[%@] => %@".fmt(target, key, target.get(key)));
};

/**
  Retrieves a property from an object, using get() if the
  object implements SC.Observable.

  @param  {Object}  object  the object to query
  @param  {String}  key the property to retrieve
*/
SC.mixin(SC, {
  get: function (object, key) {
    if (!object) return undefined;
    if (key === undefined) return this[object];
    if (object.get) return object.get(key);
    return object[key];
  },

  /**
    Retrieves a property from an object at a specified path, using get() if
    the object implements SC.Observable.

    @param  {Object}  object  the object to query
    @param  {String}  path the path to the property to retrieve
  */
  getPath: function (object, path) {
    if (path === undefined) {
      path = object;
      object = window;
    }
    return SC.objectForPropertyPath(path, object);
  }
});

// Make all Array's observable
SC.mixin(Array.prototype, SC.Observable);
