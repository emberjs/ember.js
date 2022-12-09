declare module '@ember/owner' {
  /**
   * The name for a factory consists of a namespace and the name of a specific
   * type within that namespace, like `'service:session'`.
   */
  export type FullName<
    Type extends string = string,
    Name extends string = string
  > = `${Type}:${Name}`;

  // TODO: when migrating into Ember proper, evaluate whether we should introduce
  // a registry which users can provide to resolve known types, so e.g.
  // `owner.lookup('service:session')` can return the right thing.
  /**
   * Framework objects in an Ember application (components, services, routes,
   * etc.) are created via a factory and dependency injection system. Each of
   * these objects is the responsibility of an "owner", which handled its
   * instantiation and manages its lifetime.
   */
  export default interface Owner {
    /**
     * Given a {@linkcode FullName} return a corresponding instance.
     */
    lookup(fullName: FullName): unknown;

    /**
     * Registers a factory or value that can be used for dependency injection
     * (with `inject`) or for service lookup. Each factory is registered with a
     * full name including two parts: `'type:name'`.
     *
     * - To override the default of instantiating the class on the `Factory`,
     *   pass the `{ instantiate: false }` option. This is useful when you have
     *   already instantiated the class to use with this factory.
     * - To override the default singleton behavior and instead create multiple
     *   instances, pass the `{ singleton: false }` option.
     */
    // Dear future maintainer: yes, I know that `Factory<unknown> | object` is
    // an exceedingly weird type here. This is how we type it internally in
    // Ember itself. We actually allow more or less *anything* to be passed
    // here. In the future, we may possibly be able to update this to actually
    // take advantage of the `FullName` here to require that the registered
    // factory and corresponding options do the right thing (passing an *actual*
    // factory, not needing `create` if `options.instantiate` is `false`, etc.)
    // but doing so will require rationalizing Ember's own internals and may
    // need a full Ember RFC.
    register(
      fullName: FullName,
      factory: Factory<unknown> | object,
      options?: RegisterOptions
    ): void;

    /**
     * Given a fullName of the form `'type:name'`, like `'route:application'`,
     * return a corresponding factory manager.
     *
     * Any instances created via the factory's `.create()` method must be
     * destroyed manually by the caller of `.create()`. Typically, this is done
     * during the creating objects own `destroy` or `willDestroy` methods.
     */
    factoryFor(fullName: FullName): FactoryManager<unknown> | undefined;
  }

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
    /**
     * A function that will create an instance of the class with any
     * dependencies injected.
     *
     * @param initialValues Any values to set on an instance of the class
     */
    create(initialValues?: Partial<T>): T;
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
    A record mapping all known items of a given type: if the item is known it
    will be `true`; otherwise it will be `false` or `undefined`.
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
   */
  export interface Resolver {
    /**
      The one required method for a `Resolver`. Given a string, resolve it to a
      `Factory`, if one exists.
     */
    resolve: (name: string) => Factory<object> | object | undefined;
    knownForType?: <Type extends string>(type: Type) => KnownForTypeResult<Type>;
    lookupDescription?: (fullName: FullName) => string;
    makeToString?: (factory: Factory<object>, fullName: FullName) => string;
    normalize?: (fullName: FullName) => FullName;
  }

  // Don't export things unless we *intend* to.
  export {};
}
