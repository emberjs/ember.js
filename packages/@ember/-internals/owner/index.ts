import { getOwner as glimmerGetOwner, setOwner as glimmerSetOwner } from '@glimmer/owner';

/**
  @module @ember/owner
*/

/**
 * The name for a factory consists of a namespace and the name of a specific
 * type within that namespace, like `'service:session'`.
 *
 * @for @ember/owner
 */
export type FullName = `${string}:${string}`;

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
export default interface Owner {
  /**
   * Given a {@linkcode FullName} return a corresponding instance.
   */
  lookup(fullName: FullName, options?: RegisterOptions): unknown;

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
  // Dear future maintainer: yes, `Factory<object> | object` is an exceedingly
  // weird type here. We actually allow more or less *anything* to be passed
  // here. In the future, we may possibly be able to update this to actually
  // take advantage of the `FullName` here to require that the registered
  // factory and corresponding options do the right thing (passing an *actual*
  // factory, not needing `create` if `options.instantiate` is `false`, etc.)
  // but doing so will require rationalizing Ember's own internals and may need
  // a full Ember RFC.
  register(fullName: FullName, factory: Factory<object> | object, options?: RegisterOptions): void;

  /**
   * Given a fullName of the form `'type:name'`, like `'route:application'`,
   * return a corresponding factory manager.
   *
   * Any instances created via the factory's `.create()` method must be
   * destroyed manually by the caller of `.create()`. Typically, this is done
   * during the creating objects own `destroy` or `willDestroy` methods.
   */
  factoryFor(fullName: FullName): FactoryManager<object> | undefined;
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
  resolve: (name: FullName) => Factory<object> | object | undefined;
  knownForType?: <T extends string>(type: T) => KnownForTypeResult<T>;
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

/**
  Framework objects in an Ember application (components, services, routes, etc.)
  are created via a factory and dependency injection system. Each of these
  objects is the responsibility of an "owner", which handled its
  instantiation and manages its lifetime.

  `getOwner` fetches the owner object responsible for an instance. This can
  be used to lookup or resolve other class instances, or register new factories
  into the owner.

  For example, this component dynamically looks up a service based on the
  `audioType` passed as an argument:

  ```app/components/play-audio.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';
  import { getOwner } from '@ember/application';

  // Usage:
  //
  //   <PlayAudio @audioType={{@model.audioType}} @audioFile={{@model.file}}/>
  //
  export default class extends Component {
    get audioService() {
      let owner = getOwner(this);
      return owner.lookup(`service:${this.args.audioType}`);
    }

    @action
    onPlay() {
      let player = this.audioService;
      player.play(this.args.audioFile);
    }
  }
  ```

  @method getOwner
  @static
  @for @ember/owner
  @param {Object} object An object with an owner.
  @return {Object} An owner object.
  @since 2.3.0
  @public
*/
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

export interface ContainerMixin extends Owner {
  ownerInjection(): void;
}

export interface RegistryMixin extends Pick<Owner, 'register'> {
  /**
   Given a fullName return the corresponding factory.

   @public
   @method resolveRegistration
   @param {String} fullName
   @return {Function} fullName's factory
   */
  resolveRegistration(fullName: FullName): Factory<object> | object | undefined;

  unregister(fullName: FullName): void;

  hasRegistration(fullName: FullName): boolean;

  registeredOption<K extends keyof RegisterOptions>(
    fullName: FullName,
    optionName: K
  ): RegisterOptions[K] | undefined;

  registerOptions(fullName: FullName, options: RegisterOptions): void;

  registeredOptions(fullName: FullName): RegisterOptions | undefined;

  registerOptionsForType(type: string, options: RegisterOptions): void;

  registeredOptionsForType(type: string): RegisterOptions | undefined;
}

export interface InternalOwner extends RegistryMixin, ContainerMixin {}
