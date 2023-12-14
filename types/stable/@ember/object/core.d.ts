declare module '@ember/object/core' {
  /**
      @module @ember/object/core
    */
  import { type default as Owner } from '@ember/-internals/owner';
  import Mixin from '@ember/object/mixin';
  import { OWNER } from '@glimmer/owner';
  type EmberClassConstructor<T> = new (owner?: Owner) => T;
  type MergeArray<Arr extends any[]> = Arr extends [infer T, ...infer Rest]
    ? T & MergeArray<Rest>
    : unknown;
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
  interface CoreObject {
    /** @internal */
    _super(...args: any[]): any;
  }
  class CoreObject {
    /** @internal */
    [OWNER]?: Owner;
    constructor(owner?: Owner);
    reopen(...args: Array<Mixin | Record<string, unknown>>): this;
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
    init(_properties: object | undefined): void;
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
    get isDestroyed(): boolean;
    set isDestroyed(_value: boolean);
    /**
          Destruction scheduled flag. The `destroy()` method has been called.
      
          The object stays intact until the end of the run loop at which point
          the `isDestroyed` flag is set.
      
          @property isDestroying
          @default false
          @public
        */
    get isDestroying(): boolean;
    set isDestroying(_value: boolean);
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
    destroy(): this;
    /**
          Override to implement teardown.
      
          @method willDestroy
          @public
        */
    willDestroy(): void;
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
    toString(): string;
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
    static extend<Statics, Instance, M extends Array<unknown>>(
      this: Statics & EmberClassConstructor<Instance>,
      ...mixins: M
    ): Readonly<Statics> & EmberClassConstructor<Instance> & MergeArray<M>;
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
    static create<C extends typeof CoreObject>(this: C): InstanceType<C>;
    static create<
      C extends typeof CoreObject,
      I extends InstanceType<C>,
      K extends keyof I,
      Args extends Array<
        Partial<{
          [Key in K]: I[Key];
        }>
      >
    >(this: C, ...args: Args): InstanceType<C> & MergeArray<Args>;
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
    static reopen<C extends typeof CoreObject>(this: C, ...args: any[]): C;
    static willReopen(): void;
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
    static reopenClass<C extends typeof CoreObject>(
      this: C,
      ...mixins: Array<Mixin | Record<string, unknown>>
    ): C;
    static detect(obj: unknown): boolean;
    static detectInstance(obj: unknown): boolean;
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
    static metaForProperty(key: string): any;
    /**
          Iterate over each computed property for the class, passing its name
          and any associated metadata (see `metaForProperty`) to the callback.
      
          @static
          @method eachComputedProperty
          @param {Function} callback
          @param {Object} binding
          @private
        */
    static eachComputedProperty(
      callback: (name: string, meta: unknown) => void,
      binding?: typeof CoreObject
    ): void;
    static get PrototypeMixin(): any;
    static get superclass(): any;
    static proto(): CoreObject;
    static toString(): string;
    static isClass: boolean;
    static isMethod: boolean;
    static _onLookup?: (debugContainerKey: string) => void;
    static _lazyInjections?: () => void;
    concatenatedProperties?: string[] | string;
    mergedProperties?: unknown[];
  }
  export default CoreObject;
}
