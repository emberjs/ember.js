/**
  @module @ember/object
*/

import { FACTORY_FOR } from 'container';
import { assign } from '@ember/polyfills';
import {
  guidFor,
  getName,
  setName,
  makeArray,
  HAS_NATIVE_PROXY,
  isInternalSymbol,
} from 'ember-utils';
import { schedule } from '@ember/runloop';
import {
  PROXY_CONTENT,
  descriptorFor,
  meta,
  peekMeta,
  finishChains,
  sendEvent,
  Mixin,
  defineProperty,
  ComputedProperty,
  InjectedProperty,
  deleteMeta,
  descriptor,
  classToString,
} from 'ember-metal';
import ActionHandler from '../mixins/action_handler';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { ENV } from 'ember-environment';

const applyMixin = Mixin._apply;
const reopen = Mixin.prototype.reopen;

function makeCtor(base) {
  // Note: avoid accessing any properties on the object since it makes the
  // method a lot faster. This is glue code so we want it to be as fast as
  // possible.

  let wasApplied = false;
  let Class;

  if (base) {
    Class = class extends base {
      constructor(properties) {
        if (!wasApplied) {
          Class.proto(); // prepare prototype...
        }

        super(properties);
      }
    };
  } else {
    let initFactory;
    Class = class {
      constructor(properties) {
        if (!wasApplied) {
          Class.proto(); // prepare prototype...
        }

        let self = this;

        if (initFactory !== void 0) {
          FACTORY_FOR.set(this, initFactory);
          initFactory = void 0;
        }

        let beforeInitCalled; // only used in debug builds to enable the proxy trap

        // using DEBUG here to avoid the extraneous variable when not needed
        if (DEBUG) {
          beforeInitCalled = true;
        }

        if (DEBUG && HAS_NATIVE_PROXY && typeof self.unknownProperty === 'function') {
          let messageFor = (obj, property) => {
            return (
              `You attempted to access the \`${String(property)}\` property (of ${obj}).\n` +
              `Since Ember 3.1, this is usually fine as you no longer need to use \`.get()\`\n` +
              `to access computed properties. However, in this case, the object in question\n` +
              `is a special kind of Ember object (a proxy). Therefore, it is still necessary\n` +
              `to use \`.get('${String(property)}')\` in this case.\n\n` +
              `If you encountered this error because of third-party code that you don't control,\n` +
              `there is more information at https://github.com/emberjs/ember.js/issues/16148, and\n` +
              `you can help us improve this error message by telling us more about what happened in\n` +
              `this situation.`
            );
          };

          /* globals Proxy Reflect */
          self = new Proxy(this, {
            get(target, property, receiver) {
              if (property === PROXY_CONTENT) {
                return target;
              } else if (
                beforeInitCalled ||
                typeof property === 'symbol' ||
                isInternalSymbol(property) ||
                property === 'toJSON' ||
                property === 'toString' ||
                property === 'toStringExtension' ||
                property === 'didDefineProperty' ||
                property === 'willWatchProperty' ||
                property === 'didUnwatchProperty' ||
                property === 'didAddListener' ||
                property === 'didRemoveListener' ||
                property === 'isDescriptor' ||
                property in target
              ) {
                return Reflect.get(target, property, receiver);
              }

              let value = target.unknownProperty.call(receiver, property);

              if (typeof value !== 'function') {
                assert(messageFor(receiver, property), value === undefined || value === null);
              }
            },
          });

          FACTORY_FOR.set(self, FACTORY_FOR.get(this));
        }

        let m = meta(self);
        let proto = m.proto;
        m.proto = self;

        if (properties !== undefined) {
          assert(
            'EmberObject.create only accepts objects.',
            typeof properties === 'object' && properties !== null
          );

          assert(
            'EmberObject.create no longer supports mixing in other ' +
              'definitions, use .extend & .create separately instead.',
            !(properties instanceof Mixin)
          );

          let concatenatedProperties = self.concatenatedProperties;
          let mergedProperties = self.mergedProperties;
          let hasConcatenatedProps =
            concatenatedProperties !== undefined && concatenatedProperties.length > 0;
          let hasMergedProps = mergedProperties !== undefined && mergedProperties.length > 0;

          let keyNames = Object.keys(properties);

          for (let i = 0; i < keyNames.length; i++) {
            let keyName = keyNames[i];
            let value = properties[keyName];

            if (ENV._ENABLE_BINDING_SUPPORT && Mixin.detectBinding(keyName)) {
              m.writeBindings(keyName, value);
            }

            assert(
              'EmberObject.create no longer supports defining computed ' +
                'properties. Define computed properties using extend() or reopen() ' +
                'before calling create().',
              !(value instanceof ComputedProperty)
            );
            assert(
              'EmberObject.create no longer supports defining methods that call _super.',
              !(typeof value === 'function' && value.toString().indexOf('._super') !== -1)
            );
            assert(
              '`actions` must be provided at extend time, not at create time, ' +
                'when Ember.ActionHandler is used (i.e. views, controllers & routes).',
              !(keyName === 'actions' && ActionHandler.detect(this))
            );

            let possibleDesc = descriptorFor(self, keyName, m);
            let isDescriptor = possibleDesc !== undefined;

            if (!isDescriptor) {
              let baseValue = self[keyName];

              if (hasConcatenatedProps && concatenatedProperties.indexOf(keyName) > -1) {
                value = makeArray(baseValue).concat(makeArray(value));
              }

              if (hasMergedProps && mergedProperties.indexOf(keyName) > -1) {
                value = assign({}, baseValue, value);
              }
            }

            if (isDescriptor) {
              possibleDesc.set(self, keyName, value);
            } else if (typeof self.setUnknownProperty === 'function' && !(keyName in self)) {
              self.setUnknownProperty(keyName, value);
            } else {
              if (DEBUG) {
                defineProperty(self, keyName, null, value); // setup mandatory setter
              } else {
                self[keyName] = value;
              }
            }
          }
        }

        if (ENV._ENABLE_BINDING_SUPPORT) {
          Mixin.finishPartial(self, m);
        }

        // using DEBUG here to avoid the extraneous variable when not needed
        if (DEBUG) {
          beforeInitCalled = false;
        }
        self.init(...arguments);

        m.proto = proto;
        finishChains(m);
        sendEvent(self, 'init', undefined, undefined, undefined, m);

        // only return when in debug builds and `self` is the proxy created above
        if (DEBUG && self !== this) {
          return self;
        }
      }

      static _initFactory(factory) {
        initFactory = factory;
      }
    };
  }

  Class.willReopen = function() {
    if (wasApplied) {
      Class.PrototypeMixin = Mixin.create(Class.PrototypeMixin);
    }

    wasApplied = false;
  };

  Class.proto = function() {
    let superclass = Class.superclass;
    if (superclass) {
      superclass.proto();
    }

    if (!wasApplied) {
      wasApplied = true;
      Class.PrototypeMixin.applyPartial(Class.prototype);
    }

    // Native classes will call the nearest superclass's proto function,
    // and proto is expected to return the current instance's prototype,
    // so we need to return it from `this` instead
    return this.prototype;
  };

  return Class;
}

const IS_DESTROYED = descriptor({
  configurable: true,
  enumerable: false,

  get() {
    return peekMeta(this).isSourceDestroyed();
  },

  set(value) {
    assert(
      `You cannot set \`${this}.isDestroyed\` directly, please use \`.destroy()\`.`,
      value === IS_DESTROYED
    );
  },
});

const IS_DESTROYING = descriptor({
  configurable: true,
  enumerable: false,

  get() {
    return peekMeta(this).isSourceDestroying();
  },

  set(value) {
    assert(
      `You cannot set \`${this}.isDestroying\` directly, please use \`.destroy()\`.`,
      value === IS_DESTROYING
    );
  },
});

/**
  @class CoreObject
  @public
*/
let CoreObject = makeCtor();
CoreObject.prototype.toString = classToString;
CoreObject.toString = classToString;
setName(CoreObject, 'Ember.CoreObject');

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
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend({
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
    import EmberObject from '@ember/object';

    const Bar = EmberObject.extend({
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

    In `Component` the `classNames`, `classNameBindings` and
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
    import EmberObject from '@ember/object';

    const Bar = EmberObject.extend({
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

    In `Route` the `queryParams` property is merged.

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
  isDestroyed: IS_DESTROYED,

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
    @public
  */
  isDestroying: IS_DESTROYING,

  /**
    Destroys an object by setting the `isDestroyed` flag and removing its
    metadata, which effectively destroys observers and bindings.

    If you try to set a property on a destroyed object, an exception will be
    raised.

    Note that destruction is scheduled for the end of the run loop and does not
    happen immediately.  It will set an isDestroying flag immediately.

    @method destroy
    @return {EmberObject} receiver
    @public
  */
  destroy() {
    let m = peekMeta(this);
    if (m.isSourceDestroying()) {
      return;
    }

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
    if (m.isSourceDestroyed()) {
      return;
    }
    deleteMeta(this);
    m.setSourceDestroyed();
  },

  /**
    Returns a string representation which attempts to provide more information
    than Javascript's `toString` typically does, in a generic way for all Ember
    objects.

    ```javascript
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend();
    person = Person.create();
    person.toString(); //=> "<Person:ember1024>"
    ```

    If the object's class is not defined on an Ember namespace, it will
    indicate it is a subclass of the registered superclass:

    ```javascript
    const Student = Person.extend();
    let student = Student.create();
    student.toString(); //=> "<(subclass of Person):ember1025>"
    ```

    If the method `toStringExtension` is defined, its return value will be
    included in the output.

    ```javascript
    const Teacher = Person.extend({
      toStringExtension() {
        return this.get('fullName');
      }
    });
    teacher = Teacher.create();
    teacher.toString(); //=> "<Teacher:ember1026:Tom Dale>"
    ```

    @method toString
    @return {String} string representation
    @public
  */
  toString() {
    let hasToStringExtension = typeof this.toStringExtension === 'function';
    let extension = hasToStringExtension ? `:${this.toStringExtension()}` : '';

    let ret = `<${getName(this) || FACTORY_FOR.get(this) || this.constructor.toString()}:${guidFor(
      this
    )}${extension}>`;

    return ret;
  },
});

CoreObject.PrototypeMixin.ownerConstructor = CoreObject;

CoreObject.__super__ = null;

let ClassMixinProps = {
  isClass: true,

  isMethod: false,
  /**
    Creates a new subclass.

    ```javascript
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend({
      say(thing) {
        alert(thing);
       }
    });
    ```

    This defines a new subclass of EmberObject: `Person`. It contains one method: `say()`.

    You can also create a subclass from any existing class by calling its `extend()` method.
    For example, you might want to create a subclass of Ember's built-in `Component` class:

    ```javascript
    import Component from '@ember/component';

    const PersonComponent = Component.extend({
      tagName: 'li',
      classNameBindings: ['isAdministrator']
    });
    ```

    When defining a subclass, you can override methods but still access the
    implementation of your parent class by calling the special `_super()` method:

    ```javascript
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend({
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
    import EmberObject from '@ember/object';
    import Mixin from '@ember/object/mixin';

    const Person = EmberObject.extend({
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
    @for @ember/object
    @param {Mixin} [mixins]* One or more Mixin classes
    @param {Object} [arguments]* Object containing values to use within the new class
    @public
  */
  extend() {
    let Class = makeCtor(this);

    Class.ClassMixin = Mixin.create(this.ClassMixin);
    Class.PrototypeMixin = Mixin.create(this.PrototypeMixin);

    Class.ClassMixin.ownerConstructor = Class;
    Class.PrototypeMixin.ownerConstructor = Class;

    reopen.apply(Class.PrototypeMixin, arguments);

    Class.superclass = this;
    Class.__super__ = this.prototype;

    let proto = Class.prototype;
    meta(proto).proto = proto; // this will disable observers on prototype

    Class.ClassMixin.apply(Class);
    return Class;
  },

  /**
    Creates an instance of a class. Accepts either no arguments, or an object
    containing values to initialize the newly instantiated object with.

    ```javascript
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend({
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
    `AnyObject.extend`

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
    @for @ember/object
    @static
    @param [arguments]*
    @public
  */
  create(props, extra) {
    let C = this;

    if (extra === undefined) {
      return new C(props);
    } else {
      return new C(flattenProps.apply(this, arguments));
    }
  },

  /**
    Augments a constructor's prototype with additional
    properties and functions:

    ```javascript
    import EmberObject from '@ember/object';

    const MyObject = EmberObject.extend({
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
    @for @ember/object
    @static
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
    import EmberObject from '@ember/object';

    const MyObject = EmberObject.extend({
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
    import EmberObject from '@ember/object';

    const Person = EmberObject.extend({
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
    @for @ember/object
    @static
    @public
  */
  reopenClass() {
    reopen.apply(this.ClassMixin, arguments);
    applyMixin(this, arguments, false);
    return this;
  },

  detect(obj) {
    if ('function' !== typeof obj) {
      return false;
    }
    while (obj) {
      if (obj === this) {
        return true;
      }
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
    import { computed } from '@ember/object';

    person: computed(function() {
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
    let proto = this.proto(); // ensure prototype is initialized
    let possibleDesc = descriptorFor(proto, key);

    assert(
      `metaForProperty() could not find a computed property with key '${key}'.`,
      possibleDesc !== undefined
    );

    return possibleDesc._meta || {};
  },

  /**
    Iterate over each computed property for the class, passing its name
    and any associated metadata (see `metaForProperty`) to the callback.

    @static
    @method eachComputedProperty
    @param {Function} callback
    @param {Object} binding
    @private
  */
  eachComputedProperty(callback, binding = this) {
    this.proto(); // ensure prototype is initialized
    let empty = {};

    meta(this.prototype).forEachDescriptors((name, descriptor) => {
      if (descriptor.enumerable) {
        let meta = descriptor._meta || empty;
        callback.call(binding, name, meta);
      }
    });
  },
};

function flattenProps(...props) {
  let { concatenatedProperties, mergedProperties } = this;
  let hasConcatenatedProps =
    concatenatedProperties !== undefined && concatenatedProperties.length > 0;
  let hasMergedProps = mergedProperties !== undefined && mergedProperties.length > 0;

  let initProperties = {};

  for (let i = 0; i < props.length; i++) {
    let properties = props[i];

    assert(
      'EmberObject.create no longer supports mixing in other ' +
        'definitions, use .extend & .create separately instead.',
      !(properties instanceof Mixin)
    );

    let keyNames = Object.keys(properties);

    for (let j = 0, k = keyNames.length; j < k; j++) {
      let keyName = keyNames[j];
      let value = properties[keyName];

      if (hasConcatenatedProps && concatenatedProperties.indexOf(keyName) > -1) {
        let baseValue = initProperties[keyName];

        if (baseValue) {
          value = makeArray(baseValue).concat(value);
        } else {
          value = makeArray(value);
        }
      }

      if (hasMergedProps && mergedProperties.indexOf(keyName) > -1) {
        let baseValue = initProperties[keyName];

        value = assign({}, baseValue, value);
      }

      initProperties[keyName] = value;
    }
  }

  return initProperties;
}

if (DEBUG) {
  /**
    Provides lookup-time type validation for injected properties.

    @private
    @method _onLookup
  */
  ClassMixinProps._onLookup = function injectedPropertyAssertion(debugContainerKey) {
    let [type] = debugContainerKey.split(':');
    let proto = this.proto();

    for (let key in proto) {
      let desc = descriptorFor(proto, key);
      if (desc instanceof InjectedProperty) {
        assert(
          `Defining \`${key}\` as an injected controller property on a non-controller (\`${debugContainerKey}\`) is not allowed.`,
          type === 'controller' || desc.type !== 'controller'
        );
      }
    }
  };

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
      desc = descriptorFor(proto, key);
      if (desc instanceof InjectedProperty) {
        injections[key] = {
          namespace: desc.namespace,
          source: desc.source,
          specifier: `${desc.type}:${desc.name || key}`,
        };
      }
    }

    return injections;
  };
}

let ClassMixin = Mixin.create(ClassMixinProps);

ClassMixin.ownerConstructor = CoreObject;

CoreObject.ClassMixin = ClassMixin;

ClassMixin.apply(CoreObject);
export default CoreObject;
