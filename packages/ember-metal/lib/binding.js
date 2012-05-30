// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core'); // Ember.Logger
require('ember-metal/accessors'); // get, getPath, setPath, trySetPath
require('ember-metal/utils'); // guidFor, isArray, meta
require('ember-metal/observer'); // addObserver, removeObserver
require('ember-metal/run_loop'); // Ember.run.schedule

// ..........................................................
// CONSTANTS
//

/**
  @static

  Debug parameter you can turn on. This will log all bindings that fire to
  the console. This should be disabled in production code. Note that you
  can also enable this from the console or temporarily.

  @type Boolean
  @default false
*/
Ember.LOG_BINDINGS = false || !!Ember.ENV.LOG_BINDINGS;

var get     = Ember.get,
    getPath = Ember.getPath,
    setPath = Ember.setPath,
    guidFor = Ember.guidFor,
    isGlobalPath = Ember.isGlobalPath;


/** @private */
function getPathWithGlobals(obj, path) {
  return getPath(isGlobalPath(path) ? window : obj, path);
}

// ..........................................................
// BINDING
//
/** @private */
var K = function() {};

/** @private */
var Binding = function(toPath, fromPath) {
  this._direction = 'fwd';
  this._from = fromPath;
  this._to   = toPath;
};

K.prototype = Binding.prototype;

Binding.prototype = /** @scope Ember.Binding.prototype */ {
  /**
    This copies the Binding so it can be connected to another object.
    @returns {Ember.Binding}
  */
  copy: function () {
    var copy = new Binding(this._to, this._from);
    if (this._oneWay) {
      copy._oneWay = true;
    }
    return copy;
  },

  // ..........................................................
  // CONFIG
  //

  /**
    This will set "from" property path to the specified value. It will not
    attempt to resolve this property path to an actual object until you
    connect the binding.

    The binding will search for the property path starting at the root object
    you pass when you connect() the binding.  It follows the same rules as
    `getPath()` - see that method for more information.

    @param {String} propertyPath the property path to connect to
    @returns {Ember.Binding} receiver
  */
  from: function(path) {
    this._from = path;
    return this;
  },

  /**
    This will set the "to" property path to the specified value. It will not
    attempt to resolve this property path to an actual object until you
    connect the binding.

    The binding will search for the property path starting at the root object
    you pass when you connect() the binding.  It follows the same rules as
    `getPath()` - see that method for more information.

    @param {String|Tuple} propertyPath A property path or tuple
    @returns {Ember.Binding} this
  */
  to: function(path) {
    this._to = path;
    return this;
  },

  /**
    Configures the binding as one way. A one-way binding will relay changes
    on the "from" side to the "to" side, but not the other way around. This
    means that if you change the "to" side directly, the "from" side may have
    a different value.

    @param {Boolean} flag
      (Optional) passing nothing here will make the binding oneWay.  You can
      instead pass false to disable oneWay, making the binding two way again.

    @returns {Ember.Binding} receiver
  */
  oneWay: function(flag) {
    this._oneWay = flag===undefined ? true : !!flag;
    return this;
  },

  /** @private */
  toString: function() {
    var oneWay = this._oneWay ? '[oneWay]' : '';
    return "Ember.Binding<" + guidFor(this) + ">(" + this._from + " -> " + this._to + ")" + oneWay;
  },

  // ..........................................................
  // CONNECT AND SYNC
  //

  /**
    Attempts to connect this binding instance so that it can receive and relay
    changes. This method will raise an exception if you have not set the
    from/to properties yet.

    @param {Object} obj The root object for this binding.
    @returns {Ember.Binding} this
  */
  connect: function(obj) {
    Ember.assert('Must pass a valid object to Ember.Binding.connect()', !!obj);

    var oneWay = this._oneWay;

    // add an observer on the object to be notified when the binding should be updated
    Ember.addObserver(obj, this._from, this, this.fromDidChange);

    // if the binding is a two-way binding, also set up an observer on the target
    // object.
    if (!oneWay) { Ember.addObserver(obj, this._to, this, this.toDidChange); }

    if (Ember.meta(obj,false).proto !== obj) { this._scheduleSync(obj, 'fwd'); }

    this._readyToSync = true;
    return this;
  },

  /**
    Disconnects the binding instance. Changes will no longer be relayed. You
    will not usually need to call this method.

    @param {Object} obj
      The root object you passed when connecting the binding.

    @returns {Ember.Binding} this
  */
  disconnect: function(obj) {
    Ember.assert('Must pass a valid object to Ember.Binding.disconnect()', !!obj);

    var oneWay = this._oneWay;

    // remove an observer on the object so we're no longer notified of
    // changes that should update bindings.
    Ember.removeObserver(obj, this._from, this, this.fromDidChange);

    // if the binding is two-way, remove the observer from the target as well
    if (!oneWay) Ember.removeObserver(obj, this._to, this, this.toDidChange);

    this._readyToSync = false; // disable scheduled syncs...
    return this;
  },

  // ..........................................................
  // PRIVATE
  //

  /** @private - called when the from side changes */
  fromDidChange: function(target) {
    this._scheduleSync(target, 'fwd');
  },

  /** @private - called when the to side changes */
  toDidChange: function(target) {
    this._scheduleSync(target, 'back');
  },

  /** @private */
  _scheduleSync: function(obj, dir) {
    var guid = guidFor(obj), existingDir = this[guid];

    // if we haven't scheduled the binding yet, schedule it
    if (!existingDir) {
      Ember.run.schedule('sync', this, this._sync, obj);
      this[guid] = dir;
    }

    // If both a 'back' and 'fwd' sync have been scheduled on the same object,
    // default to a 'fwd' sync so that it remains deterministic.
    if (existingDir === 'back' && dir === 'fwd') {
      this[guid] = 'fwd';
    }
  },

  /** @private */
  _sync: function(obj) {
    var log = Ember.LOG_BINDINGS;

    // don't synchronize destroyed objects or disconnected bindings
    if (obj.isDestroyed || !this._readyToSync) { return; }

    // get the direction of the binding for the object we are
    // synchronizing from
    var guid = guidFor(obj), direction = this[guid];

    var fromPath = this._from, toPath = this._to;

    delete this[guid];

    // if we're synchronizing from the remote object...
    if (direction === 'fwd') {
      var fromValue = getPathWithGlobals(obj, this._from);
      if (log) {
        Ember.Logger.log(' ', this.toString(), '->', fromValue, obj);
      }
      if (this._oneWay) {
        Ember.trySetPath(Ember.isGlobalPath(toPath) ? window : obj, toPath, fromValue);
      } else {
        Ember._suspendObserver(obj, toPath, this, this.toDidChange, function () {
          Ember.trySetPath(Ember.isGlobalPath(toPath) ? window : obj, toPath, fromValue);
        });
      }
    // if we're synchronizing *to* the remote object
    } else if (direction === 'back') {// && !this._oneWay) {
      var toValue = getPath(obj, this._to);
      if (log) {
        Ember.Logger.log(' ', this.toString(), '<-', toValue, obj);
      }
      Ember._suspendObserver(obj, fromPath, this, this.fromDidChange, function () {
        Ember.trySetPath(Ember.isGlobalPath(fromPath) ? window : obj, fromPath, toValue);
      });
    }
  }

};

/** @private */
function mixinProperties(to, from) {
  for (var key in from) {
    if (from.hasOwnProperty(key)) {
      to[key] = from[key];
    }
  }
}

mixinProperties(Binding,
/** @scope Ember.Binding */ {

  /**
    @see Ember.Binding.prototype.from
  */
  from: function() {
    var C = this, binding = new C();
    return binding.from.apply(binding, arguments);
  },

  /**
    @see Ember.Binding.prototype.to
  */
  to: function() {
    var C = this, binding = new C();
    return binding.to.apply(binding, arguments);
  },

  /**
    Creates a new Binding instance and makes it apply in a single direction.
    A one-way binding will relay changes on the "from" side object (supplies
    as the `from` argument) the "to" side, but not the other way around.
    This means that if you change the "to" side directly, the "from" side may have
    a different value.

    @param {String} from from path.
    @param {Boolean} [flag] (Optional) passing nothing here will make the binding oneWay.  You can
    instead pass false to disable oneWay, making the binding two way again.

    @see Ember.Binding.prototype.oneWay
  */
  oneWay: function(from, flag) {
    var C = this, binding = new C(null, from);
    return binding.oneWay(flag);
  }

});

/**
  @class

  An Ember.Binding connects the properties of two objects so that whenever the
  value of one property changes, the other property will be changed also.

  ## Automatic Creation of Bindings with `/^*Binding/`-named Properties
  You do not usually create Binding objects directly but instead describe
  bindings in your class or object definition using automatic binding detection.

  Properties ending in a `Binding` suffix will be converted to Ember.Binding instances.
  The value of this property should be a string representing a path to another object or
  a custom binding instanced created using Binding helpers (see "Customizing Your Bindings"):

        valueBinding: "MyApp.someController.title"

  This will create a binding from `MyApp.someController.title` to the `value`
  property of your object instance automatically. Now the two values will be
  kept in sync.

  ## Customizing Your Bindings

  In addition to synchronizing values, bindings can perform  basic transforms on values.
  These transforms can help to make sure the data fed into one object always meets
  the expectations of that object regardless of what the other object outputs.

  To customize a binding, you can use one of the many helper methods defined
  on Ember.Binding:

        valueBinding: Ember.Binding.single("MyApp.someController.title")

  This will create a binding just like the example above, except that now the
  binding will convert the value of `MyApp.someController.title` to a single
  object (by accessing its first element if it's an Array) before applying it
  to the `value` property of your object.

  You can also chain helper methods to build custom bindings:

        valueBinding: Ember.Binding.single("MyApp.someController.title").notEmpty("(EMPTY)")

  This will force the value of MyApp.someController.title to be a single value
  and then check to see if the value is "empty" (null, undefined, empty array,
  or an empty string). If it is empty, the value will be set to the string
  "(EMPTY)".

  The included transforms are: `and`, `bool`, `isNull`, `not`, `notEmpty`, `notNull`, `oneWay`,
  `single`, and `multiple`

  ## One Way Bindings

  One especially useful binding customization you can use is the `oneWay()`
  helper. This helper tells Ember that you are only interested in
  receiving changes on the object you are binding from. For example, if you
  are binding to a preference and you want to be notified if the preference
  has changed, but your object will not be changing the preference itself, you
  could do:

        bigTitlesBinding: Ember.Binding.oneWay("MyApp.preferencesController.bigTitles")

  This way if the value of MyApp.preferencesController.bigTitles changes the
  "bigTitles" property of your object will change also. However, if you
  change the value of your "bigTitles" property, it will not update the
  preferencesController.

  One way bindings are almost twice as fast to setup and twice as fast to
  execute because the binding only has to worry about changes to one side.

  You should consider using one way bindings anytime you have an object that
  may be created frequently and you do not intend to change a property; only
  to monitor it for changes. (such as in the example above).

  ## Adding Custom Transforms

  In addition to using the standard helpers provided by Ember, you can
  also define your own custom transform functions which will be used to
  convert the value. To do this, just define your transform function and add
  it to the binding with the transform() helper. The following example will
  not allow Integers less than ten. Note that it checks the value of the
  bindings and allows all other values to pass:

        valueBinding: Ember.Binding.transform(function(value, object) {
          return ((Ember.typeOf(value) === 'number') && (value < 10)) ? 10 : value;
        }).from("MyApp.someController.value")

  If you would like to instead use this transform on a number of bindings,
  you can also optionally add your own helper method to Ember.Binding. This
  method should return the value of `this.transform()`. The example
  below adds a new helper called `notLessThan()` which will limit the value to
  be not less than the passed minimum:

      Ember.Binding.registerTransform('notLessThan', function(minValue) {
        return this.transform(function(value, object) {
          return ((Ember.typeOf(value) === 'number') && (value < minValue)) ? minValue : value;
        });
      });

  You could specify this in your core.js file, for example. Then anywhere in
  your application you can use it to define bindings like so:

        valueBinding: Ember.Binding.from("MyApp.someController.value").notLessThan(10)

  Also, remember that helpers are chained so you can use your helper along
  with any other helpers. The example below will create a one way binding that
  does not allow empty values or values less than 10:

        valueBinding: Ember.Binding.oneWay("MyApp.someController.value").notEmpty().notLessThan(10)

  Finally, it's also possible to specify bi-directional transforms. To do this,
  you can pass a hash to `transform` with `to` and `from`. In the following
  example, we are expecting a lowercase string that we want to transform to
  uppercase.

        valueBinding: Ember.Binding.from('MyApp.Object.property').transform({
          to:   function(value, object) { return value.toUpperCase(); },
          from: function(value, object) { return value.toLowerCase(); }
        }

  ## How to Manually Add Binding

  All of the examples above show you how to configure a custom binding, but
  the result of these customizations will be a binding template, not a fully
  active Binding instance. The binding will actually become active only when you
  instantiate the object the binding belongs to. It is useful however, to
  understand what actually happens when the binding is activated.

  For a binding to function it must have at least a "from" property and a "to"
  property. The from property path points to the object/key that you want to
  bind from while the to path points to the object/key you want to bind to.

  When you define a custom binding, you are usually describing the property
  you want to bind from (such as "MyApp.someController.value" in the examples
  above). When your object is created, it will automatically assign the value
  you want to bind "to" based on the name of your binding key. In the
  examples above, during init, Ember objects will effectively call
  something like this on your binding:

        binding = Ember.Binding.from(this.valueBinding).to("value");

  This creates a new binding instance based on the template you provide, and
  sets the to path to the "value" property of the new object. Now that the
  binding is fully configured with a "from" and a "to", it simply needs to be
  connected to become active. This is done through the connect() method:

        binding.connect(this);

  Note that when you connect a binding you pass the object you want it to be
  connected to.  This object will be used as the root for both the from and
  to side of the binding when inspecting relative paths.  This allows the
  binding to be automatically inherited by subclassed objects as well.

  Now that the binding is connected, it will observe both the from and to side
  and relay changes.

  If you ever needed to do so (you almost never will, but it is useful to
  understand this anyway), you could manually create an active binding by
  using the Ember.bind() helper method. (This is the same method used by
  to setup your bindings on objects):

        Ember.bind(MyApp.anotherObject, "value", "MyApp.someController.value");

  Both of these code fragments have the same effect as doing the most friendly
  form of binding creation like so:

        MyApp.anotherObject = Ember.Object.create({
          valueBinding: "MyApp.someController.value",

          // OTHER CODE FOR THIS OBJECT...

        });

  Ember's built in binding creation method makes it easy to automatically
  create bindings for you. You should always use the highest-level APIs
  available, even if you understand how it works underneath.

  @since Ember 0.9
*/
Ember.Binding = Binding;

/**
  Global helper method to create a new binding.  Just pass the root object
  along with a to and from path to create and connect the binding.  The new
  binding object will be returned which you can further configure with
  transforms and other conditions.

  @param {Object} obj
    The root object of the transform.

  @param {String} to
    The path to the 'to' side of the binding.  Must be relative to obj.

  @param {String} from
    The path to the 'from' side of the binding.  Must be relative to obj or
    a global path.

  @returns {Ember.Binding} binding instance
*/
Ember.bind = function(obj, to, from) {
  return new Ember.Binding(to, from).connect(obj);
};

Ember.oneWay = function(obj, to, from) {
  return new Ember.Binding(to, from).oneWay().connect(obj);
};
