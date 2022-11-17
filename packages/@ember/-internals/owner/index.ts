import { getOwner as glimmerGetOwner, setOwner as glimmerSetOwner } from '@glimmer/owner';

/**
  @module @ember/owner
*/

/**
  The name for a factory consists of a namespace and the name of a specific
  type within that namespace, like `'service:session'`.

  @for @ember/owner
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
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DIRegistry extends Record<string, Record<string, unknown>> {}

// Convenience utility for pulling a specific factory manager off `DIRegistry`
// if one exists, or falling back to the default definition otherwise.
/** @internal */
type ResolveFactoryManager<
  Type extends string,
  Name extends string
> = DIRegistry[Type][Name] extends object
  ? FactoryManager<DIRegistry[Type][Name]>
  : FactoryManager<object> | undefined;

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
    @param  factory {any} (e.g., App.Person)
    @param  options {Object} (optional) disable instantiation or singleton usage
    @public
   */
  // Dear future maintainer: yes, `Factory<object> | object` is an exceedingly
  // weird type here. We actually allow more or less *anything* to be passed
  // here. In the future, we may possibly be able to update this to actually
  // take advantage of the `FullName` here to require that the registered
  // factory and corresponding options do the right thing (passing an *actual*
  // factory, not needing `create` if `options.instantiate` is `false`, etc.)
  // but doing so will require rationalizing Ember's own internals and may need
  // a full Ember RFC.
  register(fullName: FullName, factory: Factory<object> | object, options?: RegisterOptions): void;
}

type ValidType = keyof DIRegistry & string;
type ValidName<Type extends ValidType> = keyof DIRegistry[Type] & string;

interface BasicContainer {
  /**
   * Given a {@linkcode FullName} return a corresponding instance.
   */
  lookup<Type extends ValidType, Name extends ValidName<Type>>(
    fullName: FullName<Type, Name>,
    options?: RegisterOptions
  ): DIRegistry[Type][Name];

  /**
   * Given a fullName of the form `'type:name'`, like `'route:application'`,
   * return a corresponding factory manager.
   *
   * Any instances created via the factory's `.create()` method must be
   * destroyed manually by the caller of `.create()`. Typically, this is done
   * during the creating objects own `destroy` or `willDestroy` methods.
   */
  factoryFor<Type extends ValidType, Name extends ValidName<Type>>(
    fullName: FullName<Type, Name>
  ): ResolveFactoryManager<Type, Name>;
}

/**
 * Framework objects in an Ember application (components, services, routes,
 * etc.) are created via a factory and dependency injection system. Each of
 * these objects is the responsibility of an "owner", which handles its
 * instantiation and manages its lifetime.
 *
 * An `Owner` is not a class you construct; it is one the framework constructs
 * for you. The normal way to get access to the relevant `Owner` is using the
 * `getOwner` function.
 *
 * @for @ember/owner
 * @since 4.10.0
 * @public
 */
export default interface Owner extends BasicRegistry, BasicContainer {}

export interface RegisterOptions {
  instantiate?: boolean | undefined;
  singleton?: boolean | undefined;
}

/**
 * Registered factories are instantiated by having create called on them.
 * Additionally they are singletons by default, so each time they are looked up
 * they return the same instance.
 *
 * However, that behavior can be modified with the `instantiate` and `singleton`
 * options to the {@linkcode BasicRegistry.register Owner.register} method.
 */
export interface Factory<T extends object> {
  // NOTE: this does not check against the types of the target object in any
  // way, unfortunately. However, we actually *cannot* constrain it further than
  // this without going down a *very* deep rabbit hole (see the historic types
  // for `.create()` on DefinitelyTyped if you're curious), because we need (for
  // historical reasons) to support classes which implement this contract to be
  // able to provide a *narrower* interface than "exactly the public fields on
  // the class" while still falling back to the "exactly the public fields on
  // the class" for the general case. :sigh:
  /**
   * A function that will create an instance of the class with any
   * dependencies injected.
   *
   * @param initialValues Any values to set on an instance of the class
   */
  create(initialValues?: object): T;
}

/**
 * A manager which can be used for introspection of the factory's class or for
 * the creation of factory instances with initial properties. The manager is an
 * object with the following properties:
 *
 * - `class` - The registered or resolved class.
 * - `create` - A function that will create an instance of the class with any
 *   dependencies injected.
 *
 * @note `FactoryManager` is *not* user-constructible; the only legal way to get
 *   a `FactoryManager` is via {@linkcode Owner.factoryFor}.
 */
export interface FactoryManager<T extends object> extends Factory<T> {
  /** The registered or resolved class. */
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
 * A `Resolver` is the mechanism responsible for looking up code in your
 * application and converting its naming conventions into the actual classes,
 * functions, and templates that Ember needs to resolve its dependencies, for
 * example, what template to render for a given route. It is a system that helps
 * the app resolve the lookup of JavaScript modules agnostic of what kind of
 * module system is used, which can be AMD, CommonJS or just plain globals. It
 * is used to lookup routes, models, components, templates, or anything that is
 * used in your Ember app.
 *
 * This interface represents the contract a custom resolver must implement. Most
 * apps never need to think about this: the application's resolver is supplied by
 * `ember-resolver` in the default blueprint.
 */
export interface Resolver {
  resolve: (name: string) => Factory<object> | object | undefined;
  knownForType?: <Type extends string>(type: Type) => KnownForTypeResult<Type>;
  lookupDescription?: (fullName: FullName) => string;
  makeToString?: (factory: Factory<object>, fullName: FullName) => string;
  normalize?: (fullName: FullName) => FullName;
}

export interface FactoryClass {
  positionalParams?: string | string[] | undefined | null;
}

export interface InternalFactory<T extends object, C extends FactoryClass | object = FactoryClass>
  extends Factory<T> {
  class?: C;
  name?: string;
  fullName?: FullName;
  normalizedName?: string;
}

export function isFactory(obj: unknown): obj is InternalFactory<object> {
  return obj != null && typeof (obj as InternalFactory<object>).create === 'function';
}

// NOTE: For docs, see the definition at the public API site in `@ember/owner`;
// we document it there for the sake of public API docs and for TS consumption,
// while having the richer `InternalOwner` representation for Ember itself.
export function getOwner(object: object): InternalOwner | undefined {
  return glimmerGetOwner(object);
}

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
export function setOwner(object: object, owner: Owner): void {
  glimmerSetOwner(object, owner);
}

// Defines the type for the ContainerProxyMixin. When we rationalize our Owner
// *not* to work via mixins, we will be able to delete this entirely: this
// overload for `lookup()` and all of `ownerInjection()` will go away.
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

export interface RegistryProxy extends BasicRegistry {
  /**
    Given a fullName return the corresponding factory.

    @public
    @method resolveRegistration
    @param {String} fullName
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
