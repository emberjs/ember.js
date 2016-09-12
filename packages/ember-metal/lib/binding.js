import { guidFor } from 'ember-utils';
import Logger from 'ember-console';
import { context, ENV } from 'ember-environment';
import run from './run_loop';
import { assert, deprecate } from './debug';
import { get } from './property_get';
import { trySet } from './property_set';
import { addListener } from './events';
import {
  addObserver,
  removeObserver,
  _suspendObserver
} from './observer';
import {
  isGlobalPath,
  getFirstKey,
  getTailPath
} from './path_cache';

/**
@module ember
@submodule ember-metal
*/

// ..........................................................
// BINDING
//

function Binding(toPath, fromPath) {
  // Configuration
  this._from = fromPath;
  this._to = toPath;
  this._oneWay = undefined;

  // State
  this._direction = undefined;
  this._readyToSync = undefined;
  this._fromObj = undefined;
  this._fromPath = undefined;
  this._toObj = undefined;
}

/**
  @class Binding
  @namespace Ember
  @deprecated See http://emberjs.com/deprecations/v2.x#toc_ember-binding
  @public
*/

Binding.prototype = {
  /**
    This copies the Binding so it can be connected to another object.

    @method copy
    @return {Ember.Binding} `this`
    @public
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
    @param {String} path The property path to connect to.
    @return {Ember.Binding} `this`
    @public
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
    @param {String|Tuple} path A property path or tuple.
    @return {Ember.Binding} `this`
    @public
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
    @public
  */
  oneWay() {
    this._oneWay = true;
    return this;
  },

  /**
    @method toString
    @return {String} string representation of binding
    @public
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
    @public
  */
  connect(obj) {
    assert('Must pass a valid object to Ember.Binding.connect()', !!obj);

    let fromObj, fromPath, possibleGlobal;

    // If the binding's "from" path could be interpreted as a global, verify
    // whether the path refers to a global or not by consulting `Ember.lookup`.
    if (isGlobalPath(this._from)) {
      let name = getFirstKey(this._from);
      possibleGlobal = context.lookup[name];

      if (possibleGlobal) {
        fromObj = possibleGlobal;
        fromPath = getTailPath(this._from);
      }
    }

    if (fromObj === undefined) {
      fromObj = obj;
      fromPath = this._from;
    }

    trySet(obj, this._to, get(fromObj, fromPath));

    // Add an observer on the object to be notified when the binding should be updated.
    addObserver(fromObj, fromPath, this, 'fromDidChange');

    // If the binding is a two-way binding, also set up an observer on the target.
    if (!this._oneWay) {
      addObserver(obj, this._to, this, 'toDidChange');
    }

    addListener(obj, 'willDestroy', this, 'disconnect');

    fireDeprecations(
      obj,
      this._to,
      this._from,
      possibleGlobal,
      this._oneWay,
      (!possibleGlobal && !this._oneWay)
    );

    this._readyToSync = true;
    this._fromObj = fromObj;
    this._fromPath = fromPath;
    this._toObj = obj;

    return this;
  },

  /**
    Disconnects the binding instance. Changes will no longer be relayed. You
    will not usually need to call this method.

    @method disconnect
    @return {Ember.Binding} `this`
    @public
  */
  disconnect() {
    assert('Must pass a valid object to Ember.Binding.disconnect()', !!this._toObj);

    // Remove an observer on the object so we're no longer notified of
    // changes that should update bindings.
    removeObserver(this._fromObj, this._fromPath, this, 'fromDidChange');

    // If the binding is two-way, remove the observer from the target as well.
    if (!this._oneWay) {
      removeObserver(this._toObj, this._to, this, 'toDidChange');
    }

    this._readyToSync = false; // Disable scheduled syncs...
    return this;
  },

  // ..........................................................
  // PRIVATE
  //

  /* Called when the from side changes. */
  fromDidChange(target) {
    this._scheduleSync('fwd');
  },

  /* Called when the to side changes. */
  toDidChange(target) {
    this._scheduleSync('back');
  },

  _scheduleSync(dir) {
    var existingDir = this._direction;

    // If we haven't scheduled the binding yet, schedule it.
    if (existingDir === undefined) {
      run.schedule('sync', this, '_sync');
      this._direction  = dir;
    }

    // If both a 'back' and 'fwd' sync have been scheduled on the same object,
    // default to a 'fwd' sync so that it remains deterministic.
    if (existingDir === 'back' && dir === 'fwd') {
      this._direction = 'fwd';
    }
  },

  _sync() {
    var log = ENV.LOG_BINDINGS;

    let toObj = this._toObj;

    // Don't synchronize destroyed objects or disconnected bindings.
    if (toObj.isDestroyed || !this._readyToSync) { return; }

    // Get the direction of the binding for the object we are
    // synchronizing from.
    var direction = this._direction;

    var fromObj = this._fromObj;
    var fromPath = this._fromPath;

    this._direction = undefined;

    // If we're synchronizing from the remote object...
    if (direction === 'fwd') {
      var fromValue = get(fromObj, fromPath);
      if (log) {
        Logger.log(' ', this.toString(), '->', fromValue, fromObj);
      }
      if (this._oneWay) {
        trySet(toObj, this._to, fromValue);
      } else {
        _suspendObserver(toObj, this._to, this, 'toDidChange', function() {
          trySet(toObj, this._to, fromValue);
        });
      }
    // If we're synchronizing *to* the remote object.
    } else if (direction === 'back') {
      var toValue = get(toObj, this._to);
      if (log) {
        Logger.log(' ', this.toString(), '<-', toValue, toObj);
      }
      _suspendObserver(fromObj, fromPath, this, 'fromDidChange', function() {
        trySet(fromObj, fromPath, toValue);
      });
    }
  }

};

function fireDeprecations(obj, toPath, fromPath, deprecateGlobal, deprecateOneWay, deprecateAlias) {
  let deprecateGlobalMessage = '`Ember.Binding` is deprecated. Since you' +
    ' are binding to a global consider using a service instead.';
  let deprecateOneWayMessage = '`Ember.Binding` is deprecated. Since you' +
    ' are using a `oneWay` binding consider using a `readOnly` computed' +
    ' property instead.';
  let deprecateAliasMessage = '`Ember.Binding` is deprecated. Consider' +
    ' using an `alias` computed property instead.';

  let objectInfo = `The \`${toPath}\` property of \`${obj}\` is an \`Ember.Binding\` connected to \`${fromPath}\`, but `;
  deprecate(objectInfo + deprecateGlobalMessage, !deprecateGlobal, {
    id: 'ember-metal.binding',
    until: '3.0.0',
    url: 'http://emberjs.com/deprecations/v2.x#toc_ember-binding'
  });
  deprecate(objectInfo + deprecateOneWayMessage, !deprecateOneWay, {
    id: 'ember-metal.binding',
    until: '3.0.0',
    url: 'http://emberjs.com/deprecations/v2.x#toc_ember-binding'
  });
  deprecate(objectInfo + deprecateAliasMessage, !deprecateAlias, {
    id: 'ember-metal.binding',
    until: '3.0.0',
    url: 'http://emberjs.com/deprecations/v2.x#toc_ember-binding'
  });
}

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
  }
});
/**
  An `Ember.Binding` connects the properties of two objects so that whenever
  the value of one property changes, the other property will be changed also.

  ## Automatic Creation of Bindings with `/^*Binding/`-named Properties.

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
  instantiate the object the binding belongs to. It is useful, however, to
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
  @public
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
  @public
*/
export function bind(obj, to, from) {
  return new Binding(to, from).connect(obj);
}

export {
  Binding
};
