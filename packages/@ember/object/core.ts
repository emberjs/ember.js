/**
  @module @ember/object/core
*/

import { getFactoryFor, setFactoryFor } from '@ember/-internals/container';
import { type default as Owner, getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { meta } from '@ember/-internals/meta';
import {
  sendEvent,
  activateObserver,
  defineProperty,
  descriptorForProperty,
  isClassicDecorator,
  DEBUG_INJECTION_FUNCTIONS,
} from '@ember/-internals/metal';
import makeArray from '@ember/array/make';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { destroy, isDestroying, isDestroyed, registerDestructor } from '@glimmer/destroyable';
import { OWNER } from '@glimmer/owner';

const wasApplied = new WeakSet();

const initCalled = DEBUG ? new WeakSet() : undefined; // only used in debug builds to enable the proxy trap

const destroyCalled = new Set();

function ensureDestroyCalled(instance: CoreObject) {
  if (!destroyCalled.has(instance)) {
    instance.destroy();
  }
}

function initialize(obj: CoreObject, properties?: unknown) {
  let m = meta(obj);

  if (properties !== undefined) {
    assert(
      'EmberObject.create only accepts objects.',
      typeof properties === 'object' && properties !== null
    );

    let concatenatedProperties = obj.concatenatedProperties;

    let keyNames = Object.keys(properties);

    for (let keyName of keyNames) {
      // SAFETY: this cast as a Record is safe because all object types can be
      // indexed in JS, and we explicitly type it as returning `unknown`, so the
      // result *must* be checked below.
      let value: unknown = (properties as Record<string, unknown>)[keyName];

      assert(
        'EmberObject.create no longer supports defining computed ' +
          'properties. Define computed properties in the class definition.',
        !isClassicDecorator(value)
      );

      let possibleDesc = descriptorForProperty(obj, keyName, m);
      let isDescriptor = possibleDesc !== undefined;

      if (!isDescriptor) {
        if (
          concatenatedProperties !== undefined &&
          concatenatedProperties.length > 0 &&
          concatenatedProperties.includes(keyName)
        ) {
          let baseValue = (obj as any)[keyName];
          if (baseValue) {
            value = makeArray(baseValue).concat(value);
          } else {
            value = makeArray(value);
          }
        }
      }

      if (isDescriptor) {
        possibleDesc.set(obj, keyName, value);
      } else {
        if (DEBUG) {
          defineProperty(obj, keyName, null, value, m); // setup mandatory setter
        } else {
          (obj as any)[keyName] = value;
        }
      }
    }
  }

  // using DEBUG here to avoid the extraneous variable when not needed
  if (DEBUG) {
    initCalled!.add(obj);
  }
  obj.init(properties);

  m.unsetInitializing();

  let observerEvents = m.observerEvents();

  if (observerEvents !== undefined) {
    for (let i = 0; i < observerEvents.length; i++) {
      activateObserver(obj, observerEvents[i].event, observerEvents[i].sync);
    }
  }

  sendEvent(obj, 'init', undefined, undefined, m);
}

/**
  `CoreObject` is the base class for all Ember constructs.

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

  @class CoreObject
  @public
*/
class CoreObject {
  /** @internal */
  [OWNER]?: Owner;

  constructor(owner?: Owner) {
    this[OWNER] = owner;

    // prepare prototype...
    (this.constructor as typeof CoreObject).proto();

    let self = this;

    const destroyable = self;
    registerDestructor(self, ensureDestroyCalled, true);
    registerDestructor(self, () => destroyable.willDestroy());

    // disable chains
    let m = meta(self);

    m.setInitializing();

    // only return when in debug builds and `self` is the proxy created above
    if (DEBUG && self !== this) {
      return self;
    }
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
  init(_properties: object | undefined) {}

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

  set isDestroyed(_value) {
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

  set isDestroying(_value) {
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

    @method toString
    @return {String} string representation
    @public
  */
  toString() {
    return `<${getFactoryFor(this) || '(unknown)'}:${guidFor(this)}>`;
  }

  /**
    Creates an instance of a class. Accepts either no arguments, or an object
    containing values to initialize the newly instantiated object with.

    ```javascript
    import EmberObject from '@ember/object';

    class Person extends EmberObject {
      helloWorld() {
        alert(`Hi, my name is ${this.get('name')}`);
      }
    }

    let tom = Person.create({
      name: 'Tom Dale'
    });

    tom.helloWorld(); // alerts "Hi, my name is Tom Dale".
    ```

    `create` will call the `init` function if defined.

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
  static create<
    C extends typeof CoreObject,
    I extends InstanceType<C>,
    K extends keyof I,
  >(this: C, props?: Partial<{ [Key in K]: I[Key] }>): InstanceType<C> {
    let instance: InstanceType<C>;

    if (props !== undefined) {
      instance = new this(getOwner(props)) as InstanceType<C>;
      // TODO(SAFETY): at present, we cannot actually rely on this being set,
      // because a number of acceptance tests are (incorrectly? Unclear!)
      // relying on the ability to run through this path with `factory` being
      // `undefined`. It's *possible* that actually means that the type for
      // `setFactoryFor()` should allow `undefined`, but we typed it the other
      // way for good reason! Accordingly, this *casts* `factory`, and the
      // commented-out `assert()` is here in the hope that we can enable it
      // after addressing tests *or* updating the call signature here.
      let factory = getFactoryFor(props);
      // assert(`missing factory when creating object ${instance}`, factory !== undefined);
      setFactoryFor(instance, factory as NonNullable<typeof factory>);
    } else {
      instance = new this() as InstanceType<C>;
    }

    initialize(instance, props);

    // SAFETY: The `initialize` call is responsible to merge the prototype chain
    // so that this holds.
    return instance as InstanceType<C>;
  }

  static detect(obj: unknown) {
    if ('function' !== typeof obj) {
      return false;
    }
    while (obj) {
      if (obj === this) {
        return true;
      }
      obj = (obj as typeof CoreObject).superclass;
    }
    return false;
  }

  static detectInstance(obj: unknown) {
    return obj instanceof this;
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
    }
    return p;
  }

  static toString() {
    return `<${getFactoryFor(this) || '(unknown)'}:constructor>`;
  }

  static isClass = true;
  static isMethod = false;

  static _onLookup?: (debugContainerKey: string) => void;
  static _lazyInjections?: () => void;

  declare concatenatedProperties?: string[] | string;
}

if (DEBUG) {
  /**
    Provides lookup-time type validation for injected properties.

    @private
    @method _onLookup
  */
  CoreObject._onLookup = function injectedPropertyAssertion(debugContainerKey: string) {
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
    let injections: Record<string, { namespace: unknown; source: unknown; specifier: string }> = {};
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

export default CoreObject;
