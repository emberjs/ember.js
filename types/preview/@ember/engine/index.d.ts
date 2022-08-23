import EmberObject from '@ember/object';
import type RegistryProxyMixin from '@ember/engine/-private/registry-proxy-mixin';
import type Initializer from '@ember/engine/-private/types/initializer';
import type EngineInstance from '@ember/engine/instance';
import type { Factory, FullName } from '@ember/owner';

export type KnownForTypeResult<Type extends string> = {
  [fullName in `${Type}:${string}`]: boolean | undefined;
};

/**
 * A `Resolver` the mechanism responsible for looking up code in your
 * application and converting its naming conventions into the actual classes,
 * functions, and templates that Ember needs to resolve its dependencies, for
 * example, what template to render for a given route. It is a system that helps
 * the app resolve the lookup of JavaScript modules agnostic of what kind of
 * module system is used, which can be AMD, CommonJS or just plain globals. It
 * is used to lookup routes, models, components, templates, or anything that is
 * used in your Ember app.
 */
export interface Resolver {
  knownForType?: <TypeName extends string>(type: TypeName) => KnownForTypeResult<TypeName>;
  lookupDescription?: (fullName: FullName) => string;
  makeToString?: (factory: Factory<object>, fullName: FullName) => string;
  normalize?: (fullName: FullName) => string;
  resolve(name: string): Factory<object> | object | undefined;
}

/**
 * The `Engine` class contains core functionality for both applications and
 * engines.
 */
export default class Engine extends EmberObject {
  /**
   * The goal of initializers should be to register dependencies and injections.
   * This phase runs once. Because these initializers may load code, they are
   * allowed to defer application readiness and advance it. If you need to access
   * the container or store you should use an InstanceInitializer that will be run
   * after all initializers and therefore after all code is loaded and the app is
   * ready.
   */
  static initializer(initializer: Initializer<Engine>): void;
  /**
   * Instance initializers run after all initializers have run. Because
   * instance initializers run after the app is fully set up. We have access
   * to the store, container, and other items. However, these initializers run
   * after code has loaded and are not allowed to defer readiness.
   */
  static instanceInitializer(instanceInitializer: Initializer<EngineInstance>): void;
  /**
   * Set this to provide an alternate class to `DefaultResolver`
   */
  resolver: Resolver | null;
  /**
   * Create an EngineInstance for this Engine.
   */
  buildInstance(options?: object): EngineInstance;
}

export default interface Engine extends RegistryProxyMixin {}

/**
 * `getEngineParent` retrieves an engine instance's parent instance.
 */
export function getEngineParent(engine: EngineInstance): EngineInstance;
