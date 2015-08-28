'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

/**
  @module ember
  @submodule ember-runtime
*/

// using ember-metal/lib/main here to ensure that ember-debug is setup
// if present
import Ember from 'ember-metal';
import { assert, runInDebug } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import merge from 'ember-metal/merge';

// NOTE: this object should never be included directly. Instead use `Ember.Object`.
// We only define this separately so that `Ember.Set` can depend on it.
import { get } from 'ember-metal/property_get';
import {
  guidFor,
  apply
} from 'ember-metal/utils';
import {
  generateGuid,
  GUID_KEY_PROPERTY,
  makeArray
} from 'ember-metal/utils';
import { meta } from 'ember-metal/meta';
import { finishChains } from 'ember-metal/chains';
import { sendEvent } from 'ember-metal/events';
import {
  IS_BINDING,
  Mixin,
  REQUIRED
} from 'ember-metal/mixin';
import EmberError from 'ember-metal/error';
import ActionHandler from 'ember-runtime/mixins/action_handler';
import { defineProperty } from 'ember-metal/properties';
import { Binding } from 'ember-metal/binding';
import { ComputedProperty, computed } from 'ember-metal/computed';
import InjectedProperty from 'ember-metal/injected_property';
import run from 'ember-metal/run_loop';
import { destroy } from 'ember-metal/watching';
import {
  K
} from 'ember-metal/core';
import { validatePropertyInjections } from 'ember-runtime/inject';

var schedule = run.schedule;
var applyMixin = Mixin._apply;
var finishPartial = Mixin.finishPartial;
var reopen = Mixin.prototype.reopen;
var hasCachedComputedProperties = false;

function makeCtor() {
  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster. This is glue code so we want it to be as fast as
  // possible.

  var wasApplied = false;
  var initMixins, initProperties;

  var Class = function() {
    if (!wasApplied) {
      Class.proto(); // prepare prototype...
    }

    if (arguments.length > 0) {
      initProperties = [arguments[0]];
    }

    this.__defineNonEnumerable(GUID_KEY_PROPERTY);
    var m = meta(this);
    var proto = m.proto;
    m.proto = this;
    if (initMixins) {
      // capture locally so we can clear the closed over variable
      var mixins = initMixins;
      initMixins = null;
      apply(this, this.reopen, mixins);
    }
    if (initProperties) {
      // capture locally so we can clear the closed over variable
      var props = initProperties;
      initProperties = null;

      var concatenatedProperties = this.concatenatedProperties;
      var mergedProperties = this.mergedProperties;

      for (var i = 0, l = props.length; i < l; i++) {
        var properties = props[i];

        assert(
          'Ember.Object.create no longer supports mixing in other ' +
          'definitions, use .extend & .create seperately instead.',
          !(properties instanceof Mixin)
        );

        if (typeof properties !== 'object' && properties !== undefined) {
          throw new EmberError('Ember.Object.create only accepts objects.');
        }

        if (!properties) { continue; }

        var keyNames = Object.keys(properties);

        for (var j = 0, ll = keyNames.length; j < ll; j++) {
          var keyName = keyNames[j];
          var value = properties[keyName];

          if (IS_BINDING.test(keyName)) {
            m.writeBindings(keyName, value);
          }

          var possibleDesc = this[keyName];
          var desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;

          assert(
            'Ember.Object.create no longer supports defining computed ' +
            'properties. Define computed properties using extend() or reopen() ' +
            'before calling create().',
            !(value instanceof ComputedProperty)
          );
          assert(
            'Ember.Object.create no longer supports defining methods that call _super.',
            !(typeof value === 'function' && value.toString().indexOf('._super') !== -1)
          );
          assert(
            '`actions` must be provided at extend time, not at create time, ' +
            'when Ember.ActionHandler is used (i.e. views, controllers & routes).',
            !((keyName === 'actions') && ActionHandler.detect(this))
          );

          if (concatenatedProperties &&
              concatenatedProperties.length > 0 &&
              concatenatedProperties.indexOf(keyName) >= 0) {
            var baseValue = this[keyName];

            if (baseValue) {
              if ('function' === typeof baseValue.concat) {
                value = baseValue.concat(value);
              } else {
                value = makeArray(baseValue).concat(value);
              }
            } else {
              value = makeArray(value);
            }
          }

          if (mergedProperties &&
              mergedProperties.length &&
              mergedProperties.indexOf(keyName) >= 0) {
            var originalValue = this[keyName];

            value = merge(originalValue, value);
          }

          if (desc) {
            desc.set(this, keyName, value);
          } else {
            if (typeof this.setUnknownProperty === 'function' && !(keyName in this)) {
              this.setUnknownProperty(keyName, value);
            } else {
              if (isEnabled('mandatory-setter')) {
                defineProperty(this, keyName, null, value); // setup mandatory setter
              } else {
                this[keyName] = value;
              }
            }
          }
        }
      }
    }

    finishPartial(this, m);

    var length = arguments.length;

    if (length === 0) {
      this.init();
    } else if (length === 1) {
      this.init(arguments[0]);
    } else {
      // v8 bug potentially incorrectly deopts this function: https://code.google.com/p/v8/issues/detail?id=3709
      // we may want to keep this around till this ages out on mobile
      var args = new Array(length);
      for (var x = 0; x < length; x++) {
        args[x] = arguments[x];
      }
      this.init.apply(this, args);
    }

    m.proto = proto;
    finishChains(this);
    sendEvent(this, 'init');
  };

  Class.toString = Mixin.prototype.toString;
  Class.willReopen = function() {
    if (wasApplied) {
      Class.PrototypeMixin = Mixin.create(Class.PrototypeMixin);
    }

    wasApplied = false;
  };
  Class._initMixins = function(args) { initMixins = args; };
  Class._initProperties = function(args) { initProperties = args; };

  Class.proto = function() {
    var superclass = Class.superclass;
    if (superclass) { superclass.proto(); }

    if (!wasApplied) {
      wasApplied = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
    }

    return this.prototype;
  };

  return Class;
}

/**
  @class CoreObject
  @namespace Ember
  @public
*/
var CoreObject = makeCtor();
CoreObject.toString = function() { return 'Ember.CoreObject'; };
CoreObject.PrototypeMixin = Mixin.create({
  reopen(...args) {
    applyMixin(this, args, true);
    return this;
  },

  /**
    An overridable method called when objects are instantiated. By default,
    does nothing unless it is overridden during class definition.

    Example:

    ```javascript
    App.Person = Ember.Object.extend({
      init: function() {
        alert('Name is ' + this.get('name'));
      }
    });

    var steve = App.Person.create({
      name: "Steve"
    });

    // alerts 'Name is Steve'.
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View`,
    be sure to call `this._super.apply(this, arguments)` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
    @public
  */
  init() {},
  __defineNonEnumerable(property) {
    Object.defineProperty(this, property.name, property.descriptor);
    //this[property.name] = property.descriptor.value;
  },

  /**
    Defines the properties that will be concatenated from the superclass
    (instead of overridden).

    By default, when you extend an Ember class a property defined in
    the subclass overrides a property with the same name that is defined
    in the superclass. However, there are some cases where it is preferable
    to build up a property's value by combining the superclass' property
    value with the subclass' value. An example of this in use within Ember
    is the `classNames` property of `Ember.View`.

    Here is some sample code showing the difference between a concatenated
    property and a normal one:

    ```javascript
    App.BarView = Ember.View.extend({
      someNonConcatenatedProperty: ['bar'],
      classNames: ['bar']
    });

    App.FooBarView = App.BarView.extend({
      someNonConcatenatedProperty: ['foo'],
      classNames: ['foo']
    });

    var fooBarView = App.FooBarView.create();
    fooBarView.get('someNonConcatenatedProperty'); // ['foo']
    fooBarView.get('classNames'); // ['ember-view', 'bar', 'foo']
    ```

    This behavior extends to object creation as well. Continuing the
    above example:

    ```javascript
    var view = App.FooBarView.create({
      someNonConcatenatedProperty: ['baz'],
      classNames: ['baz']
    })
    view.get('someNonConcatenatedProperty'); // ['baz']
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```
    Adding a single property that is not an array will just add it in the array:

    ```javascript
    var view = App.FooBarView.create({
      classNames: 'baz'
    })
    view.get('classNames'); // ['ember-view', 'bar', 'foo', 'baz']
    ```

    Using the `concatenatedProperties` property, we can tell Ember to mix the
    content of the properties.

    In `Ember.View` the `classNameBindings` and `attributeBindings` properties
    are also concatenated, in addition to `classNames`.

    This feature is available for you to use throughout the Ember object model,
    although typical app developers are likely to use it infrequently. Since
    it changes expectations about behavior of properties, you should properly
    document its usage in each individual concatenated property (to not
    mislead your users to think they can override the property in a subclass).

    @property concatenatedProperties
    @type Array
    @default null
    @public
  */
  concatenatedProperties: null,

  /**
    Destroyed object property flag.

    if this property is `true` the observers and bindings were already
    removed by the effect of calling the `destroy()` method.

    @property isDestroyed
    @default false
    @public
  */
  isDestroyed: false,

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
    @public
  */
  isDestroying: false,

  /**
    Destroys an object by setting the `isDestroyed` flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.  It will set an isDestroying flag immediately.

    @method destroy
    @return {Ember.Object} receiver
    @public
  */
  destroy() {
    if (this.isDestroying) { return; }
    this.isDestroying = true;

    schedule('actions', this, this.willDestroy);
    schedule('destroy', this, this._scheduledDestroy);
    return this;
  },

  /**
    Override to implement teardown.

    @method willDestroy
    @public
  */
  willDestroy: K,

  /**
    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @private
    @method _scheduledDestroy
  */
  _scheduledDestroy() {
    if (this.isDestroyed) { return; }
    destroy(this);
    this.isDestroyed = true;
  },

  bind(to, from) {
    if (!(from instanceof Binding)) { from = Binding.from(from); }
    from.to(to).connect(this);
    return from;
  },

  /**
    Returns a string representation which attempts to provide more information
    than Javascript's `toString` typically does, in a generic way for all Ember
    objects.

    ```javascript
    App.Person = Em.Object.extend()
    person = App.Person.create()
    person.toString() //=> "<App.Person:ember1024>"
    ```

    If the object's class is not defined on an Ember namespace, it will
    indicate it is a subclass of the registered superclass:

   ```javascript
    Student = App.Person.extend()
    student = Student.create()
    student.toString() //=> "<(subclass of App.Person):ember1025>"
    ```

    If the method `toStringExtension` is defined, its return value will be
    included in the output.

    ```javascript
    App.Teacher = App.Person.extend({
      toStringExtension: function() {
        return this.get('fullName');
      }
    });
    teacher = App.Teacher.create()
    teacher.toString(); //=> "<App.Teacher:ember1026:Tom Dale>"
    ```

    @method toString
    @return {String} string representation
    @public
  */
  toString() {
    var hasToStringExtension = typeof this.toStringExtension === 'function';
    var extension = hasToStringExtension ? ':' + this.toStringExtension() : '';
    var ret = '<' + this.constructor.toString() + ':' + guidFor(this) + extension + '>';

    this.toString = makeToString(ret);
    return ret;
  }
});

CoreObject.PrototypeMixin.ownerConstructor = CoreObject;

function makeToString(ret) {
  return function() { return ret; };
}

CoreObject.__super__ = null;

var ClassMixinProps = {

  ClassMixin: REQUIRED,

  PrototypeMixin: REQUIRED,

  isClass: true,

  isMethod: false,

  /**
    Creates a new subclass.

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        alert(thing);
       }
    });
    ```

    This defines a new subclass of Ember.Object: `App.Person`. It contains one method: `say()`.

    You can also create a subclass from any existing class by calling its `extend()` method.
    For example, you might want to create a subclass of Ember's built-in `Ember.View` class:

    ```javascript
    App.PersonView = Ember.View.extend({
      tagName: 'li',
      classNameBindings: ['isAdministrator']
    });
    ```

    When defining a subclass, you can override methods but still access the
    implementation of your parent class by calling the special `_super()` method:

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        var name = this.get('name');
        alert(name + ' says: ' + thing);
      }
    });

    App.Soldier = App.Person.extend({
      say: function(thing) {
        this._super(thing + ", sir!");
      },
      march: function(numberOfHours) {
        alert(this.get('name') + ' marches for ' + numberOfHours + ' hours.');
      }
    });

    var yehuda = App.Soldier.create({
      name: "Yehuda Katz"
    });

    yehuda.say("Yes");  // alerts "Yehuda Katz says: Yes, sir!"
    ```

    The `create()` on line #17 creates an *instance* of the `App.Soldier` class.
    The `extend()` on line #8 creates a *subclass* of `App.Person`. Any instance
    of the `App.Person` class will *not* have the `march()` method.

    You can also pass `Mixin` classes to add additional properties to the subclass.

    ```javascript
    App.Person = Ember.Object.extend({
      say: function(thing) {
        alert(this.get('name') + ' says: ' + thing);
      }
    });

    App.SingingMixin = Mixin.create({
      sing: function(thing){
        alert(this.get('name') + ' sings: la la la ' + thing);
      }
    });

    App.BroadwayStar = App.Person.extend(App.SingingMixin, {
      dance: function() {
        alert(this.get('name') + ' dances: tap tap tap tap ');
      }
    });
    ```

    The `App.BroadwayStar` class contains three methods: `say()`, `sing()`, and `dance()`.

    @method extend
    @static

    @param {Mixin} [mixins]* One or more Mixin classes
    @param {Object} [arguments]* Object containing values to use within the new class
    @public
  */
  extend() {
    var Class = makeCtor();
    var proto;
    Class.ClassMixin = Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = Mixin.create(this.PrototypeMixin);

    Class.ClassMixin.ownerConstructor = Class;
    Class.PrototypeMixin.ownerConstructor = Class;

    reopen.apply(Class.PrototypeMixin, arguments);

    Class.superclass = this;
    Class.__super__  = this.prototype;

    proto = Class.prototype = Object.create(this.prototype);
    proto.constructor = Class;
    generateGuid(proto);
    meta(proto).proto = proto; // this will disable observers on prototype

    Class.ClassMixin.apply(Class);
    return Class;
  },

  /**
    Creates an instance of a class. Accepts either no arguments, or an object
    containing values to initialize the newly instantiated object with.

    ```javascript
    App.Person = Ember.Object.extend({
      helloWorld: function() {
        alert("Hi, my name is " + this.get('name'));
      }
    });

    var tom = App.Person.create({
      name: 'Tom Dale'
    });

    tom.helloWorld(); // alerts "Hi, my name is Tom Dale".
    ```

    `create` will call the `init` function if defined during
    `Ember.AnyObject.extend`

    If no arguments are passed to `create`, it will not set values to the new
    instance during initialization:

    ```javascript
    var noName = App.Person.create();
    noName.helloWorld(); // alerts undefined
    ```

    NOTE: For performance reasons, you cannot declare methods or computed
    properties during `create`. You should instead declare methods and computed
    properties when using `extend`.

    @method create
    @static
    @param [arguments]*
    @public
  */
  create(...args) {
    var C = this;
    if (args.length > 0) {
      this._initProperties(args);
    }
    return new C();
  },

  /**
    Augments a constructor's prototype with additional
    properties and functions:

    ```javascript
    MyObject = Ember.Object.extend({
      name: 'an object'
    });

    o = MyObject.create();
    o.get('name'); // 'an object'

    MyObject.reopen({
      say: function(msg){
        console.log(msg);
      }
    })

    o2 = MyObject.create();
    o2.say("hello"); // logs "hello"

    o.say("goodbye"); // logs "goodbye"
    ```

    To add functions and properties to the constructor itself,
    see `reopenClass`

    @method reopen
    @public
  */
  reopen() {
    this.willReopen();
    reopen.apply(this.PrototypeMixin, arguments);
    return this;
  },

  /**
    Augments a constructor's own properties and functions:

    ```javascript
    MyObject = Ember.Object.extend({
      name: 'an object'
    });

    MyObject.reopenClass({
      canBuild: false
    });

    MyObject.canBuild; // false
    o = MyObject.create();
    ```

    In other words, this creates static properties and functions for the class.
    These are only available on the class and not on any instance of that class.

    ```javascript
    App.Person = Ember.Object.extend({
      name : "",
      sayHello : function() {
        alert("Hello. My name is " + this.get('name'));
      }
    });

    App.Person.reopenClass({
      species : "Homo sapiens",
      createPerson: function(newPersonsName){
        return App.Person.create({
          name:newPersonsName
        });
      }
    });

    var tom = App.Person.create({
      name : "Tom Dale"
    });
    var yehuda = App.Person.createPerson("Yehuda Katz");

    tom.sayHello(); // "Hello. My name is Tom Dale"
    yehuda.sayHello(); // "Hello. My name is Yehuda Katz"
    alert(App.Person.species); // "Homo sapiens"
    ```

    Note that `species` and `createPerson` are *not* valid on the `tom` and `yehuda`
    variables. They are only valid on `App.Person`.

    To add functions and properties to instances of
    a constructor by extending the constructor's prototype
    see `reopen`

    @method reopenClass
    @public
  */
  reopenClass() {
    reopen.apply(this.ClassMixin, arguments);
    applyMixin(this, arguments, false);
    return this;
  },

  detect(obj) {
    if ('function' !== typeof obj) { return false; }
    while (obj) {
      if (obj === this) { return true; }
      obj = obj.superclass;
    }
    return false;
  },

  detectInstance(obj) {
    return obj instanceof this;
  },

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For
    example, computed property functions may close over variables that are then
    no longer available for introspection.

    You can pass a hash of these values to a computed property like this:

    ```javascript
    person: function() {
      var personId = this.get('personId');
      return App.Person.create({ id: personId });
    }.property().meta({ type: App.Person })
    ```

    Once you've done this, you can retrieve the values saved to the computed
    property from your class like this:

    ```javascript
    MyClass.metaForProperty('person');
    ```

    This will return the original hash that was passed to `meta()`.

    @static
    @method metaForProperty
    @param key {String} property name
    @private
  */
  metaForProperty(key) {
    var proto = this.proto();
    var possibleDesc = proto[key];
    var desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;

    assert(
      'metaForProperty() could not find a computed property ' +
      'with key \'' + key + '\'.',
      !!desc && desc instanceof ComputedProperty
    );
    return desc._meta || {};
  },

  _computedProperties: computed(function() {
    hasCachedComputedProperties = true;
    var proto = this.proto();
    var property;
    var properties = [];

    for (var name in proto) {
      property = proto[name];

      if (property && property.isDescriptor) {
        properties.push({
          name: name,
          meta: property._meta
        });
      }
    }
    return properties;
  }).readOnly(),

  /**
    Iterate over each computed property for the class, passing its name
    and any associated metadata (see `metaForProperty`) to the callback.

    @static
    @method eachComputedProperty
    @param {Function} callback
    @param {Object} binding
    @private
  */
  eachComputedProperty(callback, binding) {
    var property, name;
    var empty = {};

    var properties = get(this, '_computedProperties');

    for (var i = 0, length = properties.length; i < length; i++) {
      property = properties[i];
      name = property.name;
      callback.call(binding || this, property.name, property.meta || empty);
    }
  }
};

function injectedPropertyAssertion() {
  assert('Injected properties are invalid', validatePropertyInjections(this));
}

runInDebug(function() {
  /**
    Provides lookup-time type validation for injected properties.

    @private
    @method _onLookup
  */
  ClassMixinProps._onLookup = injectedPropertyAssertion;
});

/**
  Returns a hash of property names and container names that injected
  properties will lookup on the container lazily.

  @method _lazyInjections
  @return {Object} Hash of all lazy injected property keys to container names
  @private
*/
ClassMixinProps._lazyInjections = function() {
  var injections = {};
  var proto = this.proto();
  var key, desc;

  for (key in proto) {
    desc = proto[key];
    if (desc instanceof InjectedProperty) {
      injections[key] = desc.type + ':' + (desc.name || key);
    }
  }

  return injections;
};

var ClassMixin = Mixin.create(ClassMixinProps);

ClassMixin.ownerConstructor = CoreObject;

CoreObject.ClassMixin = ClassMixin;

ClassMixin.apply(CoreObject);

CoreObject.reopen({
  didDefineProperty(proto, key, value) {
    if (hasCachedComputedProperties === false) { return; }
    if (value instanceof Ember.ComputedProperty) {
      var cache = Ember.meta(this.constructor).readableCache();

      if (cache && cache._computedProperties !== undefined) {
        cache._computedProperties = undefined;
      }
    }
  }
});

export default CoreObject;
