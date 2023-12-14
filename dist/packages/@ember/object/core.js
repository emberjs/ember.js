/**
  @module @ember/object/core
*/
import { getFactoryFor, setFactoryFor } from '@ember/-internals/container';
import { getOwner } from '@ember/-internals/owner';
import { guidFor, isInternalSymbol } from '@ember/-internals/utils';
import { meta } from '@ember/-internals/meta';
import { PROXY_CONTENT, sendEvent, activateObserver, defineProperty, descriptorForProperty, isClassicDecorator, DEBUG_INJECTION_FUNCTIONS, hasUnknownProperty } from '@ember/-internals/metal';
import Mixin, { applyMixin } from '@ember/object/mixin';
import { ActionHandler } from '@ember/-internals/runtime';
import { makeArray } from '@ember/array';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { destroy, isDestroying, isDestroyed, registerDestructor } from '@glimmer/destroyable';
import { OWNER } from '@glimmer/owner';
function hasSetUnknownProperty(val) {
  return typeof val === 'object' && val !== null && typeof val.setUnknownProperty === 'function';
}
function hasToStringExtension(val) {
  return typeof val === 'object' && val !== null && typeof val.toStringExtension === 'function';
}
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
    assert('EmberObject.create only accepts objects.', typeof properties === 'object' && properties !== null);
    assert('EmberObject.create no longer supports mixing in other ' + 'definitions, use .extend & .create separately instead.', !(properties instanceof Mixin));
    let concatenatedProperties = obj.concatenatedProperties;
    let mergedProperties = obj.mergedProperties;
    let keyNames = Object.keys(properties);
    for (let keyName of keyNames) {
      // SAFETY: this cast as a Record is safe because all object types can be
      // indexed in JS, and we explicitly type it as returning `unknown`, so the
      // result *must* be checked below.
      let value = properties[keyName];
      assert('EmberObject.create no longer supports defining computed ' + 'properties. Define computed properties using extend() or reopen() ' + 'before calling create().', !isClassicDecorator(value));
      assert('EmberObject.create no longer supports defining methods that call _super.', !(typeof value === 'function' && value.toString().indexOf('._super') !== -1));
      assert('`actions` must be provided at extend time, not at create time, ' + 'when Ember.ActionHandler is used (i.e. views, controllers & routes).', !(keyName === 'actions' && ActionHandler.detect(obj)));
      let possibleDesc = descriptorForProperty(obj, keyName, m);
      let isDescriptor = possibleDesc !== undefined;
      if (!isDescriptor) {
        if (concatenatedProperties !== undefined && concatenatedProperties.length > 0 && concatenatedProperties.includes(keyName)) {
          let baseValue = obj[keyName];
          if (baseValue) {
            value = makeArray(baseValue).concat(value);
          } else {
            value = makeArray(value);
          }
        }
        if (mergedProperties !== undefined && mergedProperties.length > 0 && mergedProperties.includes(keyName)) {
          let baseValue = obj[keyName];
          value = Object.assign({}, baseValue, value);
        }
      }
      if (isDescriptor) {
        possibleDesc.set(obj, keyName, value);
      } else if (hasSetUnknownProperty(obj) && !(keyName in obj)) {
        obj.setUnknownProperty(keyName, value);
      } else {
        if (DEBUG) {
          defineProperty(obj, keyName, null, value, m); // setup mandatory setter
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
  sendEvent(obj, 'init', undefined, undefined, m);
}
class CoreObject {
  constructor(owner) {
    this[OWNER] = owner;
    // prepare prototype...
    this.constructor.proto();
    let self;
    if (DEBUG && hasUnknownProperty(this)) {
      let messageFor = (obj, property) => {
        return `You attempted to access the \`${String(property)}\` property (of ${obj}).\n` + `Since Ember 3.1, this is usually fine as you no longer need to use \`.get()\`\n` + `to access computed properties. However, in this case, the object in question\n` + `is a special kind of Ember object (a proxy). Therefore, it is still necessary\n` + `to use \`.get('${String(property)}')\` in this case.\n\n` + `If you encountered this error because of third-party code that you don't control,\n` + `there is more information at https://github.com/emberjs/ember.js/issues/16148, and\n` + `you can help us improve this error message by telling us more about what happened in\n` + `this situation.`;
      };
      /* globals Proxy Reflect */
      self = new Proxy(this, {
        get(target, property, receiver) {
          if (property === PROXY_CONTENT) {
            return target;
          } else if (
          // init called will be set on the proxy, not the target, so get with the receiver
          !initCalled.has(receiver) || typeof property === 'symbol' || isInternalSymbol(property) || property === 'toJSON' || property === 'toString' || property === 'toStringExtension' || property === 'didDefineProperty' || property === 'willWatchProperty' || property === 'didUnwatchProperty' || property === 'didAddListener' || property === 'didRemoveListener' || property === 'isDescriptor' || property === '_onLookup' || property in target) {
            return Reflect.get(target, property, receiver);
          }
          let value = target.unknownProperty.call(receiver, property);
          if (typeof value !== 'function') {
            assert(messageFor(receiver, property), value === undefined || value === null);
          }
        }
      });
    } else {
      self = this;
    }
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
  init(_properties) {}
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
    let extension = hasToStringExtension(this) ? `:${this.toStringExtension()}` : '';
    return `<${getFactoryFor(this) || '(unknown)'}:${guidFor(this)}${extension}>`;
  }
  static extend(...mixins) {
    let Class = class extends this {};
    reopen.apply(Class.PrototypeMixin, mixins);
    return Class;
  }
  static create(...args) {
    let props = args[0];
    let instance;
    if (props !== undefined) {
      instance = new this(getOwner(props));
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
      setFactoryFor(instance, factory);
    } else {
      instance = new this();
    }
    if (args.length <= 1) {
      initialize(instance, props);
    } else {
      initialize(instance, flattenProps.apply(this, args));
    }
    // SAFETY: The `initialize` call is responsible to merge the prototype chain
    // so that this holds.
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
  static reopen(...args) {
    this.willReopen();
    reopen.apply(this.PrototypeMixin, args);
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
  static reopenClass(...mixins) {
    applyMixin(this, mixins);
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
    assert(`metaForProperty() could not find a computed property with key '${key}'.`, possibleDesc !== undefined);
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
  let initProperties = {};
  for (let properties of props) {
    assert('EmberObject.create no longer supports mixing in other ' + 'definitions, use .extend & .create separately instead.', !(properties instanceof Mixin));
    let keyNames = Object.keys(properties);
    for (let j = 0, k = keyNames.length; j < k; j++) {
      let keyName = keyNames[j];
      let value = properties[keyName];
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
        assert(`Defining \`${key}\` as an injected controller property on a non-controller (\`${debugContainerKey}\`) is not allowed.`, type === 'controller' || DEBUG_INJECTION_FUNCTIONS.get(desc._getter).type !== 'controller');
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
        let {
          namespace,
          source,
          type,
          name
        } = DEBUG_INJECTION_FUNCTIONS.get(desc._getter);
        injections[key] = {
          namespace,
          source,
          specifier: `${type}:${name || key}`
        };
      }
    }
    return injections;
  };
}
export default CoreObject;