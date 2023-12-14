declare module '@ember/-internals/owner' {
  /**
      @module @ember/owner
     */
  /**
      The name for a factory consists of a namespace and the name of a specific type
      within that namespace, like `'service:session'`.

      **Note:** `FullName` is *not* a class, just a contract for strings used in the
      DI system. It is currently documented as a class only due to limits in our
      documentation infrastructure.

      @for @ember/owner
      @class FullName
      @public
     */
  export type FullName<
    Type extends string = string,
    Name extends string = string
  > = `${Type}:${Name}`;
  /**
      A type registry for the DI system, which other participants in the DI system
      can register themselves into with declaration merging. The contract for this
      type is that its keys are the `Type` from a `FullName`, and each value for a
      `Type` is another registry whose keys are the `Name` from a `FullName`. The
      mechanic for providing a registry is [declaration merging][handbook].

      [handbook]: https://www.typescriptlang.org/docs/handbook/declaration-merging.html

      For example, Ember's `@ember/service` module includes this set of definitions:

      ```ts
      export default class Service extends EmberObject {}

      // For concrete singleton classes to be merged into.
      interface Registry extends Record<string, Service> {}

      declare module '@ember/owner' {
        service: Registry;
      }
      ```

      Declarations of services can then include the registry:

      ```ts
      import Service from '@ember/service';

      export default class Session extends Service {
        login(username: string, password: string) {
          // ...
        }
      }

      declare module '@ember/service' {
        interface Registry {
          session: Session;
        }
      }
      ```

      Then users of the `Owner` API will be able to do things like this with strong
      type safety guarantees:

      ```ts
      getOwner(this)?.lookup('service:session').login("hello", "1234abcd");
      ```

      @for @ember/owner
      @private
     */
  export interface DIRegistry {}
  /**
      @private
     */
  type ResolveFactoryManager<Type extends string, Name extends string> = Type extends ValidType
    ? Name extends ValidName<Type>
      ? DIRegistry[Type][Name] extends infer RegistryEntry extends object
        ? FactoryManager<RegistryEntry>
        : FactoryManagerDefault
      : FactoryManagerDefault
    : FactoryManagerDefault;
  type FactoryManagerDefault = FactoryManager<object> | undefined;
  type Lookup<Type extends string, Name extends string> = Type extends ValidType
    ? Name extends ValidName<Type>
      ? DIRegistry[Type][Name]
      : unknown
    : unknown;
  /**
      The common interface for the ability to `register()` an item, shared by the
      `Owner` and `RegistryProxy` interfaces.

      @for @ember/owner
      @class BasicRegistry
      @private
     */
  interface BasicRegistry {
    /**
          Registers a factory that can be used for dependency injection (with
          `inject`) or for service lookup. Each factory is registered with
          a full name including two parts: `type:name`.
      
          A simple example:
      
          ```javascript
          import Application from '@ember/application';
          import EmberObject from '@ember/object';
      
          let App = Application.create();
      
          App.Orange = EmberObject.extend();
          App.register('fruit:favorite', App.Orange);
          ```
      
          Ember will resolve factories from the `App` namespace automatically.
          For example `App.CarsController` will be discovered and returned if
          an application requests `controller:cars`.
      
          An example of registering a controller with a non-standard name:
      
          ```javascript
          import Application from '@ember/application';
          import Controller from '@ember/controller';
      
          let App = Application.create();
          let Session = Controller.extend();
      
          App.register('controller:session', Session);
      
          // The Session controller can now be treated like a normal controller,
          // despite its non-standard name.
          App.ApplicationController = Controller.extend({
            needs: ['session']
          });
          ```
      
          Registered factories are **instantiated** by having `create`
          called on them. Additionally they are **singletons**, each time
          they are looked up they return the same instance.
      
          Some examples modifying that default behavior:
      
          ```javascript
          import Application from '@ember/application';
          import EmberObject from '@ember/object';
      
          let App = Application.create();
      
          App.Person = EmberObject.extend();
          App.Orange = EmberObject.extend();
          App.Email = EmberObject.extend();
          App.session = EmberObject.create();
      
          App.register('model:user', App.Person, { singleton: false });
          App.register('fruit:favorite', App.Orange);
          App.register('communication:main', App.Email, { singleton: false });
          App.register('session', App.session, { instantiate: false });
          ```
      
          @method register
          @param  fullName {String} type:name (e.g., 'model:user')
          @param  factory {Factory|object} (e.g., App.Person)
          @param  options {Object} (optional) disable instantiation or singleton usage
          @public
         */
    register(
      fullName: FullName,
      factory: Factory<object> | object,
      options?: RegisterOptions
    ): void;
  }
  type ValidType = keyof DIRegistry & string;
  type ValidName<Type extends ValidType> = keyof DIRegistry[Type] & string;
  /**
      The common interface for the ability to `lookup()` or get the `factoryFor` an
      item, shared by the `Owner` and `ContainerProxy` interfaces.

      @for @ember/owner
      @class BasicContainer
      @private
     */
  interface BasicContainer {
    /**
         Given a fullName return a corresponding instance.
      
         The default behavior is for lookup to return a singleton instance.
         The singleton is scoped to the container, allowing multiple containers
         to all have their own locally scoped singletons.
      
         ```javascript
         let registry = new Registry();
         let container = registry.container();
      
         registry.register('api:twitter', Twitter);
      
         let twitter = container.lookup('api:twitter');
      
         twitter instanceof Twitter; // => true
      
         // by default the container will return singletons
         let twitter2 = container.lookup('api:twitter');
         twitter2 instanceof Twitter; // => true
      
         twitter === twitter2; //=> true
         ```
      
         If singletons are not wanted an optional flag can be provided at lookup.
      
         ```javascript
         let registry = new Registry();
         let container = registry.container();
      
         registry.register('api:twitter', Twitter);
      
         let twitter = container.lookup('api:twitter', { singleton: false });
         let twitter2 = container.lookup('api:twitter', { singleton: false });
      
         twitter === twitter2; //=> false
         ```
      
         @public
         @method lookup
         @param {string} fullName
         @param {RegisterOptions} options
         @return {any}
         */
    lookup<Type extends string, Name extends string>(
      fullName: FullName<Type, Name>,
      options?: RegisterOptions
    ): Lookup<Type, Name>;
    /**
          Given a `FullName`, of the form `"type:name"` return a `FactoryManager`.
      
          This method returns a manager which can be used for introspection of the
          factory's class or for the creation of factory instances with initial
          properties. The manager is an object with the following properties:
      
          * `class` - The registered or resolved class.
          * `create` - A function that will create an instance of the class with
            any dependencies injected.
      
          For example:
      
          ```javascript
          import { getOwner } from '@ember/application';
      
          let owner = getOwner(otherInstance);
          // the owner is commonly the `applicationInstance`, and can be accessed via
          // an instance initializer.
      
          let factory = owner.factoryFor('service:bespoke');
      
          factory.class;
          // The registered or resolved class. For example when used with an Ember-CLI
          // app, this would be the default export from `app/services/bespoke.js`.
      
          let instance = factory.create({
            someProperty: 'an initial property value'
          });
          // Create an instance with any injections and the passed options as
          // initial properties.
          ```
      
          Any instances created via the factory's `.create()` method *must* be destroyed
          manually by the caller of `.create()`. Typically, this is done during the creating
          objects own `destroy` or `willDestroy` methods.
      
          @public
          @method factoryFor
          @param {string} fullName
          @return {FactoryManager}
        */
    factoryFor<Type extends string, Name extends string>(
      fullName: FullName<Type, Name>
    ): ResolveFactoryManager<Type, Name>;
  }
  /**
      Framework objects in an Ember application (components, services, routes,
      etc.) are created via a factory and dependency injection system. Each of
      these objects is the responsibility of an "owner", which handles its
      instantiation and manages its lifetime.

      An `Owner` is not a class you construct; it is one the framework constructs
      for you. The normal way to get access to the relevant `Owner` is using the
      `getOwner` function.

      @for @ember/owner
      @uses BasicRegistry
      @uses BasicContainer
      @class Owner
      @since 4.10.0
      @public
     */
  export default interface Owner extends BasicRegistry, BasicContainer {}
  /**
   * Interface representing the options for registering an item as a factory.
   *
   * @for @ember/owner
   * @class RegisterOptions
   * @public
   */
  export interface RegisterOptions {
    /**
          Whether to instantiate the item when returning it from a lookup. Defaults
          to `true`.
      
          @property instantiate
          @type Boolean
          @optional
          @default true
          @public
         */
    instantiate?: boolean | undefined;
    /**
          Whether the item is a singleton (like a service) and so should return the
          same instance every time, or should generate a new instance on each call.
          Defaults to `true`.
      
          @property singleton
          @type Boolean
          @optional
          @default true
          @public
         */
    singleton?: boolean | undefined;
  }
  /**
      Registered factories are instantiated by having create called on them.
      Additionally they are singletons by default, so each time they are looked up
      they return the same instance.

      However, that behavior can be modified with the `instantiate` and `singleton`
      options to the `Owner.register()` method.

      @for @ember/owner
      @class Factory
      @since 4.10.0
      @public
     */
  export interface Factory<T extends object> {
    /**
     * A function that will create an instance of the class with any
     * dependencies injected.
     *
     * @method create
     * @param  initialValues {Object} Any values to set on an instance of the class
     * @return {Object} The item produced by the factory.
     * @public
     */
    create(initialValues?: object): T;
  }
  /**
      The interface representing a manager which can be used for introspection of
      the factory's class or for the creation of factory instances with initial
      properties. The manager is an object with the following properties:

      - `class` - The registered or resolved class.
      - `create` - A function that will create an instance of the class with any
      dependencies injected.

      **Note:** `FactoryManager` is *not* user-constructible; the only legal way
      to get a `FactoryManager` is via `Owner.factoryFor`.

      @for @ember/owner
      @class FactoryManager
      @extends Factory
      @public
     */
  export interface FactoryManager<T extends object> extends Factory<T> {
    /**
          The registered or resolved class.
      
          @property class
          @type Factory
          @public
         */
    readonly class: Factory<T>;
  }
  /**
   * A record mapping all known items of a given type: if the item is known it
   * will be `true`; otherwise it will be `false` or `undefined`.
   */
  export type KnownForTypeResult<Type extends string> = {
    [Key in FullName<Type, string>]: boolean | undefined;
  };
  /**
      A `Resolver` is the mechanism responsible for looking up code in your
      application and converting its naming conventions into the actual classes,
      functions, and templates that Ember needs to resolve its dependencies, for
      example, what template to render for a given route. It is a system that helps
      the app resolve the lookup of JavaScript modules agnostic of what kind of
      module system is used, which can be AMD, CommonJS or just plain globals. It
      is used to lookup routes, models, components, templates, or anything that is
      used in your Ember app.

      This interface is not a concrete class; instead, it represents the contract a
      custom resolver must implement. Most apps never need to think about this: in
      the default blueprint, this is supplied by the `ember-resolver` package.

      @for @ember/owner
      @class Resolver
      @since 4.10.0
      @public
     */
  export interface Resolver {
    /**
          The one required method for a `Resolver`. Given a string, resolve it to a
          `Factory`, if one exists.
      
          @method resolve
          @param name {String}
          @public
         */
    resolve: (name: string) => Factory<object> | object | undefined;
    /**
          @method knownForType
          @param  type {String}
          @return {Object}
          @public
         */
    knownForType?: <Type extends string>(type: Type) => KnownForTypeResult<Type>;
    /**
          @method lookupDescription
          @param  fullName {String}
          @return {String}
          @public
         */
    lookupDescription?: (fullName: FullName) => string;
    /**
          @method makeToString
          @param  factory {Factory}
          @param  fullName {String}
          @return {String}
          @public
         */
    makeToString?: (factory: Factory<object>, fullName: FullName) => string;
    /**
          @method normalize
          @param  fullName {String}
          @return {String}
          @public
        */
    normalize?: (fullName: FullName) => FullName;
  }
  export interface FactoryClass {
    positionalParams?: string | string[] | undefined | null;
  }
  /**
      The internal representation of a `Factory`, for the extra detail available for
      private use internally than we expose to consumers.

      @for @ember/owner
      @class InternalFactory
      @private
     */
  export interface InternalFactory<T extends object, C extends FactoryClass | object = FactoryClass>
    extends Factory<T> {
    /**
          @property class
          @optional
          @private
         */
    class?: C;
    /**
          @property name
          @type String
          @optional
          @private
         */
    name?: string;
    /**
          @property fullName
          @type String
          @optional
          @private
         */
    fullName?: FullName;
    /**
          @property normalizedName
          @type String
          @optional
          @private
         */
    normalizedName?: string;
  }
  /**
      @private
      @method isFactory
      @param {Object} obj
      @return {Boolean}
      @static
     */
  export function isFactory(obj: unknown): obj is InternalFactory<object>;
  export function getOwner(object: object): InternalOwner | undefined;
  /**
      `setOwner` forces a new owner on a given object instance. This is primarily
      useful in some testing cases.

      @method setOwner
      @static
      @for @ember/owner
      @param {Object} object An object instance.
      @param {Owner} object The new owner object of the object instance.
      @since 2.3.0
      @public
    */
  export function setOwner(object: object, owner: Owner): void;
  /**
   * The interface for a container proxy, which is itself a private API used
   * by the private `ContainerProxyMixin` as part of the base definition of
   * `EngineInstance`.
   *
   * @class ContainerProxy
   * @for @ember/owner
   * @private
   * @extends BasicContainer
   */
  export interface ContainerProxy extends BasicContainer {
    /**
         Returns an object that can be used to provide an owner to a
         manually created instance.
      
         Example:
      
         ```
         import { getOwner } from '@ember/application';
      
         let owner = getOwner(this);
      
         User.create(
           owner.ownerInjection(),
           { username: 'rwjblue' }
         )
         ```
      
         @public
         @method ownerInjection
         @since 2.3.0
         @return {Object}
        */
    ownerInjection(): object;
  }
  /**
   * @class RegistryProxy
   * @extends BasicRegistry
   * @private
   * @for @ember/owner
   */
  export interface RegistryProxy extends BasicRegistry {
    /**
          Given a fullName return the corresponding factory.
      
          @public
          @method resolveRegistration
          @param  fullName {String}
          @return {Function} fullName's factory
         */
    resolveRegistration(fullName: FullName): Factory<object> | object | undefined;
    /**
          Unregister a factory.
      
          ```javascript
          import Application from '@ember/application';
          import EmberObject from '@ember/object';
      
          let App = Application.create();
          let User = EmberObject.extend();
          App.register('model:user', User);
      
          App.resolveRegistration('model:user').create() instanceof User //=> true
      
          App.unregister('model:user')
          App.resolveRegistration('model:user') === undefined //=> true
          ```
      
          @public
          @method unregister
          @param {String} fullName
         */
    unregister(fullName: FullName): void;
    /**
          Check if a factory is registered.
      
          @public
          @method hasRegistration
          @param {String} fullName
          @return {Boolean}
         */
    hasRegistration(fullName: FullName): boolean;
    /**
          Return a specific registered option for a particular factory.
      
          @public
          @method registeredOption
          @param  {String} fullName
          @param  {String} optionName
          @return {Object} options
         */
    registeredOption<K extends keyof RegisterOptions>(
      fullName: FullName,
      optionName: K
    ): RegisterOptions[K] | undefined;
    /**
          Register options for a particular factory.
      
          @public
          @method registerOptions
          @param {String} fullName
          @param {Object} options
         */
    registerOptions(fullName: FullName, options: RegisterOptions): void;
    /**
          Return registered options for a particular factory.
      
          @public
          @method registeredOptions
          @param  {String} fullName
          @return {Object} options
         */
    registeredOptions(fullName: FullName): RegisterOptions | undefined;
    /**
          Allow registering options for all factories of a type.
      
          ```javascript
          import Application from '@ember/application';
      
          let App = Application.create();
          let appInstance = App.buildInstance();
      
          // if all of type `connection` must not be singletons
          appInstance.registerOptionsForType('connection', { singleton: false });
      
          appInstance.register('connection:twitter', TwitterConnection);
          appInstance.register('connection:facebook', FacebookConnection);
      
          let twitter = appInstance.lookup('connection:twitter');
          let twitter2 = appInstance.lookup('connection:twitter');
      
          twitter === twitter2; // => false
      
          let facebook = appInstance.lookup('connection:facebook');
          let facebook2 = appInstance.lookup('connection:facebook');
      
          facebook === facebook2; // => false
          ```
      
          @public
          @method registerOptionsForType
          @param {String} type
          @param {Object} options
         */
    registerOptionsForType(type: string, options: RegisterOptions): void;
    /**
          Return the registered options for all factories of a type.
      
          @public
          @method registeredOptionsForType
          @param {String} type
          @return {Object} options
         */
    registeredOptionsForType(type: string): RegisterOptions | undefined;
  }
  /**
   * @internal This is the same basic interface which is implemented (via the
   *   mixins) by `EngineInstance` and therefore `ApplicationInstance`, which are
   *   the normal interfaces to an `Owner` for end user applications now. However,
   *   going forward, we expect to progressively deprecate and remove the "extra"
   *   APIs which are not exposed on `Owner` itself.
   */
  export interface InternalOwner extends RegistryProxy, ContainerProxy {}
  export {};
}
