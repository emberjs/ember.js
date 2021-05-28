/**
  @module @ember/object
*/

import { getFactoryFor, setFactoryFor } from '@ember/-internals/container';
import { getOwner, LEGACY_OWNER } from '@ember/-internals/owner';
import {
  guidFor,
  lookupDescriptor,
  inspect,
  makeArray,
  HAS_NATIVE_PROXY,
  isInternalSymbol,
} from '@ember/-internals/utils';
import { meta } from '@ember/-internals/meta';
import {
  PROXY_CONTENT,
  sendEvent,
  Mixin,
  activateObserver,
  applyMixin,
  defineProperty,
  descriptorForProperty,
  isClassicDecorator,
  DEBUG_INJECTION_FUNCTIONS,
  TrackedDescriptor,
} from '@ember/-internals/metal';
import ActionHandler from '../mixins/action_handler';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { _WeakSet as WeakSet } from '@glimmer/util';
import { destroy, isDestroying, isDestroyed, registerDestructor } from '@glimmer/destroyable';
import { OWNER } from '@glimmer/owner';

const reopen = Mixin.prototype.reopen;

const wasApplied = new WeakSet();
const prototypeMixinMap = new WeakMap();

const initCalled = DEBUG ? new WeakSet() : undefined; // only used in debug builds to enable the proxy trap

const destroyCalled = new Set();

function ensureDestroyCalled(instance) {
  if (!destroyCalled.has(instance)) {
    instance.destroy();
  }
}

function initialize(obj, properties) {
  let m = meta(obj);

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

    let injectedProperties;
    if (DEBUG) {
      // these are all the implicit injectinos
      injectedProperties = [];

      let factory = getFactoryFor(obj);
      if (factory) {
        for (let injection in factory.injections) {
          if (factory.injections[injection] === properties[injection]) {
            injectedProperties.push(injection);
          }
        }
      }
    }

    let concatenatedProperties = obj.concatenatedProperties;
    let mergedProperties = obj.mergedProperties;
    let hasConcatenatedProps =
      concatenatedProperties !== undefined && concatenatedProperties.length > 0;
    let hasMergedProps = mergedProperties !== undefined && mergedProperties.length > 0;

    let keyNames = Object.keys(properties);

    for (let i = 0; i < keyNames.length; i++) {
      let keyName = keyNames[i];
      let value = properties[keyName];

      assert(
        'EmberObject.create no longer supports defining computed ' +
          'properties. Define computed properties using extend() or reopen() ' +
          'before calling create().',
        !isClassicDecorator(value)
      );
      assert(
        'EmberObject.create no longer supports defining methods that call _super.',
        !(typeof value === 'function' && value.toString().indexOf('._super') !== -1)
      );
      assert(
        '`actions` must be provided at extend time, not at create time, ' +
          'when Ember.ActionHandler is used (i.e. views, controllers & routes).',
        !(keyName === 'actions' && ActionHandler.detect(obj))
      );

      let possibleDesc = descriptorForProperty(obj, keyName, m);
      let isDescriptor = possibleDesc !== undefined;

      if (!isDescriptor) {
        if (hasConcatenatedProps && concatenatedProperties.indexOf(keyName) > -1) {
          let baseValue = obj[keyName];
          if (baseValue) {
            value = makeArray(baseValue).concat(value);
          } else {
            value = makeArray(value);
          }
        }

        if (hasMergedProps && mergedProperties.indexOf(keyName) > -1) {
          let baseValue = obj[keyName];
          value = Object.assign({}, baseValue, value);
        }
      }

      if (isDescriptor) {
        if (DEBUG && injectedProperties.indexOf(keyName) !== -1) {
          // need to check if implicit injection owner.inject('component:my-component', 'foo', 'service:bar') does not match explicit injection @service foo
          // implicit injection takes precedence so need to tell user to rename property on obj
          let isInjectedProperty = DEBUG_INJECTION_FUNCTIONS.has(possibleDesc._getter);
          if (isInjectedProperty && value !== possibleDesc.get(obj, keyName)) {
            implicitInjectionDeprecation(
              keyName,
              `You have explicitly defined a service injection for the '${keyName}' property on ${inspect(
                obj
              )}. However, a different service or value was injected via implicit injections which overrode your explicit injection. Implicit injections have been deprecated, and will be removed in the near future. In order to prevent breakage, you should inject the same value explicitly that is currently being injected implicitly.`
            );
          } else if (possibleDesc instanceof TrackedDescriptor) {
            let descValue = possibleDesc.get(obj, keyName);

            if (value !== descValue) {
              implicitInjectionDeprecation(
                keyName,
                `A value was injected implicitly on the '${keyName}' tracked property of an instance of ${inspect(
                  obj
                )}, overwriting the original value which was ${inspect(
                  descValue
                )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
              );
            }
          } else if (possibleDesc._setter === undefined) {
            implicitInjectionDeprecation(
              keyName,
              `A value was injected implicitly on the '${keyName}' computed property of an instance of ${inspect(
                obj
              )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
            );
          }
        }

        possibleDesc.set(obj, keyName, value);
      } else if (typeof obj.setUnknownProperty === 'function' && !(keyName in obj)) {
        obj.setUnknownProperty(keyName, value);
      } else {
        if (DEBUG) {
          // If deprecation, either 1) an accessor descriptor or 2) class field declaration 3) only an implicit injection
          let desc = lookupDescriptor(obj, keyName);

          if (injectedProperties.indexOf(keyName) === -1) {
            // Value was not an injected property, define in like normal
            defineProperty(obj, keyName, null, value, m); // setup mandatory setter
          } else if (desc) {
            // If the property is a value prop, and it isn't the expected value,
            // then we can warn the user when they attempt to use the value
            if ('value' in desc && desc.value !== value) {
              // implicit injection does not match value descriptor set on object
              defineSelfDestructingImplicitInjectionGetter(
                obj,
                keyName,
                value,
                `A value was injected implicitly on the '${keyName}' property of an instance of ${inspect(
                  obj
                )}, overwriting the original value which was ${inspect(
                  desc.value
                )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
              );
            } else {
              // Otherwise, the value is either a getter/setter, or it is the correct value.
              // If it is a getter/setter, then we don't know what activating it might do - it could
              // be that the user only defined a getter, and so the value will not be set at all. It
              // could be that the setter is a no-op that does nothing. Both of these are valid ways
              // to "override" an implicit injection, so we can't really warn here. So, assign the
              // value like we would normally.
              obj[keyName] = value;
            }
          } else {
            defineSelfDestructingImplicitInjectionGetter(
              obj,
              keyName,
              value,
              `A value was injected implicitly on the '${keyName}' property of an instance of ${inspect(
                obj
              )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
            );
          }
        } else {
          obj[keyName] = value;
        }
      }
    }
  }

  // using DEBUG here to avoid the extraneous variable when not needed
  if (DEBUG) {
    initCalled.add(obj);
  }
  obj.init(properties);

  m.unsetInitializing();

  let observerEvents = m.observerEvents();

  if (observerEvents !== undefined) {
    for (let i = 0; i < observerEvents.length; i++) {
      activateObserver(obj, observerEvents[i].event, observerEvents[i].sync);
    }
  }

  sendEvent(obj, 'init', undefined, undefined, undefined, m);
}

function defineSelfDestructingImplicitInjectionGetter(obj, keyName, value, message) {
  Object.defineProperty(obj, keyName, {
    configurable: true,
    enumerable: true,
    get() {
      // only want to deprecate on first access so we make this self destructing
      Object.defineProperty(obj, keyName, { value });

      implicitInjectionDeprecation(keyName, message);
      return value;
    },
  });
}

/**
  `CoreObject` is the base class for all Ember constructs. It establishes a
  class system based on Ember's Mixin system, and provides the basis for the
  Ember Object Model. `CoreObject` should generally not be used directly,
  instead you should use `EmberObject`.

  ## Usage

  You can define a class by extending from `CoreObject` using the `extend`
  method:

  ```js
  const Person = CoreObject.extend({
    name: 'Tomster',
  });
  ```

  For detailed usage, see the [Object Model](https://guides.emberjs.com/release/object-model/)
  section of the guides.

  ## Usage with Native Classes

  Native JavaScript `class` syntax can be used to extend from any `CoreObject`
  based class:

  ```js
  class Person extends CoreObject {
    init() {
      super.init(...arguments);
      this.name = 'Tomster';
    }
  }
  ```

  Some notes about `class` usage:

  * `new` syntax is not currently supported with classes that extend from
    `EmberObject` or `CoreObject`. You must continue to use the `create` method
    when making new instances of classes, even if they are defined using native
    class syntax. If you want to use `new` syntax, consider creating classes
    which do _not_ extend from `EmberObject` or `CoreObject`. Ember features,
    such as computed properties and decorators, will still work with base-less
    classes.
  * Instead of using `this._super()`, you must use standard `super` syntax in
    native classes. See the [MDN docs on classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Super_class_calls_with_super)
    for more details.
  * Native classes support using [constructors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Constructor)
    to set up newly-created instances. Ember uses these to, among other things,
    support features that need to retrieve other entities by name, like Service
    injection and `getOwner`. To ensure your custom instance setup logic takes
    place after this important work is done, avoid using the `constructor` in
    favor of `init`.
  * Properties passed to `create` will be available on the instance by the time
    `init` runs, so any code that requires these values should work at that
    time.
  * Using native classes, and switching back to the old Ember Object model is
    fully supported.

  @class CoreObject
  @public
*/
class CoreObject {
  constructor(owner) {
    // setOwner has to set both OWNER and LEGACY_OWNER for backwards compatibility, and
    // LEGACY_OWNER is enumerable, so setting it would add an enumerable property to the object,
    // so we just set `OWNER` directly here.
    this[OWNER] = owner;

    // prepare prototype...
    this.constructor.proto();

    let self = this;

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
            // init called will be set on the proxy, not the target, so get with the receiver
            !initCalled.has(receiver) ||
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
            property === '_onLookup' ||
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
    }

    registerDestructor(self, ensureDestroyCalled, true);
    registerDestructor(self, () => self.willDestroy());

    // disable chains
    let m = meta(self);

    m.setInitializing();

    // only return when in debug builds and `self` is the proxy created above
    if (DEBUG && self !== this) {
      return self;
    }
  }

  // Empty setter for absorbing setting the LEGACY_OWNER, which should _not_
  // become an enumerable property, and should not be used in general.
  set [LEGACY_OWNER](value) {}

  reopen(...args) {
    applyMixin(this, args);
    return this;
  }

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

    NOTE: If you do override `init` for a framework class like `Component`
    from `@ember/component`, be sure to call `this._super(...arguments)`
    in your `init` declaration!
    If you don't, Ember may not have an opportunity to
    do important setup work, and you'll see strange behavior in your
    application.

    @method init
    @public
  */
  init() {}

  /**
    Defines the properties that will be concatenated from the superclass
    (instead of overridden).

    By default, when you extend an Ember class a property defined in
    the subclass overrides a property with the same name that is defined
    in the superclass. However, there are some cases where it is preferable
    to build up a property's value by combining the superclass' property
    value with the subclass' value. An example of this in use within Ember
    is the `classNames` property of `Component` from `@ember/component`.

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

  /**
    Destroyed object property flag.

    if this property is `true` the observers and bindings were already
    removed by the effect of calling the `destroy()` method.

    @property isDestroyed
    @default false
    @public
  */
  get isDestroyed() {
    return isDestroyed(this);
  }

  set isDestroyed(value) {
    assert(`You cannot set \`${this}.isDestroyed\` directly, please use \`.destroy()\`.`, false);
  }

  /**
    Destruction scheduled flag. The `destroy()` method has been called.

    The object stays intact until the end of the run loop at which point
    the `isDestroyed` flag is set.

    @property isDestroying
    @default false
    @public
  */
  get isDestroying() {
    return isDestroying(this);
  }

  set isDestroying(value) {
    assert(`You cannot set \`${this}.isDestroying\` directly, please use \`.destroy()\`.`, false);
  }

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
    // Used to ensure that manually calling `.destroy()` does not immediately call destroy again
    destroyCalled.add(this);

    try {
      destroy(this);
    } finally {
      destroyCalled.delete(this);
    }

    return this;
  }

  /**
    Override to implement teardown.

    @method willDestroy
    @public
  */
  willDestroy() {}

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

    return `<${getFactoryFor(this) || '(unknown)'}:${guidFor(this)}${extension}>`;
  }

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
      sing(thing) {
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
  static extend() {
    let Class = class extends this {};
    reopen.apply(Class.PrototypeMixin, arguments);
    return Class;
  }

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
  static create(props, extra) {
    let instance;

    if (props !== undefined) {
      instance = new this(getOwner(props));
      setFactoryFor(instance, getFactoryFor(props));
    } else {
      instance = new this();
    }

    if (extra === undefined) {
      initialize(instance, props);
    } else {
      initialize(instance, flattenProps.apply(this, arguments));
    }

    return instance;
  }

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
  static reopen() {
    this.willReopen();
    reopen.apply(this.PrototypeMixin, arguments);
    return this;
  }

  static willReopen() {
    let p = this.prototype;
    if (wasApplied.has(p)) {
      wasApplied.delete(p);

      // If the base mixin already exists and was applied, create a new mixin to
      // make sure that it gets properly applied. Reusing the same mixin after
      // the first `proto` call will cause it to get skipped.
      if (prototypeMixinMap.has(this)) {
        prototypeMixinMap.set(this, Mixin.create(this.PrototypeMixin));
      }
    }
  }

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
  static reopenClass() {
    applyMixin(this, arguments);
    return this;
  }

  static detect(obj) {
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
  }

  static detectInstance(obj) {
    return obj instanceof this;
  }

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
  static metaForProperty(key) {
    let proto = this.proto(); // ensure prototype is initialized
    let possibleDesc = descriptorForProperty(proto, key);

    assert(
      `metaForProperty() could not find a computed property with key '${key}'.`,
      possibleDesc !== undefined
    );

    return possibleDesc._meta || {};
  }

  /**
    Iterate over each computed property for the class, passing its name
    and any associated metadata (see `metaForProperty`) to the callback.

    @static
    @method eachComputedProperty
    @param {Function} callback
    @param {Object} binding
    @private
  */
  static eachComputedProperty(callback, binding = this) {
    this.proto(); // ensure prototype is initialized
    let empty = {};

    meta(this.prototype).forEachDescriptors((name, descriptor) => {
      if (descriptor.enumerable) {
        let meta = descriptor._meta || empty;
        callback.call(binding, name, meta);
      }
    });
  }

  static get PrototypeMixin() {
    let prototypeMixin = prototypeMixinMap.get(this);
    if (prototypeMixin === undefined) {
      prototypeMixin = Mixin.create();
      prototypeMixin.ownerConstructor = this;
      prototypeMixinMap.set(this, prototypeMixin);
    }
    return prototypeMixin;
  }

  static get superclass() {
    let c = Object.getPrototypeOf(this);
    return c !== Function.prototype ? c : undefined;
  }

  static proto() {
    let p = this.prototype;
    if (!wasApplied.has(p)) {
      wasApplied.add(p);
      let parent = this.superclass;
      if (parent) {
        parent.proto();
      }

      // If the prototype mixin exists, apply it. In the case of native classes,
      // it will not exist (unless the class has been reopened).
      if (prototypeMixinMap.has(this)) {
        this.PrototypeMixin.apply(p);
      }
    }
    return p;
  }

  static toString() {
    return `<${getFactoryFor(this) || '(unknown)'}:constructor>`;
  }
}

CoreObject.isClass = true;
CoreObject.isMethod = false;

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

        value = Object.assign({}, baseValue, value);
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
  CoreObject._onLookup = function injectedPropertyAssertion(debugContainerKey) {
    let [type] = debugContainerKey.split(':');
    let proto = this.proto();

    for (let key in proto) {
      let desc = descriptorForProperty(proto, key);
      if (desc && DEBUG_INJECTION_FUNCTIONS.has(desc._getter)) {
        assert(
          `Defining \`${key}\` as an injected controller property on a non-controller (\`${debugContainerKey}\`) is not allowed.`,
          type === 'controller' || DEBUG_INJECTION_FUNCTIONS.get(desc._getter).type !== 'controller'
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
  CoreObject._lazyInjections = function () {
    let injections = {};
    let proto = this.proto();
    let key;
    let desc;

    for (key in proto) {
      desc = descriptorForProperty(proto, key);
      if (desc && DEBUG_INJECTION_FUNCTIONS.has(desc._getter)) {
        let { namespace, source, type, name } = DEBUG_INJECTION_FUNCTIONS.get(desc._getter);

        injections[key] = {
          namespace,
          source,
          specifier: `${type}:${name || key}`,
        };
      }
    }

    return injections;
  };
}

function implicitInjectionDeprecation(keyName, msg = null) {
  deprecate(msg, false, {
    id: 'implicit-injections',
    until: '4.0.0',
    url: 'https://deprecations.emberjs.com/v3.x#toc_implicit-injections',
    for: 'ember-source',
    since: {
      enabled: '3.26.0',
    },
  });
}

export default CoreObject;
