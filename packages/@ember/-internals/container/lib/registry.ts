import { Factory } from '@ember/-internals/owner';
import { dictionary, intern } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { set } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import Container, { ContainerOptions, LazyInjection } from './container';
export interface Injection {
  property: string;
  specifier: string;
}

export type ResolveOptions = {
  specifier?: string;
};

export interface TypeOptions {
  instantiate?: boolean;
  singleton?: boolean;
}

export interface KnownForTypeResult {
  [fullName: string]: boolean;
}

export interface IRegistry {
  describe(fullName: string): string;
  getOption<K extends keyof TypeOptions>(
    fullName: string,
    optionName: K
  ): TypeOptions[K] | undefined;
  getOptions(fullName: string): TypeOptions | undefined;
  getOptionsForType(type: string): TypeOptions | undefined;
  knownForType(type: string): KnownForTypeResult;
  makeToString<T, C>(factory: Factory<T, C>, fullName: string): string;
  normalizeFullName(fullName: string): string;
  resolve<T, C>(fullName: string, options?: ResolveOptions): Factory<T, C> | undefined;
}

export interface ResolverClass {
  create(...args: unknown[]): Resolver;
}

export interface Resolver {
  knownForType?: (type: string) => KnownForTypeResult;
  lookupDescription?: (fullName: string) => string;
  makeToString?: <T, C>(factory: Factory<T, C>, fullName: string) => string;
  normalize?: (fullName: string) => string;
  resolve<T, C>(name: string): Factory<T, C> | undefined;
}

export interface RegistryOptions {
  fallback?: IRegistry;
  registrations?: { [key: string]: object };
  resolver?: Resolver;
}

const VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;

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
export default class Registry implements IRegistry {
  readonly _failSet: Set<string>;
  resolver: Resolver | null;
  readonly fallback: IRegistry | null;
  readonly registrations: Record<string, object>;
  _localLookupCache: Record<string, object>;
  readonly _normalizeCache: Record<string, string>;
  readonly _options: Record<string, TypeOptions>;
  readonly _resolveCache: Record<string, object>;
  readonly _typeOptions: Record<string, TypeOptions>;

  set?: typeof set;

  constructor(options: RegistryOptions = {}) {
    this.fallback = options.fallback || null;
    this.resolver = options.resolver || null;

    this.registrations = dictionary(options.registrations || null);

    this._localLookupCache = Object.create(null);
    this._normalizeCache = dictionary(null);
    this._resolveCache = dictionary(null);
    this._failSet = new Set();

    this._options = dictionary(null);
    this._typeOptions = dictionary(null);
  }

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
  container(options?: ContainerOptions): Container {
    return new Container(this, options);
  }

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
  register(fullName: string, factory: object, options: TypeOptions & { instantiate: false }): void;
  register(fullName: string, factory: Factory<unknown>, options?: TypeOptions): void;
  register(fullName: string, factory: object, options: TypeOptions = {}): void {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));
    assert(`Attempting to register an unknown factory: '${fullName}'`, factory !== undefined);

    let normalizedName = this.normalize(fullName);
    assert(
      `Cannot re-register: '${fullName}', as it has already been resolved.`,
      !this._resolveCache[normalizedName]
    );

    this._failSet.delete(normalizedName);
    this.registrations[normalizedName] = factory;
    this._options[normalizedName] = options;
  }

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
  unregister(fullName: string): void {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));

    let normalizedName = this.normalize(fullName);

    this._localLookupCache = Object.create(null);

    delete this.registrations[normalizedName];
    delete this._resolveCache[normalizedName];
    delete this._options[normalizedName];
    this._failSet.delete(normalizedName);
  }

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
   @param {Object} [options]
   @param {String} [options.source] the fullname of the request source (used for local lookups)
   @return {Function} fullName's factory
   */
  resolve<T, C>(fullName: string): Factory<T, C> | undefined {
    let factory = resolve<T, C>(this, this.normalize(fullName));
    if (factory === undefined && this.fallback !== null) {
      factory = (this.fallback as any).resolve(...arguments);
    }
    return factory;
  }

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
  describe(fullName: string): string {
    if (this.resolver !== null && this.resolver.lookupDescription) {
      return this.resolver.lookupDescription(fullName);
    } else if (this.fallback !== null) {
      return this.fallback.describe(fullName);
    } else {
      return fullName;
    }
  }

  /**
   A hook to enable custom fullName normalization behavior

   @private
   @method normalizeFullName
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalizeFullName(fullName: string): string {
    if (this.resolver !== null && this.resolver.normalize) {
      return this.resolver.normalize(fullName);
    } else if (this.fallback !== null) {
      return this.fallback.normalizeFullName(fullName);
    } else {
      return fullName;
    }
  }

  /**
   Normalize a fullName based on the application's conventions

   @private
   @method normalize
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalize(fullName: string): string {
    return (
      this._normalizeCache[fullName] ||
      (this._normalizeCache[fullName] = this.normalizeFullName(fullName))
    );
  }

  /**
   @method makeToString

   @private
   @param {any} factory
   @param {string} fullName
   @return {function} toString function
   */
  makeToString<T, C>(factory: Factory<T, C>, fullName: string): string {
    if (this.resolver !== null && this.resolver.makeToString) {
      return this.resolver.makeToString(factory, fullName);
    } else if (this.fallback !== null) {
      return this.fallback.makeToString(factory, fullName);
    } else {
      return typeof factory === 'string' ? factory : factory.name ?? '(unknown class)';
    }
  }

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
  has(fullName: string): boolean {
    if (!this.isValidFullName(fullName)) {
      return false;
    }

    return has(this, this.normalize(fullName));
  }

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
  optionsForType(type: string, options: TypeOptions): void {
    this._typeOptions[type] = options;
  }

  getOptionsForType(type: string): TypeOptions | undefined {
    let optionsForType = this._typeOptions[type];
    if (optionsForType === undefined && this.fallback !== null) {
      optionsForType = this.fallback.getOptionsForType(type);
    }
    return optionsForType;
  }

  /**
   @private
   @method options
   @param {String} fullName
   @param {Object} options
   */
  options(fullName: string, options: TypeOptions): void {
    let normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  }

  getOptions(fullName: string): TypeOptions | undefined {
    let normalizedName = this.normalize(fullName);
    let options = this._options[normalizedName];

    if (options === undefined && this.fallback !== null) {
      options = this.fallback.getOptions(fullName);
    }
    return options;
  }

  getOption<K extends keyof TypeOptions>(
    fullName: string,
    optionName: K
  ): TypeOptions[K] | undefined {
    let options = this._options[fullName];

    if (options !== undefined && options[optionName] !== undefined) {
      return options[optionName];
    }

    let type = fullName.split(':')[0];
    assert('has type', type); // split always will have at least one value
    options = this._typeOptions[type];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    } else if (this.fallback !== null) {
      return this.fallback.getOption(fullName, optionName);
    }
    return undefined;
  }

  /**
   This is deprecated in favor of explicit injection of dependencies.

   Reference: https://deprecations.emberjs.com/v3.x#toc_implicit-injections
   ```

   @private
   @method injection
   @param {String} factoryName
   @param {String} property
   @param {String} injectionName
   @deprecated
   */
  injection(fullName: string, property: string): void {
    deprecate(
      `As of Ember 4.0.0, owner.inject no longer injects values into resolved instances, and calling the method has been deprecated. Since this method no longer does anything, it is fully safe to remove this injection. As an alternative to this API, you can refactor to explicitly inject \`${property}\` on \`${fullName}\`, or look it up directly using the \`getOwner\` API.`,
      false,
      {
        id: 'remove-owner-inject',
        until: '5.0.0',
        url: 'https://deprecations.emberjs.com/v4.x#toc_implicit-injections',
        for: 'ember-source',
        since: {
          available: '4.0.0',
          enabled: '4.0.0',
        },
      }
    );
  }

  /**
   @private
   @method knownForType
   @param {String} type the type to iterate over
  */
  knownForType(type: string): KnownForTypeResult {
    let localKnown = dictionary(null);
    let registeredNames = Object.keys(this.registrations);
    for (let fullName of registeredNames) {
      let itemType = fullName.split(':')[0];

      if (itemType === type) {
        localKnown[fullName] = true;
      }
    }

    let fallbackKnown, resolverKnown;
    if (this.fallback !== null) {
      fallbackKnown = this.fallback.knownForType(type);
    }

    if (this.resolver !== null && this.resolver.knownForType) {
      resolverKnown = this.resolver.knownForType(type);
    }

    return Object.assign({}, fallbackKnown, localKnown, resolverKnown);
  }

  isValidFullName(fullName: string): boolean {
    return VALID_FULL_NAME_REGEXP.test(fullName);
  }
}

export declare class DebugRegistry extends Registry {
  normalizeInjectionsHash(hash: { [key: string]: LazyInjection }): Injection[];
  validateInjections(injections: Injection[]): void;
}

if (DEBUG) {
  const proto = Registry.prototype as DebugRegistry;
  proto.normalizeInjectionsHash = function (hash: { [key: string]: LazyInjection }) {
    let injections: Injection[] = [];

    for (let key in hash) {
      if (Object.prototype.hasOwnProperty.call(hash, key)) {
        let value = hash[key];
        assert('has value', value);
        let { specifier } = value;
        assert(
          `Expected a proper full name, given '${specifier}'`,
          this.isValidFullName(specifier)
        );

        injections.push({
          property: key,
          specifier,
        });
      }
    }

    return injections;
  };

  proto.validateInjections = function (injections: Injection[]) {
    if (!injections) {
      return;
    }

    for (let injection of injections) {
      let { specifier } = injection;
      assert(`Attempting to inject an unknown injection: '${specifier}'`, this.has(specifier));
    }
  };
}

function resolve<T, C>(registry: Registry, _normalizedName: string): Factory<T, C> | undefined {
  let normalizedName = _normalizedName;

  let cached = registry._resolveCache[normalizedName];
  if (cached !== undefined) {
    return cached as Factory<T, C>;
  }
  if (registry._failSet.has(normalizedName)) {
    return;
  }

  let resolved: Factory<T, C> | undefined;

  if (registry.resolver) {
    resolved = registry.resolver.resolve<T, C>(normalizedName);
  }

  if (resolved === undefined) {
    resolved = registry.registrations[normalizedName] as Factory<T, C> | undefined;
  }

  if (resolved === undefined) {
    registry._failSet.add(normalizedName);
  } else {
    registry._resolveCache[normalizedName] = resolved;
  }

  return resolved;
}

function has(registry: Registry, fullName: string) {
  return registry.resolve(fullName) !== undefined;
}

const privateNames: { [key: string]: string } = dictionary(null);
const privateSuffix = `${Math.random()}${Date.now()}`.replace('.', '');

export function privatize([fullName]: TemplateStringsArray): string {
  assert('has a single string argument', arguments.length === 1 && fullName);

  let name = privateNames[fullName];
  if (name) {
    return name;
  }

  let [type, rawName] = fullName.split(':');
  return (privateNames[fullName] = intern(`${type}:${rawName}-${privateSuffix}`));
}
