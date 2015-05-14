import Ember from "ember-metal/core"; // Ember.Logger, Ember.LOG_BINDINGS, assert
import { get } from "ember-metal/property_get";
import { trySet } from "ember-metal/property_set";
import { guidFor } from "ember-metal/utils";
import {
  addObserver,
  removeObserver,
  _suspendObserver
} from "ember-metal/observer";
import run from "ember-metal/run_loop";
import {
  isGlobal as isGlobalPath
} from "ember-metal/path_cache";


// ES6TODO: where is Ember.lookup defined?
/**
@module ember-metal
*/

// ..........................................................
// CONSTANTS
//

/**
  Debug parameter you can turn on. This will log all bindings that fire to
  the console. This should be disabled in production code. Note that you
  can also enable this from the console or temporarily.

  @property LOG_BINDINGS
  @for Ember
  @type Boolean
  @default false
*/
Ember.LOG_BINDINGS = false || !!Ember.ENV.LOG_BINDINGS;

/**
  Returns true if the provided path is global (e.g., `MyApp.fooController.bar`)
  instead of local (`foo.bar.baz`).

  @method isGlobalPath
  @for Ember
  @private
  @param {String} path
  @return Boolean
*/

function getWithGlobals(obj, path) {
  return get(isGlobalPath(path) ? Ember.lookup : obj, path);
}

// ..........................................................
// BINDING
//

function Binding(toPath, fromPath) {
  this._direction = undefined;
  this._from = fromPath;
  this._to   = toPath;
  this._readyToSync = undefined;
  this._oneWay = undefined;
}

/**
@class Binding
@namespace Ember
*/

Binding.prototype = {
  /**
    This copies the Binding so it can be connected to another object.

    @method copy
    @return {Ember.Binding} `this`
  */
  copy() {
    var copy = new Binding(this._to, this._from);
    if (this._oneWay) { copy._oneWay = true; }
    return copy;
  },

  // ..........................................................
  // CONFIG
  //

  /**
    This will set `from` property path to the specified value. It will not
    attempt to resolve this property path to an actual object until you
    connect the binding.

    The binding will search for the property path starting at the root object
    you pass when you `connect()` the binding. It follows the same rules as
    `get()` - see that method for more information.

    @method from
    @param {String} path the property path to connect to
    @return {Ember.Binding} `this`
  */
  from(path) {
    this._from = path;
    return this;
  },

  /**
    This will set the `to` property path to the specified value. It will not
    attempt to resolve this property path to an actual object until you
    connect the binding.

    The binding will search for the property path starting at the root object
    you pass when you `connect()` the binding. It follows the same rules as
    `get()` - see that method for more information.

    @method to
    @param {String|Tuple} path A property path or tuple
    @return {Ember.Binding} `this`
  */
  to(path) {
    this._to = path;
    return this;
  },

  /**
    Configures the binding as one way. A one-way binding will relay changes
    on the `from` side to the `to` side, but not the other way around. This
    means that if you change the `to` side directly, the `from` side may have
    a different value.

    @method oneWay
    @return {Ember.Binding} `this`
  */
  oneWay() {
    this._oneWay = true;
    return this;
  },

  /**
    @method toString
    @return {String} string representation of binding
  */
  toString() {
    var oneWay = this._oneWay ? '[oneWay]' : '';
    return `Ember.Binding<${guidFor(this)}>(${this._from} -> ${this._to})${oneWay}`;
  },

  // ..........................................................
  // CONNECT AND SYNC
  //

  /**
    Attempts to connect this binding instance so that it can receive and relay
    changes. This method will raise an exception if you have not set the
    from/to properties yet.

    @method connect
    @param {Object} obj The root object for this binding.
    @return {Ember.Binding} `this`
  */
  connect(obj) {
    Ember.assert('Must pass a valid object to Ember.Binding.connect()', !!obj);

    var fromPath = this._from;
    var toPath = this._to;
    trySet(obj, toPath, getWithGlobals(obj, fromPath));

    // add an observer on the object to be notified when the binding should be updated
    addObserver(obj, fromPath, this, this.fromDidChange);

    // if the binding is a two-way binding, also set up an observer on the target
    if (!this._oneWay) {
      addObserver(obj, toPath, this, this.toDidChange);
    }

    this._readyToSync = true;

    return this;
  },

  /**
    Disconnects the binding instance. Changes will no longer be relayed. You
    will not usually need to call this method.

    @method disconnect
    @param {Object} obj The root object you passed when connecting the binding.
    @return {Ember.Binding} `this`
  */
  disconnect(obj) {
    Ember.assert('Must pass a valid object to Ember.Binding.disconnect()', !!obj);

    var twoWay = !this._oneWay;

    // remove an observer on the object so we're no longer notified of
    // changes that should update bindings.
    removeObserver(obj, this._from, this, this.fromDidChange);

    // if the binding is two-way, remove the observer from the target as well
    if (twoWay) {
      removeObserver(obj, this._to, this, this.toDidChange);
    }

    this._readyToSync = false; // disable scheduled syncs...
    return this;
  },

  // ..........................................................
  // PRIVATE
  //

  /* called when the from side changes */
  fromDidChange(target) {
    this._scheduleSync(target, 'fwd');
  },

  /* called when the to side changes */
  toDidChange(target) {
    this._scheduleSync(target, 'back');
  },

  _scheduleSync(obj, dir) {
    var existingDir = this._direction;

    // if we haven't scheduled the binding yet, schedule it
    if (existingDir === undefined) {
      run.schedule('sync', this, this._sync, obj);
      this._direction  = dir;
    }

    // If both a 'back' and 'fwd' sync have been scheduled on the same object,
    // default to a 'fwd' sync so that it remains deterministic.
    if (existingDir === 'back' && dir === 'fwd') {
      this._direction = 'fwd';
    }
  },

  _sync(obj) {
    var log = Ember.LOG_BINDINGS;

    // don't synchronize destroyed objects or disconnected bindings
    if (obj.isDestroyed || !this._readyToSync) { return; }

    // get the direction of the binding for the object we are
    // synchronizing from
    var direction = this._direction;

    var fromPath = this._from;
    var toPath = this._to;

    this._direction = undefined;

    // if we're synchronizing from the remote object...
    if (direction === 'fwd') {
      var fromValue = getWithGlobals(obj, this._from);
      if (log) {
        Ember.Logger.log(' ', this.toString(), '->', fromValue, obj);
      }
      if (this._oneWay) {
        trySet(obj, toPath, fromValue);
      } else {
        _suspendObserver(obj, toPath, this, this.toDidChange, function () {
          trySet(obj, toPath, fromValue);
        });
      }
    // if we're synchronizing *to* the remote object
    } else if (direction === 'back') {
      var toValue = get(obj, this._to);
      if (log) {
        Ember.Logger.log(' ', this.toString(), '<-', toValue, obj);
      }
      _suspendObserver(obj, fromPath, this, this.fromDidChange, function () {
        trySet(isGlobalPath(fromPath) ? Ember.lookup : obj, fromPath, toValue);
      });
    }
  }

};

function mixinProperties(to, from) {
  for (var key in from) {
    if (from.hasOwnProperty(key)) {
      to[key] = from[key];
    }
  }
}

mixinProperties(Binding, {

  /*
    See `Ember.Binding.from`.

    @method from
    @static
  */
  from(from) {
    var C = this;
    return new C(undefined, from);
  },

  /*
    See `Ember.Binding.to`.

    @method to
    @static
  */
  to(to) {
    var C = this;
    return new C(to, undefined);
  },

  /**
    Creates a new Binding instance and makes it apply in a single direction.
    A one-way binding will relay changes on the `from` side object (supplied
    as the `from` argument) the `to` side, but not the other way around.
    This means that if you change the "to" side directly, the "from" side may have
    a different value.

    See `Binding.oneWay`.

    @method oneWay
    @param {String} from from path.
    @param {Boolean} [flag] (Optional) passing nothing here will make the
      binding `oneWay`. You can instead pass `false` to disable `oneWay`, making the
      binding two way again.
    @return {Ember.Binding} `this`
  */
  oneWay(from, flag) {
    var C = this;
    return new C(undefined, from).oneWay(flag);
  }

});
/**
  An `Ember.Binding` connects the properties of two objects so that whenever
  the value of one property changes, the other property will be changed also.

  ## Automatic Creation of Bindings with `/^*Binding/`-named Properties

  You do not usually create Binding objects directly but instead describe
  bindings in your class or object definition using automatic binding
  detection.

  Properties ending in a `Binding` suffix will be converted to `Ember.Binding`
  instances. The value of this property should be a string representing a path
  to another object or a custom binding instance created using Binding helpers
  (see "One Way Bindings"):

  ```
  valueBinding: "MyApp.someController.title"
  ```

  This will create a binding from `MyApp.someController.title` to the `value`
  property of your object instance automatically. Now the two values will be
  kept in sync.

  ## One Way Bindings

  One especially useful binding customization you can use is the `oneWay()`
  helper. This helper tells Ember that you are only interested in
  receiving changes on the object you are binding from. For example, if you
  are binding to a preference and you want to be notified if the preference
  has changed, but your object will not be changing the preference itself, you
  could do:

  ```
  bigTitlesBinding: Ember.Binding.oneWay("MyApp.preferencesController.bigTitles")
  ```

  This way if the value of `MyApp.preferencesController.bigTitles` changes the
  `bigTitles` property of your object will change also. However, if you
  change the value of your `bigTitles` property, it will not update the
  `preferencesController`.

  One way bindings are almost twice as fast to setup and twice as fast to
  execute because the binding only has to worry about changes to one side.

  You should consider using one way bindings anytime you have an object that
  may be created frequently and you do not intend to change a property; only
  to monitor it for changes (such as in the example above).

  ## Adding Bindings Manually

  All of the examples above show you how to configure a custom binding, but the
  result of these customizations will be a binding template, not a fully active
  Binding instance. The binding will actually become active only when you
  instantiate the object the binding belongs to. It is useful however, to
  understand what actually happens when the binding is activated.

  For a binding to function it must have at least a `from` property and a `to`
  property. The `from` property path points to the object/key that you want to
  bind from while the `to` path points to the object/key you want to bind to.

  When you define a custom binding, you are usually describing the property
  you want to bind from (such as `MyApp.someController.value` in the examples
  above). When your object is created, it will automatically assign the value
  you want to bind `to` based on the name of your binding key. In the
  examples above, during init, Ember objects will effectively call
  something like this on your binding:

  ```javascript
  binding = Ember.Binding.from("valueBinding").to("value");
  ```

  This creates a new binding instance based on the template you provide, and
  sets the to path to the `value` property of the new object. Now that the
  binding is fully configured with a `from` and a `to`, it simply needs to be
  connected to become active. This is done through the `connect()` method:

  ```javascript
  binding.connect(this);
  ```

  Note that when you connect a binding you pass the object you want it to be
  connected to. This object will be used as the root for both the from and
  to side of the binding when inspecting relative paths. This allows the
  binding to be automatically inherited by subclassed objects as well.

  This also allows you to bind between objects using the paths you declare in
  `from` and `to`:

  ```javascript
  // Example 1
  binding = Ember.Binding.from("App.someObject.value").to("value");
  binding.connect(this);

  // Example 2
  binding = Ember.Binding.from("parentView.value").to("App.someObject.value");
  binding.connect(this);
  ```

  Now that the binding is connected, it will observe both the from and to side
  and relay changes.

  If you ever needed to do so (you almost never will, but it is useful to
  understand this anyway), you could manually create an active binding by
  using the `Ember.bind()` helper method. (This is the same method used by
  to setup your bindings on objects):

  ```javascript
  Ember.bind(MyApp.anotherObject, "value", "MyApp.someController.value");
  ```

  Both of these code fragments have the same effect as doing the most friendly
  form of binding creation like so:

  ```javascript
  MyApp.anotherObject = Ember.Object.create({
    valueBinding: "MyApp.someController.value",

    // OTHER CODE FOR THIS OBJECT...
  });
  ```

  Ember's built in binding creation method makes it easy to automatically
  create bindings for you. You should always use the highest-level APIs
  available, even if you understand how it works underneath.

  @class Binding
  @namespace Ember
  @since Ember 0.9
*/
// Ember.Binding = Binding; ES6TODO: where to put this?


/**
  Global helper method to create a new binding. Just pass the root object
  along with a `to` and `from` path to create and connect the binding.

  @method bind
  @for Ember
  @param {Object} obj The root object of the transform.
  @param {String} to The path to the 'to' side of the binding.
    Must be relative to obj.
  @param {String} from The path to the 'from' side of the binding.
    Must be relative to obj or a global path.
  @return {Ember.Binding} binding instance
*/
export function bind(obj, to, from) {
  return new Binding(to, from).connect(obj);
}

/**
  @method oneWay
  @for Ember
  @param {Object} obj The root object of the transform.
  @param {String} to The path to the 'to' side of the binding.
    Must be relative to obj.
  @param {String} from The path to the 'from' side of the binding.
    Must be relative to obj or a global path.
  @return {Ember.Binding} binding instance
*/
export function oneWay(obj, to, from) {
  return new Binding(to, from).oneWay().connect(obj);
}

export {
  Binding,
  isGlobalPath
};
