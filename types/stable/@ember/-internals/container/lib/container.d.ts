declare module '@ember/-internals/container/lib/container' {
  import type {
    InternalFactory,
    FactoryClass,
    InternalOwner,
    RegisterOptions,
    FactoryManager,
    FullName,
  } from '@ember/-internals/owner';
  import type { DebugRegistry } from '@ember/-internals/container/lib/registry';
  import type Registry from '@ember/-internals/container/lib/registry';
  interface LeakTracking {
    hasContainers(): boolean;
    reset(): void;
  }
  export interface ContainerOptions {
    owner?: InternalOwner;
    cache?: {
      [key: string]: object;
    };
    factoryManagerCache?: {
      [key: string]: InternalFactoryManager<any, any>;
    };
    validationCache?: {
      [key: string]: boolean;
    };
  }
  /**
     A container used to instantiate and cache objects.

     Every `Container` must be associated with a `Registry`, which is referenced
     to determine the factory and options that should be used to instantiate
     objects.

     The public API for `Container` is still in flux and should not be considered
     stable.

     @private
     @class Container
     */
  export default class Container {
    static _leakTracking: LeakTracking;
    readonly owner: InternalOwner | null;
    readonly registry: Registry & DebugRegistry;
    cache: {
      [key: string]: object;
    };
    factoryManagerCache: {
      [key: string]: InternalFactoryManager<object>;
    };
    readonly validationCache: {
      [key: string]: boolean;
    };
    isDestroyed: boolean;
    isDestroying: boolean;
    constructor(registry: Registry, options?: ContainerOptions);
    /**
         @private
         @property registry
         @type Registry
         @since 1.11.0
         */
    /**
         @private
         @property cache
         @type InheritingDict
         */
    /**
         @private
         @property validationCache
         @type InheritingDict
         */
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
          If singletons are not wanted, an optional flag can be provided at lookup.
          ```javascript
         let registry = new Registry();
         let container = registry.container();
          registry.register('api:twitter', Twitter);
          let twitter = container.lookup('api:twitter', { singleton: false });
         let twitter2 = container.lookup('api:twitter', { singleton: false });
          twitter === twitter2; //=> false
         ```
          @private
         @method lookup
         @param {String} fullName
         @param {RegisterOptions} [options]
         @return {any}
         */
    lookup(
      fullName: string,
      options?: RegisterOptions
    ): InternalFactory<object> | object | undefined;
    /**
         A depth first traversal, destroying the container, its descendant containers and all
         their managed objects.
          @private
         @method destroy
         */
    destroy(): void;
    finalizeDestroy(): void;
    /**
         Clear either the entire cache or just the cache for a particular key.
      
         @private
         @method reset
         @param {String} fullName optional key to reset; if missing, resets everything
        */
    reset(fullName: FullName): void;
    /**
         Returns an object that can be used to provide an owner to a
         manually created instance.
          @private
         @method ownerInjection
         @returns { Object }
        */
    ownerInjection(): {};
    /**
         Given a fullName, return the corresponding factory. The consumer of the factory
         is responsible for the destruction of any factory instances, as there is no
         way for the container to ensure instances are destroyed when it itself is
         destroyed.
          @public
         @method factoryFor
         @param {String} fullName
         @return {any}
         */
    factoryFor(fullName: FullName): InternalFactoryManager<object> | undefined;
  }
  export interface LazyInjection {
    namespace: string | undefined;
    source: string | undefined;
    specifier: string;
  }
  interface DebugFactory<T extends object, C extends FactoryClass | object = FactoryClass>
    extends InternalFactory<T, C> {
    _onLookup?: (fullName: string) => void;
    _lazyInjections?: () => {
      [key: string]: LazyInjection;
    };
    _initFactory?: (factoryManager: InternalFactoryManager<T, C>) => void;
  }
  export const INIT_FACTORY: unique symbol;
  export function getFactoryFor(
    obj: object
  ): InternalFactoryManager<object, FactoryClass | object> | undefined;
  export function setFactoryFor<T extends object, C extends FactoryClass | object>(
    obj: object,
    factory: InternalFactoryManager<T, C>
  ): void;
  export class InternalFactoryManager<
    T extends object,
    C extends FactoryClass | object = FactoryClass
  > implements FactoryManager<T>
  {
    readonly container: Container;
    readonly owner: InternalOwner | null;
    readonly class: DebugFactory<T, C>;
    readonly fullName: FullName;
    readonly normalizedName: string;
    private madeToString;
    injections:
      | {
          [key: string]: unknown;
        }
      | undefined;
    constructor(
      container: Container,
      factory: InternalFactory<T, C>,
      fullName: FullName,
      normalizedName: string
    );
    toString(): string;
    create(options?: Partial<T>): T;
  }
  export {};
}
