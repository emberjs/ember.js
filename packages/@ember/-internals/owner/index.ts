import { getOwner as glimmerGetOwner, setOwner as glimmerSetOwner } from '@glimmer/owner';
import type { IContainer } from '../runtime/lib/mixins/container_proxy';
import type { IRegistry } from '../runtime/lib/mixins/registry_proxy';

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
  // TODO: expand this to the public API
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
  @for @ember/application
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
  @for @ember/application
  @param {Object} object An object instance.
  @param {Object} object The new owner object of the object instance.
  @since 2.3.0
  @public
*/
export function setOwner(object: any, owner: Owner): void {
  glimmerSetOwner(object, owner);
}

export interface InternalOwner extends IRegistry, IContainer {}
