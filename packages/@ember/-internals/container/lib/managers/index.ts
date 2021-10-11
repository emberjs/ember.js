import type Container from '../container';
import { DEBUG } from '@glimmer/env';
import { Factory, Owner, setOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';

import { symbol } from '@ember/-internals/utils';

export const INIT_FACTORY = symbol('INIT_FACTORY');

export function getFactoryFor<T extends object>(obj: T): Factory<T> {
  return obj[INIT_FACTORY];
}

export function setFactoryFor<T extends object>(obj: T, factory: Factory<T>): void {
  obj[INIT_FACTORY] = factory;
}

export interface LazyInjection {
  namespace: string | undefined;
  source: string | undefined;
  specifier: string;
}

export interface ClassicClass<T> {
  create(props: unknown): T;

  _onLookup?: (fullName: string) => void;
  _initFactory?: (factoryManager: Factory<T>) => void;
  _lazyInjections?(): { [key: string]: LazyInjection };
}

// SomeClass { singleton: false, instantiate: true }
// TODO should we refactor to use subclasses?
export class FactoryInstanceManager<T extends object, C extends ClassicClass<T>>
  implements Factory<T> {
  readonly container: Container;
  readonly owner: Owner | null;
  readonly class: C;
  readonly fullName: string;
  readonly normalizedName: string;
  private madeToString: string | undefined;
  injections: { [key: string]: unknown } | undefined;

  constructor(container: Container, klass: C, fullName: string, normalizedName: string) {
    this.container = container;
    this.owner = container.owner;
    this.class = klass;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
    this.madeToString = undefined;
    this.injections = undefined;
    setFactoryFor(this, this);
  }

  toString(): string {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create(options?: { [prop: string]: unknown }): T {
    let { container } = this;

    if (container.isDestroyed) {
      throw new Error(
        `Can not create new instances after the owner has been destroyed (you attempted to create ${this.fullName})`
      );
    }

    // TODO: why do we always create props? Seems like we should only create them if needed...
    let props = {};
    setOwner(props, container.owner!);
    setFactoryFor(props, this);

    if (options !== undefined) {
      props = Object.assign({}, props, options);
    }

    if (DEBUG) {
      let { fullName, normalizedName } = this;

      let lazyInjections;
      let validationCache = container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (
        !validationCache[fullName] &&
        this.class &&
        typeof this.class._lazyInjections === 'function'
      ) {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = container.registry.normalizeInjectionsHash(lazyInjections);

        container.registry.validateInjections(lazyInjections);
      }

      validationCache[fullName] = true;

      assert(
        `Failed to create an instance of '${normalizedName}'. Most likely an improperly defined class or an invalid module export.`,
        typeof this.class.create === 'function'
      );
    }

    let result = this.class.create(props);

    // if this lookup happened _during_ destruction (emits a deprecation, but
    // is still possible) ensure that it gets destroyed
    if (container.isDestroying) {
      // TODO: should this use destroyables?
      if ('destroy' in result && typeof result.destroy === 'function') {
        result.destroy();
      }
    }

    return result;
  }
}

// SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
// By default majority of objects fall into this case
// Singleton Instance should create once, and return the cached value on subsequent calls
export class SingletonInstanceManager<T extends object, C extends ClassicClass<T>>
  extends FactoryInstanceManager<T, C>
  implements Factory<T> {
  private hasCached = false;
  // TODO: fix type assertion
  private cachedResult!: T;

  create(options?: { [prop: string]: unknown }): T {
    if (this.hasCached) {
      return this.cachedResult;
    }

    let result = super.create(options);

    this.hasCached = true;
    this.cachedResult = result;

    return result;
  }
}

// SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
export class NonInstantiateManager<T extends object, C extends ClassicClass<T>>
  implements Factory<T> {
  readonly class: C;
  private madeToString: string | undefined;
  container: Container;
  owner: Owner | null;
  fullName: string;

  constructor(container: Container, klass: C, fullName: string) {
    this.container = container;
    this.owner = container.owner;
    this.class = klass;
    this.fullName = fullName;
    this.madeToString = undefined;
    setFactoryFor(this, this);
  }

  toString(): string {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create() {
    return this.class;
  }
}
