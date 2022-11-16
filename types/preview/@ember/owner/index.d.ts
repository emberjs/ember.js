declare module '@ember/owner' {
  /**
   * The name for a factory consists of a namespace and the name of a specific
   * type within that namespace, like `'service:session'`.
   */
  export type FullName<
    Type extends string = string,
    Name extends string = string
  > = `${Type}:${Name}`;

  /**
   * A type registry for the DI system, which other participants in the DI system
   * can register themselves into with declaration merging. The contract for this
   * type is that its keys are the `Type` from a `FullName`, and each value for a
   * `Type` is another registry whose keys are the `Name` from a `FullName`. The
   * mechanic for providing a registry is [declaration merging][handbook].
   *
   * [handbook]: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
   *
   * For example, Ember's `Service` class uses this :
   *
   * ```ts
   * export default class Service extends EmberObject {}
   *
   * // For concrete singleton classes to be merged into.
   * interface Registry extends Record<string, Service> {}
   *
   * declare module '@ember/owner' {
   *   service: Registry;
   * }
   * ```
   *
   * Declarations of services can then include the registry:
   *
   * ```ts
   * import Service from '@ember/service';
   *
   * export default class Session extends Service {
   *   login(username: string, password: string) {
   *     // ...
   *   }
   * }
   *
   * declare module '@ember/service' {
   *   interface Registry {
   *     session: Session;
   *   }
   * }
   * ```
   *
   * Then users of the `Owner` API will be able to reliably do things like this:
   *
   * ```ts
   * getOwner(this)?.lookup('service:session').login("hello", "1234abcd");
   * ```
   */
  export interface DIRegistry extends Record<string, Record<string, unknown>> {}

  // Convenience utilities for pulling a specific factory manager off `DIRegistry`
  // if one exists, or falling back to the default definition otherwise.
  type ResolveFactoryManager<
    Type extends ValidType,
    Name extends ValidName<Type>
  > = DIRegistry[Type][Name] extends object
    ? FactoryManager<DIRegistry[Type][Name]>
    : FactoryManager<object> | undefined;

  type ResolveFactory<
    Type extends ValidType,
    Name extends ValidName<Type>
  > = DIRegistry[Type][Name] extends object
    ? Factory<DIRegistry[Type][Name]>
    : Factory<object> | object | undefined;

  // This type is shared between `Owner` and `RegistryProxy
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
    register(
      fullName: FullName,
      factory: Factory<object> | object,
      options?: RegisterOptions
    ): void;
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
   * options to the {@linkcode Owner.register} method.
   */
  export interface Factory<T> {
    // NOTE: this does not check against the types of the target object in any
    // way, unfortunately. However, we actually *cannot* constrain it further than
    // this without going down a *very* deep rabbit hole (see the historic types
    // for `.create()` on DefinitelyTyped if you're curious), because we need (for
    // historical reasons) to support classes which implement this contract to be
    // able to provide a *narrower* interface than "exactly the public fields on
    // the class" while still falling back to the "exactly the public fields on
    // the class" for the general case. :sigh:
    //
    // We stills upply both signatures because even though the second one means
    // literally anything will *type check*, the first one means that the normal
    // case of calling `.create()` for most implementors of the contract will at
    // least get useful autocomplete.
    /**
     * A function that will create an instance of the class with any
     * dependencies injected.
     *
     * @param initialValues Any values to set on an instance of the class
     */
    create(initialValues?: Partial<T>): T;
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
  export interface FactoryManager<T> extends Factory<T> {
    /** The registered or resolved class. */
    readonly class: Factory<T>;
  }

  /**
   * A record mapping all known items of a given type: if the item is known it
   * will be `true`; otherwise it will be `false` or `undefined`.
   */
  export type KnownForTypeResult<Type extends string> = {
    [FullName in `${Type}:${string}`]: boolean | undefined;
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
    resolve: <Type extends ValidType, Name extends ValidName<Type>>(
      name: FullName<Type, Name>
    ) => ResolveFactory<Type, Name>;
    knownForType?: <Type extends string>(type: Type) => KnownForTypeResult<Type>;
    lookupDescription?: (fullName: FullName) => string;
    makeToString?: (factory: Factory<object>, fullName: FullName) => string;
    normalize?: (fullName: FullName) => FullName;
  }

  /**
   * Framework objects in an Ember application (components, services, routes, etc.)
   * are created via a factory and dependency injection system. Each of these
   * objects is the responsibility of an "owner", which handled its
   * instantiation and manages its lifetime.
   *
   * `getOwner` fetches the owner object responsible for an instance. This can
   * be used to lookup or resolve other class instances, or register new factories
   * into the owner.
   *
   * For example, this component dynamically looks up a service based on the
   * `audioType` passed as an argument:
   *
   * ```app/components/play-audio.js
   * import Component from '@glimmer/component';
   * import { action } from '@ember/object';
   * import { getOwner } from '@ember/application';
   *
   * // Usage:
   * //
   * //   <PlayAudio @audioType={{@model.audioType}} @audioFile={{@model.file}}/>
   * //
   * export default class PlayAudio extends Component {
   *   get audioService() {
   *     return getOwner(this)?.lookup(`service:${this.args.audioType}`);
   *   }
   *
   *   @action
   *   onPlay() {
   *     this.audioService?.play(this.args.audioFile);
   *   }
   * }
   * ```
   */
  export function getOwner(object: object): Owner | undefined;

  /**
   * `setOwner` forces a new owner on a given object instance. This is primarily
   * useful in some testing cases.
   *
   * @param object An object instance.
   * @param owner The new owner object of the object instance.
   */
  export function setOwner(object: object, owner: Owner): void;

  export interface ContainerProxy extends BasicContainer {
    /**
     * Returns an object that can be used to provide an owner to a
     * manually created instance.
     *
     * Example:
     *
     * ```
     * import { getOwner } from '@ember/application';
     *
     * let owner = getOwner(this);
     *
     * User.create(
     *   owner.ownerInjection(),
     *   { username: 'rwjblue' }
     * )
     * ```
     */
    ownerInjection(): object;
  }

  export interface RegistryProxy extends BasicRegistry {
    /**
     * Given a fullName return the corresponding factory.
     */
    resolveRegistration(fullName: FullName): Factory<object> | object | undefined;

    /**
     * Unregister a factory.
     *
     *
     * ```javascript
     * import Application from '@ember/application';
     * import EmberObject from '@ember/object';
     * let App = Application.create();
     * let User = EmberObject.extend();
     * App.register('model:user', User);
     *
     * App.resolveRegistration('model:user').create() instanceof User //=> true
     *
     * App.unregister('model:user')
     * App.resolveRegistration('model:user') === undefined //=> true
     * ```
     */
    unregister(fullName: FullName): void;

    /**
     * Check if a factory is registered.
     */
    hasRegistration(fullName: FullName): boolean;

    /**
     * Return a specific registered option for a particular factory.
     */
    registeredOption<K extends keyof RegisterOptions>(
      fullName: FullName,
      optionName: K
    ): RegisterOptions[K] | undefined;

    /**
     * Register options for a particular factory.
     */
    registerOptions(fullName: FullName, options: RegisterOptions): void;

    /**
     * Return registered options for a particular factory.
     */
    registeredOptions(fullName: FullName): RegisterOptions | undefined;

    /**
     * Allow registering options for all factories of a type.
     *
     * ```javascript
     * import Application from '@ember/application';
     *
     * let App = Application.create();
     * let appInstance = App.buildInstance();
     *
     * // if all of type `connection` must not be singletons
     * appInstance.registerOptionsForType('connection', { singleton: false });
     *
     * appInstance.register('connection:twitter', TwitterConnection);
     * appInstance.register('connection:facebook', FacebookConnection);
     *
     * let twitter = appInstance.lookup('connection:twitter');
     * let twitter2 = appInstance.lookup('connection:twitter');
     *
     * twitter === twitter2; // => false
     *
     * let facebook = appInstance.lookup('connection:facebook');
     * let facebook2 = appInstance.lookup('connection:facebook');
     *
     * facebook === facebook2; // => false
     * ```
     */
    registerOptionsForType(type: string, options: RegisterOptions): void;

    /**
     * Return the registered options for all factories of a type.
     */
    registeredOptionsForType(type: string): RegisterOptions | undefined;
  }

  // Don't export things unless we *intend* to.
  export {};
}
