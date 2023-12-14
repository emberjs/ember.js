declare module '@ember/-internals/metal/lib/computed' {
  import type { Meta } from '@ember/-internals/meta';
  import type {
    ExtendedMethodDecorator,
    DecoratorPropertyDescriptor,
  } from '@ember/-internals/metal/lib/decorator';
  import { ComputedDescriptor } from '@ember/-internals/metal/lib/decorator';
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
    _readOnly: boolean;
    protected _hasConfig: boolean;
    _getter?: ComputedPropertyGetterFunction;
    _setter?: ComputedPropertySetterFunction;
    constructor(args: Array<string | ComputedPropertyCallback>);
    setup(
      obj: object,
      keyName: string,
      propertyDesc: DecoratorPropertyDescriptor,
      meta: Meta
    ): void;
    _property(...passedArgs: string[]): void;
    get(obj: object, keyName: string): unknown;
    set(obj: object, keyName: string, value: unknown): unknown;
    _throwReadOnlyError(obj: object, keyName: string): never;
    _set(obj: object, keyName: string, value: unknown, meta: Meta): unknown;
    teardown(obj: object, keyName: string, meta: Meta): void;
  }
  export type ComputedDecorator = ExtendedMethodDecorator &
    PropertyDecorator &
    ComputedDecoratorImpl;
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
    readOnly(this: ExtendedMethodDecorator): ExtendedMethodDecorator;
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
    /** @internal */
    get _getter(): ComputedPropertyGetterFunction | undefined;
    /** @internal */
    set enumerable(value: boolean);
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
  export function computed(
    target: object,
    propertyName: string,
    descriptor: DecoratorPropertyDescriptor
  ): DecoratorPropertyDescriptor | void;
  export function computed(...dependentKeys: string[]): ComputedDecorator;
  export function computed(...args: ComputedDecoratorKeysAndConfig): ComputedDecorator;
  export function computed(callback: ComputedPropertyCallback): ComputedDecorator;
  export function autoComputed(
    ...config: [ComputedPropertyObj | ComputedPropertyGetterFunction]
  ): ComputedDecorator;
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
  export function isComputed(obj: object, key: string): boolean;
  export default computed;
}
