import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { DEBUG } from '@glimmer/env';
import { Factory, LookupOptions, Owner, OWNER, setOwner } from 'ember-owner';
import { dictionary, HAS_NATIVE_PROXY } from 'ember-utils';
import Registry, { DebugRegistry, Injection } from './registry';

declare global {
  export function gc(): void;
}

interface LeakTracking {
  hasContainers(): boolean;
  reset(): void;
}

interface CacheMember {
  destroy?: () => void;
}

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
  } catch (e) {
    // ignore
  }
}

export interface ContainerOptions {
  owner?: Owner;
  cache?: { [key: string]: CacheMember };
  factoryManagerCache?: { [key: string]: FactoryManager<any, any> };
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

  readonly owner: Owner | null;
  readonly registry: Registry & DebugRegistry;
  cache: { [key: string]: CacheMember };
  factoryManagerCache!: { [key: string]: FactoryManager<any, any> };
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
   @param {Object} [options]
   @param {String} [options.source] The fullname of the request source (used for local lookup)
   @return {any}
   */
  lookup(fullName: string, options: LookupOptions): any {
    assert('expected container not to be destroyed', !this.isDestroyed);
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
    destroyDestroyables(this);
    this.isDestroying = true;
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
  reset(fullName: string) {
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
    return { [OWNER]: this.owner };
  }

  /**
   Given a fullName, return the corresponding factory. The consumer of the factory
   is responsible for the destruction of any factory instances, as there is no
   way for the container to ensure instances are destroyed when it itself is
   destroyed.
    @public
   @method factoryFor
   @param {String} fullName
   @param {Object} [options]
   @param {String} [options.source] The fullname of the request source (used for local lookup)
   @return {any}
   */
  factoryFor<T, C>(fullName: string, options: LookupOptions = {}): Factory<T, C> | undefined {
    assert('expected container not to be destroyed', !this.isDestroyed);
    let normalizedName = this.registry.normalize(fullName);

    assert('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));
    assert(
      'EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to factoryFor',
      EMBER_MODULE_UNIFICATION || !options.namespace
    );

    if (options.source || options.namespace) {
      normalizedName = this.registry.expandLocalLookup(fullName, options);
      if (!normalizedName) {
        return;
      }
    }

    return factoryFor<T, C>(this, normalizedName, fullName) as Factory<T, C> | undefined;
  }
}

if (DEBUG) {
  Container._leakTracking = leakTracking!;
}

/*
 * Wrap a factory manager in a proxy which will not permit properties to be
 * set on the manager.
 */
function wrapManagerInDeprecationProxy<T, C>(manager: FactoryManager<T, C>) {
  if (HAS_NATIVE_PROXY) {
    let validator = {
      set(_obj: T, prop: keyof T) {
        throw new Error(
          `You attempted to set "${prop}" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.`
        );
      },
    };

    // Note:
    // We have to proxy access to the manager here so that private property
    // access doesn't cause the above errors to occur.
    let m = manager;
    let proxiedManager = {
      class: m.class,
      create(props?: { [prop: string]: any }) {
        return m.create(props);
      },
    };

    let proxy = new Proxy(proxiedManager, validator as any);
    FACTORY_FOR.set(proxy, manager);
  }

  return manager;
}

function isSingleton(container: Container, fullName: string) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function isInstantiatable(container: Container, fullName: string) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}

function lookup(container: Container, fullName: string, options: LookupOptions = {}) {
  assert(
    'EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to lookup',
    EMBER_MODULE_UNIFICATION || !options.namespace
  );

  let normalizedName = fullName;

  if (options.source || options.namespace) {
    normalizedName = container.registry.expandLocalLookup(fullName, options);
    if (!normalizedName) {
      return;
    }
  }

  if (options.singleton !== false) {
    let cached = container.cache[normalizedName];
    if (cached !== undefined) {
      return cached;
    }
  }

  return instantiateFactory(container, normalizedName, fullName, options);
}

function factoryFor<T, C>(container: Container, normalizedName: string, fullName: string) {
  let cached = container.factoryManagerCache[normalizedName];

  if (cached !== undefined) {
    return cached;
  }

  let factory = container.registry.resolve(normalizedName) as DebugFactory<T, C> | undefined;

  if (factory === undefined) {
    return;
  }

  if (DEBUG && factory && typeof factory._onLookup === 'function') {
    factory._onLookup(fullName);
  }

  let manager = new FactoryManager(container, factory, fullName, normalizedName);

  if (DEBUG) {
    manager = wrapManagerInDeprecationProxy(manager);
  }

  container.factoryManagerCache[normalizedName] = manager;
  return manager;
}

interface FactoryOptions {
  instantiate?: boolean;
  singleton?: boolean;
}

function isSingletonClass(
  container: Container,
  fullName: string,
  { instantiate, singleton }: FactoryOptions
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
  fullName: string,
  { instantiate, singleton }: FactoryOptions
) {
  return (
    singleton !== false &&
    instantiate !== false &&
    isSingleton(container, fullName) &&
    isInstantiatable(container, fullName)
  );
}

function isFactoryClass(
  container: Container,
  fullname: string,
  { instantiate, singleton }: FactoryOptions
) {
  return (
    instantiate === false &&
    (singleton === false || !isSingleton(container, fullname)) &&
    !isInstantiatable(container, fullname)
  );
}

function isFactoryInstance(
  container: Container,
  fullName: string,
  { instantiate, singleton }: FactoryOptions
) {
  return (
    instantiate !== false &&
    (singleton !== false || isSingleton(container, fullName)) &&
    isInstantiatable(container, fullName)
  );
}

function instantiateFactory(
  container: Container,
  normalizedName: string,
  fullName: string,
  options: FactoryOptions
) {
  let factoryManager = factoryFor(container, normalizedName, fullName);

  if (factoryManager === undefined) {
    return;
  }

  // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
  // By default majority of objects fall into this case
  if (isSingletonInstance(container, fullName, options)) {
    return (container.cache[normalizedName] = factoryManager.create());
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

interface BuildInjectionsResult {
  injections: { [key: string]: object } | undefined;
  isDynamic: boolean;
}

function processInjections(
  container: Container,
  injections: Injection[],
  result: BuildInjectionsResult
) {
  if (DEBUG) {
    container.registry.validateInjections(injections);
  }

  let hash = result.injections;
  if (hash === undefined) {
    hash = result.injections = {};
  }

  for (let i = 0; i < injections.length; i++) {
    let { property, specifier, source } = injections[i];

    if (source) {
      hash[property] = lookup(container, specifier, { source });
    } else {
      hash[property] = lookup(container, specifier);
    }

    if (!result.isDynamic) {
      result.isDynamic = !isSingleton(container, specifier);
    }
  }
}

function buildInjections(
  container: Container,
  typeInjections: Injection[],
  injections: Injection[]
): BuildInjectionsResult {
  let result: BuildInjectionsResult = {
    injections: undefined,
    isDynamic: false,
  };

  if (typeInjections !== undefined) {
    processInjections(container, typeInjections, result);
  }

  if (injections !== undefined) {
    processInjections(container, injections, result);
  }

  return result;
}

function injectionsFor(container: Container, fullName: string) {
  let registry = container.registry;
  let [type] = fullName.split(':');

  let typeInjections = registry.getTypeInjections(type);
  let injections = registry.getInjections(fullName);

  return buildInjections(container, typeInjections, injections);
}

function destroyDestroyables(container: Container): void {
  let cache = container.cache;
  let keys = Object.keys(cache);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = cache[key];

    if (value.destroy) {
      value.destroy();
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

    if (member.destroy) {
      member.destroy();
    }
  }
}

export interface LazyInjection {
  namespace: string | undefined;
  source: string | undefined;
  specifier: string;
}

declare interface DebugFactory<T, C> extends Factory<T, C> {
  _onLookup?: (fullName: string) => void;
  _initFactory?: (factoryManager: FactoryManager<T, C>) => void;
  _lazyInjections(): { [key: string]: LazyInjection };
}

export const FACTORY_FOR = new WeakMap<any, FactoryManager<any, any>>();
class FactoryManager<T, C> {
  readonly container: Container;
  readonly owner: Owner | null;
  readonly class: Factory<T, C> & DebugFactory<T, C>;
  readonly fullName: string;
  readonly normalizedName: string;
  private madeToString: string | undefined;
  injections: { [key: string]: object } | undefined;

  constructor(
    container: Container,
    factory: Factory<T, C>,
    fullName: string,
    normalizedName: string
  ) {
    this.container = container;
    this.owner = container.owner;
    this.class = factory as Factory<T, C> & DebugFactory<T, C>;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
    this.madeToString = undefined;
    this.injections = undefined;
    FACTORY_FOR.set(this, this);
  }

  toString(): string {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create(options?: { [prop: string]: any }) {
    let injectionsCache = this.injections;
    if (injectionsCache === undefined) {
      let { injections, isDynamic } = injectionsFor(this.container, this.normalizedName);
      injectionsCache = injections;
      if (!isDynamic) {
        this.injections = injections;
      }
    }

    let props = injectionsCache;
    if (options !== undefined) {
      props = assign({}, injectionsCache, options);
    }

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
    }

    if (!this.class.create) {
      throw new Error(
        `Failed to create an instance of '${
          this.normalizedName
        }'. Most likely an improperly defined class or` + ` an invalid module export.`
      );
    }

    // required to allow access to things like
    // the customized toString, _debugContainerKey,
    // owner, etc. without a double extend and without
    // modifying the objects properties
    if (typeof this.class._initFactory === 'function') {
      this.class._initFactory(this);
    } else {
      // in the non-EmberObject case we need to still setOwner
      // this is required for supporting glimmer environment and
      // template instantiation which rely heavily on
      // `options[OWNER]` being passed into `create`
      // TODO: clean this up, and remove in future versions
      if (options === undefined || props === undefined) {
        // avoid mutating `props` here since they are the cached injections
        props = assign({}, props);
      }
      setOwner(props, this.owner!);
    }

    let instance = this.class.create(props);
    FACTORY_FOR.set(instance, this);

    return instance;
  }
}
