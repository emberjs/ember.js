declare module '@ember/-internals/container/lib/registry' {
  import type {
    Factory,
    FactoryClass,
    FullName,
    InternalFactory,
    KnownForTypeResult,
    RegisterOptions,
    Resolver,
  } from '@ember/-internals/owner';
  import type { set } from '@ember/object';
  import type { ContainerOptions, LazyInjection } from '@ember/-internals/container/lib/container';
  import Container from '@ember/-internals/container/lib/container';
  export interface Injection {
    property: string;
    specifier: FullName;
  }
  export interface ResolverClass
    extends Factory<Resolver>,
      Partial<{
        new (...args: any): Resolver;
      }> {}
  export interface RegistryOptions {
    fallback?: Registry;
    registrations?: {
      [key: string]: object;
    };
    resolver?: Resolver;
  }
  /**
     A registry used to store factory and option information keyed
     by type.

     A `Registry` stores the factory and option information needed by a
     `Container` to instantiate and cache objects.

     The API for `Registry` is still in flux and should not be considered stable.

     @private
     @class Registry
     @since 1.11.0
    */
  export default class Registry {
    readonly _failSet: Set<string>;
    resolver: Resolver | null;
    readonly fallback: Registry | null;
    readonly registrations: Record<string, InternalFactory<object> | object>;
    readonly _normalizeCache: Record<FullName, FullName>;
    readonly _options: Record<string, RegisterOptions>;
    readonly _resolveCache: Record<string, InternalFactory<object> | object>;
    readonly _typeOptions: Record<string, RegisterOptions>;
    set?: typeof set;
    constructor(options?: RegistryOptions);
    /**
         A backup registry for resolving registrations when no matches can be found.
      
         @private
         @property fallback
         @type Registry
         */
    /**
         An object that has a `resolve` method that resolves a name.
      
         @private
         @property resolver
         @type Resolver
         */
    /**
         @private
         @property registrations
         @type InheritingDict
         */
    /**
         @private
      
         @property _normalizeCache
         @type InheritingDict
         */
    /**
         @private
      
         @property _resolveCache
         @type InheritingDict
         */
    /**
         @private
      
         @property _options
         @type InheritingDict
         */
    /**
         @private
      
         @property _typeOptions
         @type InheritingDict
         */
    /**
         Creates a container based on this registry.
      
         @private
         @method container
         @param {Object} options
         @return {Container} created container
         */
    container(options?: ContainerOptions): Container;
    /**
         Registers a factory for later injection.
      
         Example:
      
         ```javascript
         let registry = new Registry();
      
         registry.register('model:user', Person, {singleton: false });
         registry.register('fruit:favorite', Orange);
         registry.register('communication:main', Email, {singleton: false});
         ```
      
         @private
         @method register
         @param {String} fullName
         @param {Function} factory
         @param {Object} options
         */
    register(
      fullName: FullName,
      factory: object,
      options: RegisterOptions & {
        instantiate: false;
      }
    ): void;
    register<T extends object, C extends FactoryClass | object>(
      fullName: FullName,
      factory: InternalFactory<T, C>,
      options?: RegisterOptions
    ): void;
    /**
         Unregister a fullName
      
         ```javascript
         let registry = new Registry();
         registry.register('model:user', User);
      
         registry.resolve('model:user').create() instanceof User //=> true
      
         registry.unregister('model:user')
         registry.resolve('model:user') === undefined //=> true
         ```
      
         @private
         @method unregister
         @param {String} fullName
         */
    unregister(fullName: FullName): void;
    /**
         Given a fullName return the corresponding factory.
      
         By default `resolve` will retrieve the factory from
         the registry.
      
         ```javascript
         let registry = new Registry();
         registry.register('api:twitter', Twitter);
      
         registry.resolve('api:twitter') // => Twitter
         ```
      
         Optionally the registry can be provided with a custom resolver.
         If provided, `resolve` will first provide the custom resolver
         the opportunity to resolve the fullName, otherwise it will fallback
         to the registry.
      
         ```javascript
         let registry = new Registry();
         registry.resolver = function(fullName) {
            // lookup via the module system of choice
          };
      
         // the twitter factory is added to the module system
         registry.resolve('api:twitter') // => Twitter
         ```
      
         @private
         @method resolve
         @param {String} fullName
         @return {Function} fullName's factory
         */
    resolve(fullName: FullName): InternalFactory<object> | object | undefined;
    /**
         A hook that can be used to describe how the resolver will
         attempt to find the factory.
      
         For example, the default Ember `.describe` returns the full
         class name (including namespace) where Ember's resolver expects
         to find the `fullName`.
      
         @private
         @method describe
         @param {String} fullName
         @return {string} described fullName
         */
    describe(fullName: FullName): string;
    /**
         A hook to enable custom fullName normalization behavior
      
         @private
         @method normalizeFullName
         @param {String} fullName
         @return {string} normalized fullName
         */
    normalizeFullName(fullName: FullName): FullName;
    /**
         Normalize a fullName based on the application's conventions
      
         @private
         @method normalize
         @param {String} fullName
         @return {string} normalized fullName
         */
    normalize(fullName: FullName): FullName;
    /**
         @method makeToString
      
         @private
         @param {any} factory
         @param {string} fullName
         @return {function} toString function
         */
    makeToString(factory: InternalFactory<object>, fullName: FullName): string;
    /**
         Given a fullName check if the container is aware of its factory
         or singleton instance.
      
         @private
         @method has
         @param {String} fullName
         @param {Object} [options]
         @param {String} [options.source] the fullname of the request source (used for local lookups)
         @return {Boolean}
         */
    has(fullName: FullName): boolean;
    /**
         Allow registering options for all factories of a type.
      
         ```javascript
         let registry = new Registry();
         let container = registry.container();
      
         // if all of type `connection` must not be singletons
         registry.optionsForType('connection', { singleton: false });
      
         registry.register('connection:twitter', TwitterConnection);
         registry.register('connection:facebook', FacebookConnection);
      
         let twitter = container.lookup('connection:twitter');
         let twitter2 = container.lookup('connection:twitter');
      
         twitter === twitter2; // => false
      
         let facebook = container.lookup('connection:facebook');
         let facebook2 = container.lookup('connection:facebook');
      
         facebook === facebook2; // => false
         ```
      
         @private
         @method optionsForType
         @param {String} type
         @param {Object} options
         */
    optionsForType(type: string, options: RegisterOptions): void;
    getOptionsForType(type: string): RegisterOptions | undefined;
    /**
         @private
         @method options
         @param {String} fullName
         @param {Object} options
         */
    options(fullName: FullName, options: RegisterOptions): void;
    getOptions(fullName: FullName): RegisterOptions | undefined;
    getOption<K extends keyof RegisterOptions>(
      fullName: FullName,
      optionName: K
    ): RegisterOptions[K] | undefined;
    /**
         @private
         @method knownForType
         @param {String} type the type to iterate over
        */
    knownForType<T extends string>(type: T): KnownForTypeResult<T>;
    isValidFullName(fullName: string): fullName is FullName;
  }
  export class DebugRegistry extends Registry {
    normalizeInjectionsHash(hash: { [key: string]: LazyInjection }): Injection[];
    validateInjections(injections: Injection[]): void;
  }
  export function privatize([fullName]: TemplateStringsArray): FullName;
}
