import type { Meta } from '@ember/-internals/meta';
import { meta as metaFor } from '@ember/-internals/meta';
import { toString } from '@ember/-internals/utils';
import { assert, inspect } from '@ember/debug';
import { isDestroyed } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type { UpdatableTag } from '@glimmer/validator';
import {
  ALLOW_CYCLES,
  consumeTag,
  tagFor,
  tagMetaFor,
  track,
  untrack,
  updateTag,
  validateTag,
  valueForTag,
} from '@glimmer/validator';
import { finishLazyChains, getChainTagsForKeys } from './chain-tags';
import type {
  ExtendedMethodDecorator,
  DecoratorPropertyDescriptor,
  ElementDescriptor,
} from './decorator';
import {
  ComputedDescriptor,
  descriptorForDecorator,
  descriptorForProperty,
  isClassicDecorator,
  isElementDescriptor,
  makeComputedDecorator,
} from './decorator';
import expandProperties from './expand_properties';
import { addObserver, setObserverSuspended } from './observer';
import type { PropertyDidChange } from './property_events';
import {
  beginPropertyChanges,
  endPropertyChanges,
  hasPropertyDidChange,
  notifyPropertyChange,
  PROPERTY_DID_CHANGE,
} from './property_events';

export type ComputedPropertyGetterFunction = (this: any, key: string) => unknown;
export type ComputedPropertySetterFunction = (
  this: any,
  key: string,
  newVal: unknown,
  oldVal: unknown
) => unknown;

export interface ComputedPropertyGetterObj {
  get(this: any, key: string): unknown;
}

export interface ComputedPropertySetterObj {
  set(this: any, key: string, value: unknown): unknown;
}
export type ComputedPropertyObj =
  | ComputedPropertyGetterObj
  | ComputedPropertySetterObj
  | (ComputedPropertyGetterObj & ComputedPropertySetterObj);

export type ComputedPropertyGetter = ComputedPropertyGetterFunction | ComputedPropertyGetterObj;
export type ComputedPropertySetter = ComputedPropertySetterFunction | ComputedPropertySetterObj;

export type ComputedPropertyCallback = ComputedPropertyGetterFunction | ComputedPropertyObj;

/**
@module @ember/object
*/

const DEEP_EACH_REGEX = /\.@each\.[^.]+\./;

function noop(): void {}
/**
  `@computed` is a decorator that turns a JavaScript getter and setter into a
  computed property, which is a _cached, trackable value_. By default the getter
  will only be called once and the result will be cached. You can specify
  various properties that your computed property depends on. This will force the
  cached result to be cleared if the dependencies are modified, and lazily recomputed the next time something asks for it.

  In the following example we decorate a getter - `fullName` -  by calling
  `computed` with the property dependencies (`firstName` and `lastName`) as
  arguments. The `fullName` getter will be called once (regardless of how many
  times it is accessed) as long as its dependencies do not change. Once
  `firstName` or `lastName` are updated any future calls to `fullName` will
  incorporate the new values, and any watchers of the value such as templates
  will be updated:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let tom = new Person('Tom', 'Dale');

  tom.fullName; // 'Tom Dale'
  ```

  You can also provide a setter, which will be used when updating the computed
  property. Ember's `set` function must be used to update the property
  since it will also notify observers of the property:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(value) {
      let [firstName, lastName] = value.split(' ');

      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  You can also pass a getter function or object with `get` and `set` functions
  as the last argument to the computed decorator. This allows you to define
  computed property _macros_:

  ```js
  import { computed } from '@ember/object';

  function join(...keys) {
    return computed(...keys, function() {
      return keys.map(key => this[key]).join(' ');
    });
  }

  class Person {
    @join('firstName', 'lastName')
    fullName;
  }
  ```

  Note that when defined this way, getters and setters receive the _key_ of the
  property they are decorating as the first argument. Setters receive the value
  they are setting to as the second argument instead. Additionally, setters must
  _return_ the value that should be cached:

  ```javascript
  import { computed, set } from '@ember/object';

  function fullNameMacro(firstNameKey, lastNameKey) {
    return computed(firstNameKey, lastNameKey, {
      get() {
        return `${this[firstNameKey]} ${this[lastNameKey]}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, firstNameKey, firstName);
        set(this, lastNameKey, lastName);

        return value;
      }
    });
  }

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @fullNameMacro('firstName', 'lastName') fullName;
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  Computed properties can also be used in classic classes. To do this, we
  provide the getter and setter as the last argument like we would for a macro,
  and we assign it to a property on the class definition. This is an _anonymous_
  computed macro:

  ```javascript
  import EmberObject, { computed, set } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', {
      get() {
        return `${this.firstName} ${this.lastName}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, 'firstName', firstName);
        set(this, 'lastName', lastName);

        return value;
      }
    })
  });

  let tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  You can overwrite computed property without setters with a normal property (no
  longer computed) that won't change if dependencies change. You can also mark
  computed property as `.readOnly()` and block all attempts to set it.

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName').readOnly()
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let person = new Person();
  person.set('fullName', 'Peter Wagenet'); // Uncaught Error: Cannot set read-only property "fullName" on object: <(...):emberXXX>
  ```

  Additional resources:
  - [Decorators RFC](https://github.com/emberjs/rfcs/blob/master/text/0408-decorators.md)
  - [New CP syntax RFC](https://github.com/emberjs/rfcs/blob/master/text/0011-improved-cp-syntax.md)
  - [New computed syntax explained in "Ember 1.12 released" ](https://emberjs.com/blog/2015/05/13/ember-1-12-released.html#toc_new-computed-syntax)

  @class ComputedProperty
  @public
*/
export class ComputedProperty extends ComputedDescriptor {
  _readOnly = false;
  protected _hasConfig = false;

  _getter?: ComputedPropertyGetterFunction = undefined;
  _setter?: ComputedPropertySetterFunction = undefined;

  constructor(args: Array<string | ComputedPropertyCallback>) {
    super();

    let maybeConfig = args[args.length - 1];

    if (
      typeof maybeConfig === 'function' ||
      (maybeConfig !== null && typeof maybeConfig === 'object')
    ) {
      this._hasConfig = true;
      let config = args.pop();

      if (typeof config === 'function') {
        assert(
          `You attempted to pass a computed property instance to computed(). Computed property instances are decorator functions, and cannot be passed to computed() because they cannot be turned into decorators twice`,
          !isClassicDecorator(config)
        );

        this._getter = config;
      } else {
        const objectConfig = config as ComputedPropertyGetterObj & ComputedPropertySetterObj;
        assert(
          'computed expects a function or an object as last argument.',
          typeof objectConfig === 'object' && !Array.isArray(objectConfig)
        );
        assert(
          'Config object passed to computed can only contain `get` and `set` keys.',
          Object.keys(objectConfig).every((key) => key === 'get' || key === 'set')
        );
        assert(
          'Computed properties must receive a getter or a setter, you passed none.',
          Boolean(objectConfig.get) || Boolean(objectConfig.set)
        );
        this._getter = objectConfig.get || noop;
        this._setter = objectConfig.set;
      }
    }

    if (args.length > 0) {
      this._property(...(args as string[]));
    }
  }

  setup(obj: object, keyName: string, propertyDesc: DecoratorPropertyDescriptor, meta: Meta) {
    super.setup(obj, keyName, propertyDesc, meta);

    assert(
      `@computed can only be used on accessors or fields, attempted to use it with ${keyName} but that was a method. Try converting it to a getter (e.g. \`get ${keyName}() {}\`)`,
      !(propertyDesc && typeof propertyDesc.value === 'function')
    );

    assert(
      `@computed can only be used on empty fields. ${keyName} has an initial value (e.g. \`${keyName} = someValue\`)`,
      !propertyDesc || !propertyDesc.initializer
    );

    assert(
      `Attempted to apply a computed property that already has a getter/setter to a ${keyName}, but it is a method or an accessor. If you passed @computed a function or getter/setter (e.g. \`@computed({ get() { ... } })\`), then it must be applied to a field`,
      !(
        this._hasConfig &&
        propertyDesc &&
        (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function')
      )
    );

    if (this._hasConfig === false) {
      assert(
        `Attempted to use @computed on ${keyName}, but it did not have a getter or a setter. You must either pass a get a function or getter/setter to @computed directly (e.g. \`@computed({ get() { ... } })\`) or apply @computed directly to a getter/setter`,
        propertyDesc &&
          (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function')
      );

      let { get, set } = propertyDesc;

      if (get !== undefined) {
        this._getter = get as ComputedPropertyGetterFunction;
      }

      if (set !== undefined) {
        this._setter = function setterWrapper(_key, value) {
          let ret = set!.call(this, value);

          if (get !== undefined) {
            return typeof ret === 'undefined' ? get.call(this) : ret;
          }

          return ret;
        };
      }
    }
  }

  _property(...passedArgs: string[]): void {
    let args: string[] = [];

    function addArg(property: string): void {
      assert(
        `Dependent keys containing @each only work one level deep. ` +
          `You used the key "${property}" which is invalid. ` +
          `Please create an intermediary computed property or ` +
          `switch to using tracked properties.`,
        DEEP_EACH_REGEX.test(property) === false
      );

      args.push(property);
    }

    for (let arg of passedArgs) {
      expandProperties(arg, addArg);
    }

    this._dependentKeys = args;
  }

  get(obj: object, keyName: string): unknown {
    let meta = metaFor(obj);
    let tagMeta = tagMetaFor(obj);

    let propertyTag = tagFor(obj, keyName, tagMeta) as UpdatableTag;

    let ret;

    let revision = meta.revisionFor(keyName);

    if (revision !== undefined && validateTag(propertyTag, revision)) {
      ret = meta.valueFor(keyName);
    } else {
      // For backwards compatibility, we only throw if the CP has any dependencies. CPs without dependencies
      // should be allowed, even after the object has been destroyed, which is why we check _dependentKeys.
      assert(
        `Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed`,
        this._dependentKeys === undefined || !isDestroyed(obj)
      );

      let { _getter, _dependentKeys } = this;

      // Create a tracker that absorbs any trackable actions inside the CP
      untrack(() => {
        ret = _getter!.call(obj, keyName);
      });

      if (_dependentKeys !== undefined) {
        updateTag(propertyTag, getChainTagsForKeys(obj, _dependentKeys, tagMeta, meta));

        if (DEBUG) {
          ALLOW_CYCLES!.set(propertyTag, true);
        }
      }

      meta.setValueFor(keyName, ret);
      meta.setRevisionFor(keyName, valueForTag(propertyTag));

      finishLazyChains(meta, keyName, ret);
    }

    consumeTag(propertyTag);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(ret)) {
      consumeTag(tagFor(ret, '[]'));
    }

    return ret;
  }

  set(obj: object, keyName: string, value: unknown): unknown {
    if (this._readOnly) {
      this._throwReadOnlyError(obj, keyName);
    }

    assert(
      `Cannot override the computed property \`${keyName}\` on ${toString(obj)}.`,
      this._setter !== undefined
    );

    let meta = metaFor(obj);

    // ensure two way binding works when the component has defined a computed
    // property with both a setter and dependent keys, in that scenario without
    // the sync observer added below the caller's value will never be updated
    //
    // See GH#18147 / GH#19028 for details.
    if (
      // ensure that we only run this once, while the component is being instantiated
      meta.isInitializing() &&
      this._dependentKeys !== undefined &&
      this._dependentKeys.length > 0 &&
      typeof (obj as PropertyDidChange)[PROPERTY_DID_CHANGE] === 'function' &&
      (obj as any).isComponent
    ) {
      // It's redundant to do this here, but we don't want to check above so we can avoid an extra function call in prod.
      assert('property did change hook is invalid', hasPropertyDidChange(obj));

      addObserver(
        obj,
        keyName,
        () => {
          obj[PROPERTY_DID_CHANGE](keyName);
        },
        undefined,
        true
      );
    }

    let ret;

    try {
      beginPropertyChanges();

      ret = this._set(obj, keyName, value, meta);

      finishLazyChains(meta, keyName, ret);

      let tagMeta = tagMetaFor(obj);
      let propertyTag = tagFor(obj, keyName, tagMeta) as UpdatableTag;

      let { _dependentKeys } = this;

      if (_dependentKeys !== undefined) {
        updateTag(propertyTag, getChainTagsForKeys(obj, _dependentKeys, tagMeta, meta));

        if (DEBUG) {
          ALLOW_CYCLES!.set(propertyTag, true);
        }
      }

      meta.setRevisionFor(keyName, valueForTag(propertyTag));
    } finally {
      endPropertyChanges();
    }

    return ret;
  }

  _throwReadOnlyError(obj: object, keyName: string): never {
    throw new Error(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
  }

  _set(obj: object, keyName: string, value: unknown, meta: Meta): unknown {
    let hadCachedValue = meta.revisionFor(keyName) !== undefined;
    let cachedValue = meta.valueFor(keyName);

    let ret;
    let { _setter } = this;

    setObserverSuspended(obj, keyName, true);

    try {
      ret = _setter!.call(obj, keyName, value, cachedValue);
    } finally {
      setObserverSuspended(obj, keyName, false);
    }

    // allows setter to return the same value that is cached already
    if (hadCachedValue && cachedValue === ret) {
      return ret;
    }

    meta.setValueFor(keyName, ret);

    notifyPropertyChange(obj, keyName, meta, value);

    return ret;
  }

  /* called before property is overridden */
  teardown(obj: object, keyName: string, meta: Meta): void {
    if (meta.revisionFor(keyName) !== undefined) {
      meta.setRevisionFor(keyName, undefined);
      meta.setValueFor(keyName, undefined);
    }

    super.teardown(obj, keyName, meta);
  }
}

class AutoComputedProperty extends ComputedProperty {
  get(obj: object, keyName: string): unknown {
    let meta = metaFor(obj);
    let tagMeta = tagMetaFor(obj);

    let propertyTag = tagFor(obj, keyName, tagMeta) as UpdatableTag;

    let ret;

    let revision = meta.revisionFor(keyName);

    if (revision !== undefined && validateTag(propertyTag, revision)) {
      ret = meta.valueFor(keyName);
    } else {
      assert(
        `Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed`,
        !isDestroyed(obj)
      );

      let { _getter } = this;

      // Create a tracker that absorbs any trackable actions inside the CP
      let tag = track(() => {
        ret = _getter!.call(obj, keyName);
      });

      updateTag(propertyTag, tag);

      meta.setValueFor(keyName, ret);
      meta.setRevisionFor(keyName, valueForTag(propertyTag));

      finishLazyChains(meta, keyName, ret);
    }

    consumeTag(propertyTag);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(ret)) {
      consumeTag(tagFor(ret, '[]', tagMeta));
    }

    return ret;
  }
}

export type ComputedDecorator = ExtendedMethodDecorator & PropertyDecorator & ComputedDecoratorImpl;

// TODO: This class can be svelted once `meta` has been deprecated
class ComputedDecoratorImpl extends Function {
  /**
    Call on a computed property to set it into read-only mode. When in this
    mode the computed property will throw an error when set.

    Example:

    ```javascript
    import { computed, set } from '@ember/object';

    class Person {
      @computed().readOnly()
      get guid() {
        return 'guid-guid-guid';
      }
    }

    let person = new Person();
    set(person, 'guid', 'new-guid'); // will throw an exception
    ```

    Classic Class Example:

    ```javascript
    import EmberObject, { computed } from '@ember/object';

    let Person = EmberObject.extend({
      guid: computed(function() {
        return 'guid-guid-guid';
      }).readOnly()
    });

    let person = Person.create();
    person.set('guid', 'new-guid'); // will throw an exception
    ```

    @method readOnly
    @return {ComputedProperty} this
    @chainable
    @public
  */
  readOnly(this: ExtendedMethodDecorator) {
    let desc = descriptorForDecorator(this) as ComputedProperty;
    assert(
      'Computed properties that define a setter using the new syntax cannot be read-only',
      !(desc._setter && (desc._setter as unknown) !== (desc._getter as unknown))
    );
    desc._readOnly = true;
    return this;
  }

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For example,
    computed property functions may close over variables that are then no longer
    available for introspection. You can pass a hash of these values to a
    computed property.

    Example:

    ```javascript
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';

    class Store {
      @computed().meta({ type: Person })
      get person() {
        let personId = this.personId;
        return Person.create({ id: personId });
      }
    }
    ```

    Classic Class Example:

    ```javascript
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';

    const Store = EmberObject.extend({
      person: computed(function() {
        let personId = this.get('personId');
        return Person.create({ id: personId });
      }).meta({ type: Person })
    });
    ```

    The hash that you pass to the `meta()` function will be saved on the
    computed property descriptor under the `_meta` key. Ember runtime
    exposes a public API for retrieving these values from classes,
    via the `metaForProperty()` function.

    @method meta
    @param {Object} meta
    @chainable
    @public
  */
  meta(): unknown;
  meta(meta: unknown): ComputedDecorator;
  meta(meta?: unknown): unknown {
    let prop = descriptorForDecorator(this) as ComputedProperty;

    if (arguments.length === 0) {
      return prop._meta || {};
    } else {
      prop._meta = meta;
      return this;
    }
  }

  // TODO: Remove this when we can provide alternatives in the ecosystem to
  // addons such as ember-macro-helpers that use it.
  /** @internal */
  get _getter() {
    return (descriptorForDecorator(this) as ComputedProperty)._getter;
  }

  // TODO: Refactor this, this is an internal API only
  /** @internal */
  set enumerable(value: boolean) {
    (descriptorForDecorator(this) as ComputedProperty).enumerable = value;
  }
}

type ComputedDecoratorKeysAndConfig = [...keys: string[], config: ComputedPropertyCallback];

/**
  This helper returns a new property descriptor that wraps the passed
  computed property function. You can use this helper to define properties with
  native decorator syntax, mixins, or via `defineProperty()`.

  Example:

  ```js
  import { computed, set } from '@ember/object';

  class Person {
    constructor() {
      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  }

  let client = new Person();

  client.fullName; // 'Betty Jones'

  set(client, 'lastName', 'Fuller');
  client.fullName; // 'Betty Fuller'
  ```

  Classic Class Example:

  ```js
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: computed('firstName', 'lastName', function() {
      return `${this.get('firstName')} ${this.get('lastName')}`;
    })
  });

  let client = Person.create();

  client.get('fullName'); // 'Betty Jones'

  client.set('lastName', 'Fuller');
  client.get('fullName'); // 'Betty Fuller'
  ```

  You can also provide a setter, either directly on the class using native class
  syntax, or by passing a hash with `get` and `set` functions.

  Example:

  ```js
  import { computed, set } from '@ember/object';

  class Person {
    constructor() {
      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(value) {
      let [firstName, lastName] = value.split(/\s+/);

      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);

      return value;
    }
  }

  let client = new Person();

  client.fullName; // 'Betty Jones'

  set(client, 'lastName', 'Fuller');
  client.fullName; // 'Betty Fuller'
  ```

  Classic Class Example:

  ```js
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: computed('firstName', 'lastName', {
      get(key) {
        return `${this.get('firstName')} ${this.get('lastName')}`;
      },
      set(key, value) {
        let [firstName, lastName] = value.split(/\s+/);
        this.setProperties({ firstName, lastName });
        return value;
      }
    })
  });

  let client = Person.create();
  client.get('firstName'); // 'Betty'

  client.set('fullName', 'Carroll Fuller');
  client.get('firstName'); // 'Carroll'
  ```

  When passed as an argument, the `set` function should accept two parameters,
  `key` and `value`. The value returned from `set` will be the new value of the
  property.

  _Note: This is the preferred way to define computed properties when writing third-party
  libraries that depend on or use Ember, since there is no guarantee that the user
  will have [prototype Extensions](https://guides.emberjs.com/release/configuring-ember/disabling-prototype-extensions/) enabled._

  @method computed
  @for @ember/object
  @static
  @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
  @param {Function} func The computed property function.
  @return {ComputedDecorator} property decorator instance
  @public
*/
// @computed without parens or computed with descriptor args
export function computed(
  target: object,
  propertyName: string,
  descriptor: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor | void;
// @computed with keys only
export function computed(...dependentKeys: string[]): ComputedDecorator;
// @computed with keys and config
export function computed(...args: ComputedDecoratorKeysAndConfig): ComputedDecorator;
// @computed with config only
export function computed(callback: ComputedPropertyCallback): ComputedDecorator;
export function computed(
  ...args: ElementDescriptor | string[] | ComputedDecoratorKeysAndConfig
): ComputedDecorator | DecoratorPropertyDescriptor | void {
  assert(
    `@computed can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: computed()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && (args[4] as unknown) === true)
  );

  if (isElementDescriptor(args)) {
    // SAFETY: We passed in the impl for this class
    let decorator = makeComputedDecorator(
      new ComputedProperty([]),
      ComputedDecoratorImpl
    ) as ComputedDecorator;

    return decorator(args[0], args[1], args[2]);
  }

  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(
    new ComputedProperty(args as (string | ComputedPropertyObj)[]),
    ComputedDecoratorImpl
  ) as ComputedDecorator;
}

export function autoComputed(
  ...config: [ComputedPropertyObj | ComputedPropertyGetterFunction]
): ComputedDecorator {
  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(
    new AutoComputedProperty(config),
    ComputedDecoratorImpl
  ) as ComputedDecorator;
}

/**
  Allows checking if a given property on an object is a computed property. For the most part,
  this doesn't matter (you would normally just access the property directly and use its value),
  but for some tooling specific scenarios (e.g. the ember-inspector) it is important to
  differentiate if a property is a computed property or a "normal" property.

  This will work on either a class's prototype or an instance itself.

  @static
  @method isComputed
  @for @ember/debug
  @private
 */
export function isComputed(obj: object, key: string): boolean {
  return Boolean(descriptorForProperty(obj, key));
}

export default computed;
