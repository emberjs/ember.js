import { assert } from '@ember/debug';
import {
  Decorator,
  DecoratorPropertyDescriptor,
  isElementDescriptor,
  makeComputedDecorator,
} from './decorator';
import {
  descriptorForDecorator,
  descriptorForProperty,
} from './descriptor_map';
import { ComputedProperty, ComputedPropertyConfig } from './computed_property';


/**
@module @ember/object
*/

export {
  ComputedProperty,
  ComputedPropertyGetter,
  ComputedPropertySetter,
  ComputedPropertyConfig,
  ComputedPropertyGetterAndSetter, noop, DEEP_EACH_REGEX
} from './computed_property';

// TODO: This class can be svelted once `meta` has been deprecated
class ComputedDecoratorImpl extends Function {
  readOnly(this: Decorator) {
    (descriptorForDecorator(this) as ComputedProperty).readOnly();
    return this;
  }

  volatile(this: Decorator) {
    (descriptorForDecorator(this) as ComputedProperty).volatile();
    return this;
  }

  property(this: Decorator, ...keys: string[]) {
    (descriptorForDecorator(this) as ComputedProperty).property(...keys);
    return this;
  }

  meta(this: Decorator, meta?: any): any {
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
  get _getter(this: Decorator) {
    return (descriptorForDecorator(this) as ComputedProperty)._getter;
  }

  // TODO: Refactor this, this is an internal API only
  set enumerable(this: Decorator, value: boolean) {
    (descriptorForDecorator(this) as ComputedProperty).enumerable = value;
  }
}

export type ComputedDecorator = Decorator & PropertyDecorator & ComputedDecoratorImpl;

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

  The alternative syntax, with prototype extensions, might look like:

  ```js
  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');
  }.property('firstName', 'lastName')
  ```

  This form does not work with native decorators.

  @method computed
  @for @ember/object
  @static
  @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
  @param {Function} func The computed property function.
  @return {ComputedDecorator} property decorator instance
  @public
*/
export function computed(target: object, key: string, desc: PropertyDescriptor): PropertyDescriptor;
export function computed(...args: (string | ComputedPropertyConfig)[]): ComputedDecorator;
export function computed(
  ...args: (object | string | ComputedPropertyConfig | DecoratorPropertyDescriptor)[]
): ComputedDecorator | DecoratorPropertyDescriptor {
  assert(
    `@computed can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: computed()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (isElementDescriptor(args)) {
    let decorator = makeComputedDecorator(
      new ComputedProperty([]),
      ComputedDecoratorImpl
    ) as ComputedDecorator;

    return decorator(args[0], args[1], args[2]);
  }

  return makeComputedDecorator(
    new ComputedProperty(args as (string | ComputedPropertyConfig)[]),
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

export const _globalsComputed = computed.bind(null);

export default computed;
