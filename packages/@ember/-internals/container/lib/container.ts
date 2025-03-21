import type {
  InternalFactory,
  FactoryClass,
  InternalOwner,
  RegisterOptions,
  FactoryManager,
  FullName,
} from '@ember/-internals/owner';
import { setOwner } from '@ember/-internals/owner';
import { dictionary } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { DebugRegistry } from './registry';
import type Registry from './registry';

interface LeakTracking {
  hasContainers(): boolean;
  reset(): void;
}

// node exposes this. I'm not pulling in the whole @types/node because it
// doesn't work with isolatedModules
declare const gc: undefined | (() => void);

let leakTracking: LeakTracking;
let containers: WeakSet<Container>;
if (DEBUG) {
  // requires v8
  // chrome --js-flags="--allow-natives-syntax --expose-gc"
  // node --allow-natives-syntax --expose-gc
  try {
    if (typeof gc === 'function') {
      leakTracking = (() => {
        // avoid syntax errors when --allow-natives-syntax not present
        let GetWeakSetValues = new Function('weakSet', 'return %GetWeakSetValues(weakSet, 0)');
        containers = new WeakSet<Container>();
        return {
          hasContainers() {
            gc();
            return GetWeakSetValues(containers).length > 0;
          },
          reset() {
            let values = GetWeakSetValues(containers);
            for (let i = 0; i < values.length; i++) {
              containers.delete(values[i]);
            }
          },
        };
      })();
    }
  } catch (_e) {
    // ignore
  }
}

export interface ContainerOptions {
  owner?: InternalOwner;
  cache?: { [key: string]: object };
  factoryManagerCache?: { [key: string]: InternalFactoryManager<any, any> };
  validationCache?: { [key: string]: boolean };
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
  cache: { [key: string]: object };
  factoryManagerCache!: { [key: string]: InternalFactoryManager<object> };
  readonly validationCache!: { [key: string]: boolean };
  isDestroyed: boolean;
  isDestroying: boolean;

  constructor(registry: Registry, options: ContainerOptions = {}) {
    this.registry = registry as Registry & DebugRegistry;
    this.owner = options.owner || null;
    this.cache = dictionary(options.cache || null);
    this.factoryManagerCache = dictionary(options.factoryManagerCache || null);
    this.isDestroyed = false;
    this.isDestroying = false;

    if (DEBUG) {
      this.validationCache = dictionary(options.validationCache || null);
      if (containers !== undefined) {
        containers.add(this);
      }
    }
  }

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
  ): InternalFactory<object> | object | undefined {
    if (this.isDestroyed) {
      throw new Error(`Cannot call \`.lookup('${fullName}')\` after the owner has been destroyed`);
    }
    assert('fullName must be a proper full name', this.registry.isValidFullName(fullName));
    return lookup(this, this.registry.normalize(fullName), options);
  }

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.
    @private
   @method destroy
   */
  destroy(): void {
    this.isDestroying = true;

    destroyDestroyables(this);
  }

  finalizeDestroy(): void {
    resetCache(this);
    this.isDestroyed = true;
  }

  /**
   Clear either the entire cache or just the cache for a particular key.

   @private
   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
  */
  reset(fullName: FullName) {
    if (this.isDestroyed) return;
    if (fullName === undefined) {
      destroyDestroyables(this);
      resetCache(this);
    } else {
      resetMember(this, this.registry.normalize(fullName));
    }
  }

  /**
   Returns an object that can be used to provide an owner to a
   manually created instance.
    @private
   @method ownerInjection
   @returns { Object }
  */
  ownerInjection() {
    let injection = {};
    setOwner(injection, this.owner!);
    return injection;
  }

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
  factoryFor(fullName: FullName): InternalFactoryManager<object> | undefined {
    if (this.isDestroyed) {
      throw new Error(
        `Cannot call \`.factoryFor('${fullName}')\` after the owner has been destroyed`
      );
    }
    let normalizedName = this.registry.normalize(fullName);

    assert('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));

    return factoryFor(this, normalizedName, fullName);
  }
}

if (DEBUG) {
  Container._leakTracking = leakTracking!;
}

/*
 * Wrap a factory manager in a proxy which will not permit properties to be
 * set on the manager.
 */
function wrapManagerInDeprecationProxy<T extends object, C extends object | FactoryClass>(
  manager: InternalFactoryManager<T, C>
): InternalFactoryManager<T, C> {
  let validator = {
    set(_obj: T, prop: keyof T) {
      throw new Error(
        `You attempted to set "${String(
          prop
        )}" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.`
      );
    },
  };

  // Note:
  // We have to proxy access to the manager here so that private property
  // access doesn't cause the above errors to occur.
  let m = manager;
  let proxiedManager = {
    class: m.class,
    create(props?: Partial<T>) {
      return m.create(props);
    },
  };

  return new Proxy(proxiedManager, validator as any) as any;
}

function isSingleton(container: Container, fullName: FullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function isInstantiatable(container: Container, fullName: FullName) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}

function lookup(
  container: Container,
  fullName: FullName,
  options: RegisterOptions = {}
): InternalFactory<object> | object | undefined {
  let normalizedName = fullName;

  if (
    options.singleton === true ||
    (options.singleton === undefined && isSingleton(container, fullName))
  ) {
    let cached = container.cache[normalizedName];
    if (cached !== undefined) {
      return cached;
    }
  }

  return instantiateFactory(container, normalizedName, fullName, options);
}

function factoryFor(
  container: Container,
  normalizedName: FullName,
  fullName: FullName
): InternalFactoryManager<object> | undefined {
  let cached = container.factoryManagerCache[normalizedName];

  if (cached !== undefined) {
    return cached;
  }

  let factory = container.registry.resolve(normalizedName) as DebugFactory<object> | undefined;

  if (factory === undefined) {
    return;
  }

  if (DEBUG && factory && typeof factory._onLookup === 'function') {
    factory._onLookup(fullName);
  }

  let manager = new InternalFactoryManager(container, factory, fullName, normalizedName);

  if (DEBUG) {
    manager = wrapManagerInDeprecationProxy(manager);
  }

  container.factoryManagerCache[normalizedName] = manager;
  return manager;
}

function isSingletonClass(
  container: Container,
  fullName: FullName,
  { instantiate, singleton }: RegisterOptions
) {
  return (
    singleton !== false &&
    !instantiate &&
    isSingleton(container, fullName) &&
    !isInstantiatable(container, fullName)
  );
}

function isSingletonInstance(
  container: Container,
  fullName: FullName,
  { instantiate, singleton }: RegisterOptions
) {
  return (
    singleton !== false &&
    instantiate !== false &&
    (singleton === true || isSingleton(container, fullName)) &&
    isInstantiatable(container, fullName)
  );
}

function isFactoryClass(
  container: Container,
  fullname: FullName,
  { instantiate, singleton }: RegisterOptions
) {
  return (
    instantiate === false &&
    (singleton === false || !isSingleton(container, fullname)) &&
    !isInstantiatable(container, fullname)
  );
}

function isFactoryInstance(
  container: Container,
  fullName: FullName,
  { instantiate, singleton }: RegisterOptions
) {
  return (
    instantiate !== false &&
    (singleton === false || !isSingleton(container, fullName)) &&
    isInstantiatable(container, fullName)
  );
}

function instantiateFactory(
  container: Container,
  normalizedName: FullName,
  fullName: FullName,
  options: RegisterOptions
): InternalFactory<object> | object | undefined {
  let factoryManager = factoryFor(container, normalizedName, fullName);

  if (factoryManager === undefined) {
    return;
  }

  // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
  // By default majority of objects fall into this case
  if (isSingletonInstance(container, fullName, options)) {
    let instance = (container.cache[normalizedName] = factoryManager.create());

    // if this lookup happened _during_ destruction (emits a deprecation, but
    // is still possible) ensure that it gets destroyed
    if (container.isDestroying) {
      if (typeof (instance as any).destroy === 'function') {
        (instance as any).destroy();
      }
    }

    return instance;
  }

  // SomeClass { singleton: false, instantiate: true }
  if (isFactoryInstance(container, fullName, options)) {
    return factoryManager.create();
  }

  // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
  if (
    isSingletonClass(container, fullName, options) ||
    isFactoryClass(container, fullName, options)
  ) {
    return factoryManager.class;
  }

  throw new Error('Could not create factory');
}

function destroyDestroyables(container: Container): void {
  let cache = container.cache;
  let keys = Object.keys(cache);

  for (let key of keys) {
    let value = cache[key];
    assert('has cached value', value);

    if ((value as any).destroy) {
      (value as any).destroy();
    }
  }
}

function resetCache(container: Container) {
  container.cache = dictionary(null);
  container.factoryManagerCache = dictionary(null);
}

function resetMember(container: Container, fullName: string) {
  let member = container.cache[fullName];

  delete container.factoryManagerCache[fullName];

  if (member) {
    delete container.cache[fullName];

    if ((member as any).destroy) {
      (member as any).destroy();
    }
  }
}

export interface LazyInjection {
  namespace: string | undefined;
  source: string | undefined;
  specifier: string;
}

declare interface DebugFactory<T extends object, C extends FactoryClass | object = FactoryClass>
  extends InternalFactory<T, C> {
  _onLookup?: (fullName: string) => void;
  _lazyInjections?: () => { [key: string]: LazyInjection };
  _initFactory?: (factoryManager: InternalFactoryManager<T, C>) => void;
}

export const INIT_FACTORY = Symbol('INIT_FACTORY');

interface MaybeHasInitFactory {
  [INIT_FACTORY]?: InternalFactoryManager<object, FactoryClass | object>;
}

export function getFactoryFor(
  obj: object
): InternalFactoryManager<object, FactoryClass | object> | undefined {
  // SAFETY: since we know `obj` is an `object`, we also know we can safely ask
  // whether a key is set on it.
  return (obj as MaybeHasInitFactory)[INIT_FACTORY];
}

export function setFactoryFor<T extends object, C extends FactoryClass | object>(
  obj: object,
  factory: InternalFactoryManager<T, C>
): void {
  // SAFETY: since we know `obj` is an `object`, we also know we can safely set
  // a key it safely at this location. (The only way this could be blocked is if
  // someone has gone out of their way to use `Object.defineProperty()` with our
  // internal-only symbol and made it `writable: false`.)
  (obj as MaybeHasInitFactory)[INIT_FACTORY] = factory;
}

export class InternalFactoryManager<
  T extends object,
  C extends FactoryClass | object = FactoryClass,
> implements FactoryManager<T>
{
  readonly container: Container;
  readonly owner: InternalOwner | null;
  readonly class: DebugFactory<T, C>;
  readonly fullName: FullName;
  readonly normalizedName: string;
  private madeToString: string | undefined;
  injections: { [key: string]: unknown } | undefined;

  constructor(
    container: Container,
    factory: InternalFactory<T, C>,
    fullName: FullName,
    normalizedName: string
  ) {
    this.container = container;
    this.owner = container.owner;
    this.class = factory;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
    this.madeToString = undefined;
    this.injections = undefined;
  }

  toString(): string {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create(options?: Partial<T>) {
    let { container } = this;

    if (container.isDestroyed) {
      throw new Error(
        `Cannot create new instances after the owner has been destroyed (you attempted to create ${this.fullName})`
      );
    }

    let props = options ? { ...options } : {};
    setOwner(props, container.owner!);
    setFactoryFor(props, this);

    if (DEBUG) {
      let lazyInjections;
      let validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (
        !validationCache[this.fullName] &&
        this.class &&
        typeof this.class._lazyInjections === 'function'
      ) {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);

        this.container.registry.validateInjections(lazyInjections);
      }

      validationCache[this.fullName] = true;

      assert(
        `Failed to create an instance of '${this.normalizedName}'. Most likely an improperly defined class or an invalid module export.`,
        typeof this.class.create === 'function'
      );
    }

    return this.class.create(props);
  }
}
