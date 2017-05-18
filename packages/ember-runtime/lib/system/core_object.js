/**
  @module ember
  @submodule ember-runtime
*/

// using ember-metal/lib/main here to ensure that ember-debug is setup
// if present
import {
  assign,
  guidFor,
  generateGuid,
  makeArray,
  GUID_KEY_PROPERTY,
  symbol,
  NAME_KEY,
  GUID_KEY
} from 'ember-utils';
import {
  get,
  meta,
  finishChains,
  sendEvent,
  detectBinding,
  Mixin,
  REQUIRED,
  defineProperty,
  Binding,
  ComputedProperty,
  computed,
  InjectedProperty,
  run,
  destroy,
  descriptor,
  _hasCachedComputedProperties
} from 'ember-metal';
import ActionHandler from '../mixins/action_handler';
import { validatePropertyInjections } from '../inject';
import { assert, Error as EmberError } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { MANDATORY_SETTER } from 'ember/features';

let schedule = run.schedule;
let applyMixin = Mixin._apply;
let finishPartial = Mixin.finishPartial;
let reopen = Mixin.prototype.reopen;

export const POST_INIT = symbol('POST_INIT');

function makeCtor() {
  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster. This is glue code so we want it to be as fast as
  // possible.

  let wasApplied = false;
  let initProperties, initFactory;

  class Class {
    constructor() {
      if (!wasApplied) {
        Class.proto(); // prepare prototype...
      }

      if (arguments.length > 0) {
        initProperties = [arguments[0]];
      }

      this.__defineNonEnumerable(GUID_KEY_PROPERTY);
      let m = meta(this);
      let proto = m.proto;
      m.proto = this;

      if (initFactory) {
        m.factory = initFactory;
        initFactory = null;
      }
      if (initProperties) {
        // capture locally so we can clear the closed over variable
        let props = initProperties;
        initProperties = null;

        let concatenatedProperties = this.concatenatedProperties;
        let mergedProperties = this.mergedProperties;

        for (let i = 0; i < props.length; i++) {
          let properties = props[i];
          assert(
            'Ember.Object.create no longer supports mixing in other ' +
            'definitions, use .extend & .create separately instead.',
            !(properties instanceof Mixin)
          );

          if (typeof properties !== 'object' && properties !== undefined) {
            throw new EmberError('Ember.Object.create only accepts objects.');
          }

          if (!properties) { continue; }

          let keyNames = Object.keys(properties);

          for (let j = 0; j < keyNames.length; j++) {
            let keyName = keyNames[j];
            let value = properties[keyName];

            if (detectBinding(keyName)) {
              m.writeBindings(keyName, value);
            }

            let possibleDesc = this[keyName];
            let desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;

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
              let baseValue = this[keyName];

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
              let originalValue = this[keyName];

              value = assign({}, originalValue, value);
            }

            if (desc) {
              desc.set(this, keyName, value);
            } else {
              if (typeof this.setUnknownProperty === 'function' && !(keyName in this)) {
                this.setUnknownProperty(keyName, value);
              } else {
                if (MANDATORY_SETTER) {
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

      this.init(...arguments);

      this[POST_INIT]();

      m.proto = proto;
      finishChains(m);
      sendEvent(this, 'init', undefined, undefined, undefined, m);
    }

    static willReopen() {
      if (wasApplied) {
        Class.PrototypeMixin = Mixin.create(Class.PrototypeMixin);
      }

      wasApplied = false;
    }

    static _initProperties(args) { initProperties = args; }
    static _initFactory(factory) { initFactory = factory; }

    static proto() {
      let superclass = Class.superclass;
      if (superclass) { superclass.proto(); }

      if (!wasApplied) {
        wasApplied = true;
        Class.PrototypeMixin.applyPartial(Class.prototype);
      }

      return this.prototype;
    }
  }

  Class.toString = Mixin.prototype.toString;

  return Class;
}

/**
  @class CoreObject
  @namespace Ember
  @public
*/
let CoreObject = makeCtor();
CoreObject.toString = () => 'Ember.CoreObject';
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
    const Person = Ember.Object.extend({
      init() {
        alert(`Name is ${this.get('name')}`);
      }
    });

    let steve = Person.create({
      name: 'Steve'
    });

    // alerts 'Name is Steve'.
    ```

    NOTE: If you do override `init` for a framework class like `Ember.View`,
    be sure to call `this._super(...arguments)` in your
    `init` declaration! If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
    @public
  */
  init() {},

  [POST_INIT]() { }, // Private, and only for didInitAttrs willReceiveAttrs

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
    const Bar = Ember.Object.extend({
      // Configure which properties to concatenate
      concatenatedProperties: ['concatenatedProperty'],

      someNonConcatenatedProperty: ['bar'],
      concatenatedProperty: ['bar']
    });

    const FooBar = Bar.extend({
      someNonConcatenatedProperty: ['foo'],
      concatenatedProperty: ['foo']
    });

    let fooBar = FooBar.create();
    fooBar.get('someNonConcatenatedProperty'); // ['foo']
    fooBar.get('concatenatedProperty'); // ['bar', 'foo']
    ```

    This behavior extends to object creation as well. Continuing the
    above example:

    ```javascript
    let fooBar = FooBar.create({
      someNonConcatenatedProperty: ['baz'],
      concatenatedProperty: ['baz']
    })
    fooBar.get('someNonConcatenatedProperty'); // ['baz']
    fooBar.get('concatenatedProperty'); // ['bar', 'foo', 'baz']
    ```

    Adding a single property that is not an array will just add it in the array:

    ```javascript
    let fooBar = FooBar.create({
      concatenatedProperty: 'baz'
    })
    view.get('concatenatedProperty'); // ['bar', 'foo', 'baz']
    ```

    Using the `concatenatedProperties` property, we can tell Ember to mix the
    content of the properties.

    In `Ember.Component` the `classNames`, `classNameBindings` and
    `attributeBindings` properties are concatenated.

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
    Defines the properties that will be merged from the superclass
    (instead of overridden).

    By default, when you extend an Ember class a property defined in
    the subclass overrides a property with the same name that is defined
    in the superclass. However, there are some cases where it is preferable
    to build up a property's value by merging the superclass property value
    with the subclass property's value. An example of this in use within Ember
    is the `queryParams` property of routes.

    Here is some sample code showing the difference between a merged
    property and a normal one:

    ```javascript
    const Bar = Ember.Object.extend({
      // Configure which properties are to be merged
      mergedProperties: ['mergedProperty'],

      someNonMergedProperty: {
        nonMerged: 'superclass value of nonMerged'
      },
      mergedProperty: {
        page: { replace: false },
        limit: { replace: true }
      }
    });

    const FooBar = Bar.extend({
      someNonMergedProperty: {
        completelyNonMerged: 'subclass value of nonMerged'
      },
      mergedProperty: {
        limit: { replace: false }
      }
    });

    let fooBar = FooBar.create();

    fooBar.get('someNonMergedProperty');
    // => { completelyNonMerged: 'subclass value of nonMerged' }
    //
    // Note the entire object, including the nonMerged property of
    // the superclass object, has been replaced

    fooBar.get('mergedProperty');
    // => {
    //   page: {replace: false},
    //   limit: {replace: false}
    // }
    //
    // Note the page remains from the superclass, and the
    // `limit` property's value of `false` has been merged from
    // the subclass.
    ```

    This behavior is not available during object `create` calls. It is only
    available at `extend` time.

    In `Ember.Route` the `queryParams` property is merged.

    This feature is available for you to use throughout the Ember object model,
    although typical app developers are likely to use it infrequently. Since
    it changes expectations about behavior of properties, you should properly
    document its usage in each individual merged property (to not
    mislead your users to think they can override the property in a subclass).

    @property mergedProperties
    @type Array
    @default null
    @public
  */
  mergedProperties: null,

  /**
    Destroyed object property flag.

    if this property is `true` the observers and bindings were already
    removed by the effect of calling the `destroy()` method.

    @property isDestroyed
    @default false
    @public
  */
  isDestroyed: descriptor({
    get() {
      return meta(this).isSourceDestroyed();
    },

    set(value) {
      // prevent setting while applying mixins
      if (typeof value === 'object' && value !== null && value.isDescriptor) {
        return;
      }

      assert(`You cannot set \`${this}.isDestroyed\` directly, please use `.destroy()`.`, false);
    }
  }),

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
    @public
  */
  isDestroying: descriptor({
    get() {
      return meta(this).isSourceDestroying();
    },

    set(value) {
      // prevent setting while applying mixins
      if (typeof value === 'object' && value !== null && value.isDescriptor) {
        return;
      }

      assert(`You cannot set \`${this}.isDestroying\` directly, please use `.destroy()`.`, false);
    }
  }),

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
    let m = meta(this);
    if (m.isSourceDestroying()) { return; }

    m.setSourceDestroying();

    schedule('actions', this, this.willDestroy);
    schedule('destroy', this, this._scheduledDestroy, m);

    return this;
  },

  /**
    Override to implement teardown.

    @method willDestroy
    @public
  */
  willDestroy() {},

  /**
    Invoked by the run loop to actually destroy the object. This is
    scheduled for execution by the `destroy` method.

    @private
    @method _scheduledDestroy
  */
  _scheduledDestroy(m) {
    if (m.isSourceDestroyed()) { return; }
    destroy(this);
    m.setSourceDestroyed();
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
    const Person = Ember.Object.extend()
    person = Person.create()
    person.toString() //=> "<Person:ember1024>"
    ```

    If the object's class is not defined on an Ember namespace, it will
    indicate it is a subclass of the registered superclass:

   ```javascript
    const Student = Person.extend()
    let student = Student.create()
    student.toString() //=> "<(subclass of Person):ember1025>"
    ```

    If the method `toStringExtension` is defined, its return value will be
    included in the output.

    ```javascript
    const Teacher = Person.extend({
      toStringExtension() {
        return this.get('fullName');
      }
    });
    teacher = Teacher.create()
    teacher.toString(); //=> "<Teacher:ember1026:Tom Dale>"
    ```

    @method toString
    @return {String} string representation
    @public
  */
  toString() {
    let hasToStringExtension = typeof this.toStringExtension === 'function';
    let extension = hasToStringExtension ? `:${this.toStringExtension()}` : '';

    let ret = `<${this[NAME_KEY] || meta(this).factory || this.constructor.toString()}:${guidFor(this)}${extension}>`;

    return ret;
  }
});

CoreObject.PrototypeMixin.ownerConstructor = CoreObject;

CoreObject.__super__ = null;

let ClassMixinProps = {

  ClassMixin: REQUIRED,

  PrototypeMixin: REQUIRED,

  isClass: true,

  isMethod: false,
  [NAME_KEY]: null,
  [GUID_KEY]: null,
  /**
    Creates a new subclass.

    ```javascript
    const Person = Ember.Object.extend({
      say(thing) {
        alert(thing);
       }
    });
    ```

    This defines a new subclass of Ember.Object: `Person`. It contains one method: `say()`.

    You can also create a subclass from any existing class by calling its `extend()` method.
    For example, you might want to create a subclass of Ember's built-in `Ember.Component` class:

    ```javascript
    const PersonComponent = Ember.Component.extend({
      tagName: 'li',
      classNameBindings: ['isAdministrator']
    });
    ```

    When defining a subclass, you can override methods but still access the
    implementation of your parent class by calling the special `_super()` method:

    ```javascript
    const Person = Ember.Object.extend({
      say(thing) {
        let name = this.get('name');
        alert(`${name} says: ${thing}`);
      }
    });

    const Soldier = Person.extend({
      say(thing) {
        this._super(`${thing}, sir!`);
      },
      march(numberOfHours) {
        alert(`${this.get('name')} marches for ${numberOfHours} hours.`);
      }
    });

    let yehuda = Soldier.create({
      name: 'Yehuda Katz'
    });

    yehuda.say('Yes');  // alerts "Yehuda Katz says: Yes, sir!"
    ```

    The `create()` on line #17 creates an *instance* of the `Soldier` class.
    The `extend()` on line #8 creates a *subclass* of `Person`. Any instance
    of the `Person` class will *not* have the `march()` method.

    You can also pass `Mixin` classes to add additional properties to the subclass.

    ```javascript
    const Person = Ember.Object.extend({
      say(thing) {
        alert(`${this.get('name')} says: ${thing}`);
      }
    });

    const SingingMixin = Mixin.create({
      sing(thing){
        alert(`${this.get('name')} sings: la la la ${thing}`);
      }
    });

    const BroadwayStar = Person.extend(SingingMixin, {
      dance() {
        alert(`${this.get('name')} dances: tap tap tap tap `);
      }
    });
    ```

    The `BroadwayStar` class contains three methods: `say()`, `sing()`, and `dance()`.

    @method extend
    @static

    @param {Mixin} [mixins]* One or more Mixin classes
    @param {Object} [arguments]* Object containing values to use within the new class
    @public
  */
  extend() {
    let Class = makeCtor();
    let proto;
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
    const Person = Ember.Object.extend({
      helloWorld() {
        alert(`Hi, my name is ${this.get('name')}`);
      }
    });

    let tom = Person.create({
      name: 'Tom Dale'
    });

    tom.helloWorld(); // alerts "Hi, my name is Tom Dale".
    ```

    `create` will call the `init` function if defined during
    `Ember.AnyObject.extend`

    If no arguments are passed to `create`, it will not set values to the new
    instance during initialization:

    ```javascript
    let noName = Person.create();
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
    let C = this;
    if (args.length > 0) {
      this._initProperties(args);
    }
    return new C();
  },

  /**
    Augments a constructor's prototype with additional
    properties and functions:

    ```javascript
    const MyObject = Ember.Object.extend({
      name: 'an object'
    });

    o = MyObject.create();
    o.get('name'); // 'an object'

    MyObject.reopen({
      say(msg) {
        console.log(msg);
      }
    });

    o2 = MyObject.create();
    o2.say('hello'); // logs "hello"

    o.say('goodbye'); // logs "goodbye"
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
    const MyObject = Ember.Object.extend({
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
    const Person = Ember.Object.extend({
      name: '',
      sayHello() {
        alert(`Hello. My name is ${this.get('name')}`);
      }
    });

    Person.reopenClass({
      species: 'Homo sapiens',

      createPerson(name) {
        return Person.create({ name });
      }
    });

    let tom = Person.create({
      name: 'Tom Dale'
    });
    let yehuda = Person.createPerson('Yehuda Katz');

    tom.sayHello(); // "Hello. My name is Tom Dale"
    yehuda.sayHello(); // "Hello. My name is Yehuda Katz"
    alert(Person.species); // "Homo sapiens"
    ```

    Note that `species` and `createPerson` are *not* valid on the `tom` and `yehuda`
    variables. They are only valid on `Person`.

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
    person: Ember.computed(function() {
      let personId = this.get('personId');
      return Person.create({ id: personId });
    }).meta({ type: Person })
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
    let proto = this.proto();
    let possibleDesc = proto[key];
    let desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;

    assert(
      `metaForProperty() could not find a computed property with key '${key}'.`,
      !!desc && desc instanceof ComputedProperty
    );
    return desc._meta || {};
  },

  _computedProperties: computed(function() {
    _hasCachedComputedProperties();
    let proto = this.proto();
    let property;
    let properties = [];

    for (let name in proto) {
      property = proto[name];

      if (property && property.isDescriptor) {
        properties.push({
          name,
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
    let property;
    let empty = {};

    let properties = get(this, '_computedProperties');

    for (let i = 0; i < properties.length; i++) {
      property = properties[i];
      callback.call(binding || this, property.name, property.meta || empty);
    }
  }
};

function injectedPropertyAssertion() {
  assert('Injected properties are invalid', validatePropertyInjections(this));
}

if (DEBUG) {
  /**
    Provides lookup-time type validation for injected properties.

    @private
    @method _onLookup
  */
  ClassMixinProps._onLookup = injectedPropertyAssertion;
}

/**
  Returns a hash of property names and container names that injected
  properties will lookup on the container lazily.

  @method _lazyInjections
  @return {Object} Hash of all lazy injected property keys to container names
  @private
*/
ClassMixinProps._lazyInjections = function() {
  let injections = {};
  let proto = this.proto();
  let key;
  let desc;

  for (key in proto) {
    desc = proto[key];
    if (desc instanceof InjectedProperty) {
      injections[key] = `${desc.type}:${desc.name || key}`;
    }
  }

  return injections;
};

let ClassMixin = Mixin.create(ClassMixinProps);

ClassMixin.ownerConstructor = CoreObject;

CoreObject.ClassMixin = ClassMixin;

ClassMixin.apply(CoreObject);
export default CoreObject;
