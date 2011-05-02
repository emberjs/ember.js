// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/system/function');
require('sproutcore-runtime/system/object');

/**
  Debug parameter you can turn on.  This will log all bindings that fire to
  the console.  This should be disabled in production code.  Note that you
  can also enable this from the console or temporarily.

  @property {Boolean}
*/
SC.LOG_BINDINGS = NO ;

/**
  Performance paramter.  This will benchmark the time spent firing each
  binding.

  @property {Boolean}
*/
SC.BENCHMARK_BINDING_NOTIFICATIONS = NO ;

/**
  Performance parameter.  This will benchmark the time spend configuring each
  binding.

  @property {Boolean}
*/
SC.BENCHMARK_BINDING_SETUP = NO;

/**
  Default placeholder for multiple values in bindings.

  @property {String}
*/
SC.MULTIPLE_PLACEHOLDER = '@@MULT@@' ;

/**
  Default placeholder for null values in bindings.

  @property {String}
*/
SC.NULL_PLACEHOLDER = '@@NULL@@' ;

/**
  Default placeholder for empty values in bindings.

  @property {String}
*/
SC.EMPTY_PLACEHOLDER = '@@EMPTY@@' ;


/**
  @class

  A binding simply connects the properties of two objects so that whenever the
  value of one property changes, the other property will be changed also.  You
  do not usually work with Binding objects directly but instead describe
  bindings in your class definition using something like:

        valueBinding: "MyApp.someController.title"

  This will create a binding from "MyApp.someController.title" to the "value"
  property of your object instance automatically.  Now the two values will be
  kept in sync.

  Customizing Your Bindings
  ===

  In addition to synchronizing values, bindings can also perform some basic
  transforms on values.  These transforms can help to make sure the data fed
  into one object always meets the expectations of that object regardless of
  what the other object outputs.

  To customize a binding, you can use one of the many helper methods defined
  on SC.Binding like so:

        valueBinding: SC.Binding.single("MyApp.someController.title")

  This will create a binding just like the example above, except that now the
  binding will convert the value of MyApp.someController.title to a single
  object (removing any arrays) before applying it to the "value" property of
  your object.

  You can also chain helper methods to build custom bindings like so:

        valueBinding: SC.Binding.single("MyApp.someController.title").notEmpty("(EMPTY)")

  This will force the value of MyApp.someController.title to be a single value
  and then check to see if the value is "empty" (null, undefined, empty array,
  or an empty string).  If it is empty, the value will be set to the string
  "(EMPTY)".

  One Way Bindings
  ===

  One especially useful binding customization you can use is the oneWay()
  helper.  This helper tells SproutCore that you are only interested in
  receiving changes on the object you are binding from.  For example, if you
  are binding to a preference and you want to be notified if the preference
  has changed, but your object will not be changing the preference itself, you
  could do:

        bigTitlesBinding: SC.Binding.oneWay("MyApp.preferencesController.bigTitles")

  This way if the value of MyApp.preferencesController.bigTitles changes the
  "bigTitles" property of your object will change also.  However, if you
  change the value of your "bigTitles" property, it will not update the
  preferencesController.

  One way bindings are almost twice as fast to setup and twice as fast to
  execute because the binding only has to worry about changes to one side.

  You should consider using one way bindings anytime you have an object that
  may be created frequently and you do not intend to change a property; only
  to monitor it for changes. (such as in the example above).

  Adding Custom Transforms
  ===

  In addition to using the standard helpers provided by SproutCore, you can
  also defined your own custom transform functions which will be used to
  convert the value.  To do this, just define your transform function and add
  it to the binding with the transform() helper.  The following example will
  not allow Integers less than ten.  Note that it checks the value of the
  bindings and allows all other values to pass:

        valueBinding: SC.Binding.transform(function(value, binding) {
          return ((SC.typeOf(value) === SC.T_NUMBER) && (value < 10)) ? 10 : value;
        }).from("MyApp.someController.value")

  If you would like to instead use this transform on a number of bindings,
  you can also optionally add your own helper method to SC.Binding.  This
  method should simply return the value of this.transform(). The example
  below adds a new helper called notLessThan() which will limit the value to
  be not less than the passed minimum:

      SC.Binding.notLessThan = function(minValue) {
        return this.transform(function(value, binding) {
          return ((SC.typeOf(value) === SC.T_NUMBER) && (value < minValue)) ? minValue : value ;
        }) ;
      } ;

  You could specify this in your core.js file, for example.  Then anywhere in
  your application you can use it to define bindings like so:

        valueBinding: SC.Binding.from("MyApp.someController.value").notLessThan(10)

  Also, remember that helpers are chained so you can use your helper along with
  any other helpers.  The example below will create a one way binding that
  does not allow empty values or values less than 10:

        valueBinding: SC.Binding.oneWay("MyApp.someController.value").notEmpty().notLessThan(10)

  Note that the built in helper methods all allow you to pass a "from"
  property path so you don't have to use the from() helper to set the path.
  You can do the same thing with your own helper methods if you like, but it
  is not required.

  Creating Custom Binding Templates
  ===

  Another way you can customize bindings is to create a binding template.  A
  template is simply a binding that is already partially or completely
  configured.  You can specify this template anywhere in your app and then use
  it instead of designating your own custom bindings.  This is a bit faster on
  app startup but it is mostly useful in making your code less verbose.

  For example, let's say you will be frequently creating one way, not empty
  bindings that allow values greater than 10 throughout your app.  You could
  create a binding template in your core.js like this:

        MyApp.LimitBinding = SC.Binding.oneWay().notEmpty().notLessThan(10);

  Then anywhere you want to use this binding, just refer to the template like
  so:

        valueBinding: MyApp.LimitBinding.beget("MyApp.someController.value")

  Note that when you use binding templates, it is very important that you
  always start by using beget() to extend the template.  If you do not do
  this, you will end up using the same binding instance throughout your app
  which will lead to erratic behavior.

  How to Manually Activate a Binding
  ===

  All of the examples above show you how to configure a custom binding, but
  the result of these customizations will be a binding template, not a fully
  active binding.  The binding will actually become active only when you
  instantiate the object the binding belongs to.  It is useful however, to
  understand what actually happens when the binding is activated.

  For a binding to function it must have at least a "from" property and a "to"
  property.  The from property path points to the object/key that you want to
  bind from while the to path points to the object/key you want to bind to.

  When you define a custom binding, you are usually describing the property
  you want to bind from (such as "MyApp.someController.value" in the examples
  above).  When your object is created, it will automatically assign the value
  you want to bind "to" based on the name of your binding key.  In the
  examples above, during init, SproutCore objects will effectively call
  something like this on your binding:

        binding = this.valueBinding.beget().to("value", this) ;

  This creates a new binding instance based on the template you provide, and
  sets the to path to the "value" property of the new object.  Now that the
  binding is fully configured with a "from" and a "to", it simply needs to be
  connected to become active.  This is done through the connect() method:

        binding.connect() ;

  Now that the binding is connected, it will observe both the from and to side
  and relay changes.

  If you ever needed to do so (you almost never will, but it is useful to
  understand this anyway), you could manually create an active binding by
  doing the following:

        SC.Binding.from("MyApp.someController.value")
         .to("MyApp.anotherObject.value")
         .connect();

  You could also use the bind() helper method provided by SC.Object. (This is
  the same method used by SC.Object.init() to setup your bindings):

        MyApp.anotherObject.bind("value", "MyApp.someController.value") ;

  Both of these code fragments have the same effect as doing the most friendly
  form of binding creation like so:


        MyApp.anotherObject = SC.Object.create({
          valueBinding: "MyApp.someController.value",

          // OTHER CODE FOR THIS OBJECT...

        }) ;

  SproutCore's built in binding creation method make it easy to automatically
  create bindings for you.  You should always use the highest-level APIs
  available, even if you understand how to it works underneath.

  @since SproutCore 1.0
*/
SC.Binding = /** @scope SC.Binding.prototype */{

  /**
    This is the core method you use to create a new binding instance.  The
    binding instance will have the receiver instance as its parent which means
    any configuration you have there will be inherited.

    The returned instance will also have its parentBinding property set to the
    receiver.

    @param {String} fromPath optional from path.
    @returns {SC.Binding} new binding instance
  */
  beget: function(fromPath) {
    var ret = SC.beget(this) ;
    ret.parentBinding = this;
    if (fromPath !== undefined) ret = ret.from(fromPath) ;
    return ret ;
  },

  /**
    Returns a builder function for compatibility.
  */
  builder: function() {
    var binding = this,
        ret = function(fromProperty) { return binding.beget().from(fromProperty); };
    ret.beget = function() { return binding.beget(); } ;
    return ret ;
  },

  /**
    This will set "from" property path to the specified value.  It will not
    attempt to resolve this property path to an actual object/property tuple
    until you connect the binding.

    The binding will search for the property path starting at the root level
    unless you specify an alternate root object as the second paramter to this
    method.  Alternatively, you can begin your property path with either "." or
    "*", which will use the root object of the to side be default.  This special
    behavior is used to support the high-level API provided by SC.Object.

    @param {String|Tuple} propertyPath A property path or tuple
    @param {Object} root optional root object to use when resolving the path.
    @returns {SC.Binding} this
  */
  from: function(propertyPath, root) {

    // if the propertyPath is null/undefined, return this.  This allows the
    // method to be called from other methods when the fromPath might be
    // optional. (cf single(), multiple())
    if (!propertyPath) return this ;

    // beget if needed.
    var binding = (this === SC.Binding) ? this.beget() : this ;
    binding._fromPropertyPath = propertyPath ;
    binding._fromRoot = root ;
    binding._fromTuple = null ;
    return binding ;
  },

  /**
   This will set the "to" property path to the specified value.  It will not
   attempt to reoslve this property path to an actual object/property tuple
   until you connect the binding.

    @param {String|Tuple} propertyPath A property path or tuple
    @param {Object} root optional root object to use when resolving the path.
    @returns {SC.Binding} this
  */
  to: function(propertyPath, root) {
    // beget if needed.
    var binding = (this === SC.Binding) ? this.beget() : this ;
    binding._toPropertyPath = propertyPath ;
    binding._toRoot = root ;
    binding._toTuple = null ; // clear out any existing one.
    return binding ;
  },

  /**
    Attempts to connect this binding instance so that it can receive and relay
    changes.  This method will raise an exception if you have not set the
    from/to properties yet.

    @returns {SC.Binding} this
  */
  connect: function() {
    // If the binding is already connected, do nothing.
    if (this.isConnected) return this ;
    this.isConnected = YES ;
    this._connectionPending = YES ; // its connected but not really...
    this._syncOnConnect = YES ;

    SC.Binding._connectQueue.add(this) ;

    if (!SC.RunLoop.isRunLoopInProgress()) {
      this._scheduleSync();
    }

    return this;
  },

  /** @private
    Actually connects the binding.  This is done at the end of the runloop
    to give you time to setup your entire object graph before the bindings
    try to activate.
  */
  _connect: function() {
    if (!this._connectionPending) return; //nothing to do
    this._connectionPending = NO ;

    var path, root,
        bench = SC.BENCHMARK_BINDING_SETUP;

    if (bench) SC.Benchmark.start("SC.Binding.connect()");

    // try to connect the from side.
    // as a special behavior, if the from property path begins with either a
    // . or * and the fromRoot is null, use the toRoot instead.  This allows
    // for support for the SC.Object shorthand:
    //
    // contentBinding: "*owner.value"
    //
    path = this._fromPropertyPath; root = this._fromRoot ;

    if (typeof path === "string") {

      // if the first character is a '.', this is a static path.  make the
      // toRoot the default root.
      if (path.indexOf('.') === 0) {
        path = path.slice(1);
        if (!root) root = this._toRoot ;

      // if the first character is a '*', then setup a tuple since this is a
      // chained path.
      } else if (path.indexOf('*') === 0) {
        path = [this._fromRoot || this._toRoot, path.slice(1)] ;
        root = null ;
      }
    }
    this._fromObserverData = [path, this, this.fromPropertyDidChange, root];
    SC.Observers.addObserver.apply(SC.Observers, this._fromObserverData);

    // try to connect the to side
    if (!this._oneWay) {
      path = this._toPropertyPath; root = this._toRoot ;
      this._toObserverData = [path, this, this.toPropertyDidChange, root];
      SC.Observers.addObserver.apply(SC.Observers, this._toObserverData);
    }

    if (bench) SC.Benchmark.end("SC.Binding.connect()");

    // now try to sync if needed
    if (this._syncOnConnect) {
      this._syncOnConnect = NO ;
      if (bench) SC.Benchmark.start("SC.Binding.connect().sync");
      this.sync();
      if (bench) SC.Benchmark.end("SC.Binding.connect().sync");
    }
  },

  /**
    Disconnects the binding instance.  Changes will no longer be relayed.  You
    will not usually need to call this method.

    @returns {SC.Binding} this
  */
  disconnect: function() {
    if (!this.isConnected) return this; // nothing to do.

    // if connection is still pending, just cancel
    if (this._connectionPending) {
      this._connectionPending = NO ;

    // connection is completed, disconnect.
    } else {
      SC.Observers.removeObserver.apply(SC.Observers, this._fromObserverData);
      if (!this._oneWay) {
        SC.Observers.removeObserver.apply(SC.Observers, this._toObserverData);
      }
    }

    this.isConnected = NO ;
    return this ;
  },

  /**
    Invoked whenever the value of the "from" property changes.  This will mark
    the binding as dirty if the value has changed.

    @param {Object} target The object that contains the key
    @param {String} key The name of the property which changed
  */
  fromPropertyDidChange: function(target, key) {
    var v = target ? target.get(key) : null;

    //console.log("fromPropertyDidChange: %@ v = %@".fmt(this, v)) ;

    // if the new value is different from the current binding value, then
    // schedule to register an update.
    if (v !== this._bindingValue || key === '[]') {

      this._setBindingValue(target, key) ;
      this._changePending = YES ;
      this._syncOnConnect = NO;
      SC.Binding._changeQueue.add(this) ; // save for later.

      this._scheduleSync();
    }
  },

  /**
    Invoked whenever the value of the "to" property changes.  This will mark the
    binding as dirty only if:

    - the binding is not one way
    - the value does not match the stored transformedBindingValue

    if the value does not match the transformedBindingValue, then it will
    become the new bindingValue.

    @param {Object} target The object that contains the key
    @param {String} key The name of the property which changed
  */
  toPropertyDidChange: function(target, key) {
    if (this._oneWay) return; // nothing to do

    var v = target.get(key) ;

    // if the new value is different from the current binding value, then
    // schedule to register an update.
    if (v !== this._transformedBindingValue) {
      this._setBindingValue(target, key) ;
      this._changePending = YES ;
      this._syncOnConnect = NO ;
      SC.Binding._changeQueue.add(this) ; // save for later.

      this._scheduleSync();
    }
  },

  _scheduleSync: function() {
    if (SC.RunLoop.isRunLoopInProgress() || this._syncScheduled) { return; }

    this._syncScheduled = YES;
    var self = this;

    setTimeout(function() { SC.run(); self._syncScheduled = NO; }, 1);
  },

  /** @private
    Saves the source location for the binding value.  This will be used later
    to actually update the binding value.
  */
  _setBindingValue: function(source, key) {
    this._bindingSource = source;
    this._bindingKey    = key;
  },

  /** @private
    Updates the binding value from the current binding source if needed.  This
    should be called just before using this._bindingValue.
  */
  _computeBindingValue: function() {
    var source = this._bindingSource,
        key    = this._bindingKey,
        val, transformedVal, idx;

    val = source ? source.getPath(key) : null;

    // apply any transforms to get the to property value also
    var transforms = this._transforms;
    transformedVal = val;

    if (transforms) {
      var len = transforms.length,
          transform;
      for(idx=0;idx<len;idx++) {
        transform = transforms[idx] ;
        transformedVal = transform(transformedVal, this) ;
      }
    }

    if (transformedVal === this._transformedBindingValue) {
      return false;
    }

    this._bindingValue = val;
    this._transformedBindingValue = transformedVal;
  },

  _connectQueue: SC.CoreSet.create(),
  _alternateConnectQueue: SC.CoreSet.create(),
  _changeQueue: SC.CoreSet.create(),
  _alternateChangeQueue: SC.CoreSet.create(),
  _changePending: NO,

  /**
    Call this method on SC.Binding to flush all bindings with changed pending.

    @returns {Boolean} YES if changes were flushed.
  */
  flushPendingChanges: function() {

    // don't allow flushing more than one at a time
    if (this._isFlushing) return NO;
    this._isFlushing = YES ;
    SC.Observers.suspendPropertyObserving();

    var didFlush = NO,
        log = SC.LOG_BINDINGS,
        // connect any bindings
        queue, binding ;
    while((queue = this._connectQueue).length >0) {
      this._connectQueue = this._alternateConnectQueue ;
      this._alternateConnectQueue = queue ;
      while(binding = queue.pop()) binding._connect() ;
    }

    // loop through the changed queue...
    while ((queue = this._changeQueue).length > 0) {
      if (log) SC.Logger.log("Begin: Trigger changed bindings") ;

      didFlush = YES ;

      // first, swap the change queues.  This way any binding changes that
      // happen while we flush the current queue can be queued up.
      this._changeQueue = this._alternateChangeQueue ;
      this._alternateChangeQueue = queue ;

      // next, apply any bindings in the current queue.  This may cause
      // additional bindings to trigger, which will end up in the new active
      // queue.
      while(binding = queue.pop()) binding.applyBindingValue() ;

      // now loop back and see if there are additional changes pending in the
      // active queue.  Repeat this until all bindings that need to trigger
      // have triggered.
      if (log) SC.Logger.log("End: Trigger changed bindings") ;
    }

    // clean up
    this._isFlushing = NO ;
    SC.Observers.resumePropertyObserving();

    return didFlush ;
  },

  /**
    This method is called at the end of the Run Loop to relay the changed
    binding value from one side to the other.
  */
  applyBindingValue: function() {
    this._changePending = NO ;

    // compute the binding targets if needed.
    this._computeBindingTargets() ;
    if(this._computeBindingValue() === false) { return; }

    var v = this._bindingValue,
        tv = this._transformedBindingValue,
        bench = SC.BENCHMARK_BINDING_NOTIFICATIONS,
        log = SC.LOG_BINDINGS ;

    // the from property value will always be the binding value, update if
    // needed.
    if (!this._oneWay && this._fromTarget) {
      if (log) SC.Logger.log("%@: %@ -> %@".fmt(this, v, tv)) ;
      if (bench) SC.Benchmark.start(this.toString() + "->") ;
      this._fromTarget.setPath(this._fromPropertyKey, v) ;
      if (bench) SC.Benchmark.end(this.toString() + "->") ;
    }

    // update the to value with the transformed value if needed.
    if (this._toTarget) {
      if (log) SC.Logger.log("%@: %@ <- %@".fmt(this, v, tv)) ;
      if (bench) SC.Benchmark.start(this.toString() + "<-") ;
      this._toTarget.setPath(this._toPropertyKey, tv) ;
      if (bench) SC.Benchmark.start(this.toString() + "<-") ;
    }
  },

  /**
    Calling this method on a binding will cause it to check the value of the
    from side of the binding matches the current expected value of the
    binding. If not, it will relay the change as if the from side's value has
    just changed.

    This method is useful when you are dynamically connecting bindings to a
    network of objects that may have already been initialized.
  */
  sync: function() {

    // do nothing if not connected
    if (!this.isConnected) return this;

    // connection is pending, just note that we should sync also
    if (this._connectionPending) {
      this._syncOnConnect = YES ;

    // we are connected, go ahead and sync
    } else {
      this._computeBindingTargets() ;
      var target = this._fromTarget,
          key = this._fromPropertyKey ;
      if (!target || !key) return this ; // nothing to do

      // in debug, let's check for whether target is a valid observable with getPath.
      // Common cases might have it be a Window or a DOM object.
      //
      // If we have a target, it is ready, but if it is invalid, that is WRONG.
      //
      // @if (debug)
      if (!target.isObservable) {
        SC.Logger.warn("Cannot bind '%@' to property '%@' on non-observable '%@'".fmt(this._toPropertyPath, key, target));
        return this;
      }
      // @endif

      // get the new value
      var v = target.getPath(key) ;

      // if the new value is different from the current binding value, then
      // schedule to register an update.
      if (v !== this._bindingValue || key === '[]') {
        this._setBindingValue(target, key) ;
        this._changePending = YES ;
        SC.Binding._changeQueue.add(this) ; // save for later.
      }
    }

    return this ;
  },

  // set if you call sync() when the binding connection is still pending.
  _syncOnConnect: NO,

  _computeBindingTargets: function() {
    if (!this._fromTarget) {

      var path, root, tuple ;

      // if the fromPropertyPath begins with a . or * then we may use the
      // toRoot as the root object.  Similar code exists in connect() so if
      // you make a change to one be sure to update the other.
      path = this._fromPropertyPath; root = this._fromRoot ;
      if (typeof path === "string") {

        // static path beginning with the toRoot
        if (path.indexOf('.') === 0) {
          path = path.slice(1) ; // remove the .
          if (!root) root = this._toRoot; // use the toRoot optionally

        // chained path beginning with toRoot.  Setup a tuple
        } else if (path.indexOf('*') === 0) {
          path = [root || this._toRoot, path.slice(1)];
          root = null ;
        }
      }

      tuple = SC.tupleForPropertyPath(path, root) ;
      if (tuple) {
        this._fromTarget = tuple[0]; this._fromPropertyKey = tuple[1] ;
      }
    }

    if (!this._toTarget) {
      path = this._toPropertyPath; root = this._toRoot ;
      tuple = SC.tupleForPropertyPath(path, root) ;
      if (tuple) {
        this._toTarget = tuple[0]; this._toPropertyKey = tuple[1] ;
      }
    }
  },

  /**
    Configures the binding as one way.  A one-way binding will relay changes
    on the "from" side to the "to" side, but not the other way around.  This
    means that if you change the "to" side directly, the "from" side may have
    a different value.

    @param {String} fromPath optional from path to connect.
    @param {Boolean} aFlag Optionally pass NO to set the binding back to two-way
    @returns {SC.Binding} this
  */
  oneWay: function(fromPath, aFlag) {

    // If fromPath is a bool but aFlag is undefined, swap.
    if ((aFlag === undefined) && (SC.typeOf(fromPath) === SC.T_BOOL)) {
      aFlag = fromPath; fromPath = null ;
    }

    // beget if needed.
    var binding = this.from(fromPath) ;
    if (binding === SC.Binding) binding = binding.beget() ;
    binding._oneWay = (aFlag === undefined) ? YES : aFlag ;
    return binding ;
  },

  /**
    Adds the specified transform function to the array of transform functions.

    The function you pass must have the following signature:

          function(value) {} ;

    It must return the transformed value.

    Transform functions are chained, so they are called in order.  If you are
    extending a binding and want to reset the transforms, you can call
    resetTransform() first.

    @param {Function} transformFunc the transform function.
    @returns {SC.Binding} this
  */
  transform: function(transformFunc) {
    var binding = (this === SC.Binding) ? this.beget() : this ;
    var t = binding._transforms ;

    // clone the transform array if this comes from the parent
    if (t && (t === binding.parentBinding._transform)) {
      t = binding._transforms = t.slice() ;
    }

    // create the transform array if needed.
    if (!t) t = binding._transforms = [] ;

    // add the transform function
    t.push(transformFunc) ;
    return binding;
  },

  /**
    Resets the transforms for the binding.  After calling this method the
    binding will no longer transform values.  You can then add new transforms
    as needed.

    @returns {SC.Binding} this
  */
  resetTransforms: function() {
    var binding = (this === SC.Binding) ? this.beget() : this ;
    binding._transforms = null ; return binding ;
  },

  /**
    Adds a transform to the chain that will allow only single values to pass.
    This will allow single values and nulls to pass through. If you pass an
    array, it will be mapped as so:

          [] => null
          [a] => a
          [a,b,c] => Multiple Placeholder

    You can pass in an optional multiple placeholder or it will use the
    default.

    Note that this transform will only happen on forwarded valued.  Reverse
    values are send unchanged.

    @param {String} fromPath from path or null
    @param {Object} placeholder optional placeholder value.
    @returns {SC.Binding} this
  */
  single: function(fromPath, placeholder) {
    if (placeholder === undefined) {
      placeholder = SC.MULTIPLE_PLACEHOLDER ;
    }
    return this.from(fromPath).transform(function(value, isForward) {
      if (value && value.isEnumerable) {
        var len = value.get('length');
        value = (len>1) ? placeholder : (len<=0) ? null : value.firstObject();
      }
      return value ;
    }) ;
  },

  /**
    Adds a transform that will return the placeholder value if the value is
    null, undefined, an empty array or an empty string.  See also notNull().

    @param {String} fromPath from path or null
    @param {Object} placeholder optional placeholder.
    @returns {SC.Binding} this
  */
  notEmpty: function(fromPath, placeholder) {
    if (placeholder === undefined) placeholder = SC.EMPTY_PLACEHOLDER ;
    return this.from(fromPath).transform(function(value, isForward) {
      if (SC.none(value) || (value === '') || (SC.isArray(value) && value.length === 0)) {
        value = placeholder ;
      }
      return value ;
    }) ;
  },

  /**
    Adds a transform that will return the placeholder value if the value is
    null or undefined.  Otherwise it will passthrough untouched.  See also notEmpty().

    @param {String} fromPath from path or null
    @param {Object} placeholder optional placeholder;
    @returns {SC.Binding} this
  */
  notNull: function(fromPath, placeholder) {
    if (placeholder === undefined) placeholder = SC.EMPTY_PLACEHOLDER ;
    return this.from(fromPath).transform(function(value, isForward) {
      if (SC.none(value)) value = placeholder ;
      return value ;
    }) ;
  },

  /**
    Adds a transform that will convert the passed value to an array.  If
    the value is null or undefined, it will be converted to an empty array.

    @param {String} fromPath optional from path
    @returns {SC.Binding} this
  */
  multiple: function(fromPath) {
    return this.from(fromPath).transform(function(value) {
      if (!SC.isArray(value)) value = (value == null) ? [] : [value] ;
      return value ;
    }) ;
  },

  /**
    Adds a transform to convert the value to a bool value.  If the value is
    an array it will return YES if array is not empty.  If the value is a string
    it will return YES if the string is not empty.

    @param {String} fromPath optional from path
    @returns {SC.Binding} this
  */
  bool: function(fromPath) {
    return this.from(fromPath).transform(function(v) {
      var t = SC.typeOf(v) ;
      return (t == SC.T_ARRAY) ? (v.length > 0) : (v === '') ? NO : !!v ;
    }) ;
  },

  /**
    Adds a transform that forwards the logical 'AND' of values at 'pathA' and
    'pathB' whenever either source changes.  Note that the transform acts strictly
    as a one-way binding, working only in the direction

      'pathA' AND 'pathB' --> value  (value returned is the result of ('pathA' && 'pathB'))

    Usage example where a delete button's 'isEnabled' value is determined by whether
    something is selected in a list and whether the current user is allowed to delete:

      deleteButton: SC.ButtonView.design({
        isEnabledBinding: SC.Binding.and('MyApp.itemsController.hasSelection', 'MyApp.userController.canDelete')
      })

    @param {String} pathA The first part of the conditional
    @param {String} pathB The second part of the conditional
  */
  and: function(pathA, pathB) {

    // create an object to do the logical computation
    var gate = SC.Object.create({
      valueABinding: pathA,
      valueBBinding: pathB,

      and: SC.Function.property(function() {
        return (this.get('valueA') && this.get('valueB'));
      }, ['valueA', 'valueB'], { cacheable: true })
    });

    // add a transform that depends on the result of that computation.
    return this.from('and', gate).oneWay();
  },

  /**
    Adds a transform that forwards the 'OR' of values at 'pathA' and
    'pathB' whenever either source changes.  Note that the transform acts strictly
    as a one-way binding, working only in the direction

      'pathA' AND 'pathB' --> value  (value returned is the result of ('pathA' || 'pathB'))

    @param {String} pathA The first part of the conditional
    @param {String} pathB The second part of the conditional
  */
  or: function(pathA, pathB) {

    // create an object to the logical computation
    var gate = SC.Object.create({
      valueABinding: pathA,
      valueBBinding: pathB,

      or: SC.Function.property(function() {
        return (this.get('valueA') || this.get('valueB'));
      }, ['valueA', 'valueB'], { cacheable: true })
    });

    return this.from('or', gate).oneWay();
  },

  /**
    Adds a transform to convert the value to the inverse of a bool value.  This
    uses the same transform as bool() but inverts it.

    @param {String} fromPath optional from path
    @returns {SC.Binding} this
  */
  not: function(fromPath) {
    return this.from(fromPath).transform(function(v) {
      var t = SC.typeOf(v) ;
      return !((t == SC.T_ARRAY) ? (v.length > 0) : (v === '') ? NO : !!v) ;
    }) ;
  },

  /**
    Adds a transform that will return YES if the value is null or undefined, NO otherwise.

    @param {String} fromPath optional from path
    @returns {SC.Binding} this
  */
  isNull: function(fromPath) {
    return this.from(fromPath).transform(function(v) {
      var t = SC.typeOf(v) ;
      return SC.none(v) ;
    });
  },

  toString: function() {
    var from = this._fromRoot ? "<%@>:%@".fmt(this._fromRoot,this._fromPropertyPath) : this._fromPropertyPath;

    var to = this._toRoot ? "<%@>:%@".fmt(this._toRoot,this._toPropertyPath) : this._toPropertyPath;

    var oneWay = this._oneWay ? '[oneWay]' : '';
    return "SC.Binding%@(%@ -> %@)%@".fmt(SC.guidFor(this), from, to, oneWay);
  }
} ;

/**
  Shorthand method to define a binding.  This is the same as calling:

        SC.binding(path) = SC.Binding.from(path)
*/
SC.binding = function(path, root) { return SC.Binding.from(path,root); } ;

