import { dictionary, assign, intern } from 'ember-utils';
import { assert, deprecate } from 'ember-debug';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import Container, {
  parseInjectionString,
  RAW_STRING_OPTION_KEY
} from './container';
import { DEBUG } from 'ember-env-flags';
import { ENV } from 'ember-environment';

const VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;

let missingResolverFunctionsDeprecation = 'Passing a `resolver` function into a Registry is deprecated. Please pass in a Resolver object with a `resolve` method.';

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
  constructor(options = {}) {
    this.fallback = options.fallback || null;
    this.resolver = options.resolver || null;

    if (ENV._ENABLE_RESOLVER_FUNCTION_SUPPORT !== true) {
      assert(
        missingResolverFunctionsDeprecation,
        typeof this.resolver !== 'function'
      );
    }

    if (typeof this.resolver === 'function' && ENV._ENABLE_RESOLVER_FUNCTION_SUPPORT === true) {
      deprecateResolverFunction(this);
    }

    this.registrations = dictionary(options.registrations || null);

    this._typeInjections        = dictionary(null);
    this._injections            = dictionary(null);

    this._localLookupCache      = Object.create(null);
    this._normalizeCache        = dictionary(null);
    this._resolveCache          = dictionary(null);
    this._failSet               = new Set();

    this._options               = dictionary(null);
    this._typeOptions           = dictionary(null);
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

   @property _typeInjections
   @type InheritingDict
   */

  /**
   @private

   @property _injections
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
  container(options) {
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
  register(fullName, factory, options = {}) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName, options));
    assert(`Attempting to register an unknown factory: '${fullName}'`, factory !== undefined);

    let normalizedName = this.normalize(fullName);
    let cacheKey = this.resolverCacheKey(normalizedName, options);
    assert(`Cannot re-register: '${fullName}', as it has already been resolved.`, !this._resolveCache[cacheKey]);

    this._failSet.delete(cacheKey);
    this.registrations[normalizedName] = factory;
    this._options[cacheKey] = options;
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
  unregister(fullName) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));

    let normalizedName = this.normalize(fullName);
    let cacheKey = this.resolverCacheKey(normalizedName);

    this._localLookupCache = Object.create(null);


    delete this.registrations[normalizedName];
    delete this._resolveCache[cacheKey];
    delete this._options[cacheKey];
    this._failSet.delete(cacheKey);
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
  resolve(fullName, options) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName, options));
    let factory = resolve(this, this.normalize(fullName), options);
    if (factory === undefined && this.fallback !== null) {
      factory = this.fallback.resolve(...arguments);
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
  describe(fullName) {
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
  normalizeFullName(fullName) {
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
  normalize(fullName) {
    return this._normalizeCache[fullName] || (
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
  makeToString(factory, fullName) {
    if (this.resolver !== null && this.resolver.makeToString) {
      return this.resolver.makeToString(factory, fullName);
    } else if (this.fallback !== null) {
      return this.fallback.makeToString(factory, fullName);
    } else {
      return factory.toString();
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
  has(fullName, options) {
    if (!this.isValidFullName(fullName, options)) {
      return false;
    }

    let source = options && options.source && this.normalize(options.source);
    let rawString = options && options[RAW_STRING_OPTION_KEY];

    return has(this, this.normalize(fullName), source, rawString);
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
  optionsForType(type, options) {
    this._typeOptions[type] = options;
  }

  getOptionsForType(type) {
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
  options(fullName, options = {}) {
    let cacheKey = this.resolverCacheKey(this.normalize(fullName));
    this._options[cacheKey] = options;
  }

  getOptions(fullName) {
    let cacheKey = this.resolverCacheKey(this.normalize(fullName));
    let options = this._options[cacheKey];

    if (options === undefined && this.fallback !== null) {
      options = this.fallback.getOptions(fullName);
    }
    return options;
  }

  getOption(fullName, optionName, __options={}) {
    let options = this._options[this.resolverCacheKey(fullName, __options)];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    }

    let type = fullName.split(':')[0];
    options = this._typeOptions[type];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    } else if (this.fallback !== null) {
      return this.fallback.getOption(fullName, optionName, __options);
    }
  }

  /**
   Used only via `injection`.

   Provides a specialized form of injection, specifically enabling
   all objects of one type to be injected with a reference to another
   object.

   For example, provided each object of type `controller` needed a `router`.
   one would do the following:

   ```javascript
   let registry = new Registry();
   let container = registry.container();

   registry.register('router:main', Router);
   registry.register('controller:user', UserController);
   registry.register('controller:post', PostController);

   registry.typeInjection('controller', 'router', 'router:main');

   let user = container.lookup('controller:user');
   let post = container.lookup('controller:post');

   user.router instanceof Router; //=> true
   post.router instanceof Router; //=> true

   // both controllers share the same router
   user.router === post.router; //=> true
   ```

   @private
   @method typeInjection
   @param {String} type
   @param {String} property
   @param {String} fullName
   */
  typeInjection(type, property, fullName) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));

    let fullNameType = fullName.split(':')[0];
    assert(`Cannot inject a '${fullName}' on other ${type}(s).`, fullNameType !== type);

    let injections = this._typeInjections[type] ||
                     (this._typeInjections[type] = []);

    injections.push({ property, fullName });
  }

  /**
   Defines injection rules.

   These rules are used to inject dependencies onto objects when they
   are instantiated.

   Two forms of injections are possible:

   * Injecting one fullName on another fullName
   * Injecting one fullName on a type

   Example:

   ```javascript
   let registry = new Registry();
   let container = registry.container();

   registry.register('source:main', Source);
   registry.register('model:user', User);
   registry.register('model:post', Post);

   // injecting one fullName on another fullName
   // eg. each user model gets a post model
   registry.injection('model:user', 'post', 'model:post');

   // injecting one fullName on another type
   registry.injection('model', 'source', 'source:main');

   let user = container.lookup('model:user');
   let post = container.lookup('model:post');

   user.source instanceof Source; //=> true
   post.source instanceof Source; //=> true

   user.post instanceof Post; //=> true

   // and both models share the same source
   user.source === post.source; //=> true
   ```

   @private
   @method injection
   @param {String} factoryName
   @param {String} property
   @param {String} injectionName
   */
  injection(fullName, property, injectionName, options) {
    assert(`Invalid injectionName, expected: 'type:name' got: ${injectionName}`, this.isValidFullName(injectionName, options));

    let normalizedInjectionName = this.normalize(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.typeInjection(fullName, property, normalizedInjectionName);
    }

    assert('fullName must be a proper full name', this.isValidFullName(fullName));
    let normalizedName = this.normalize(fullName);

    let injections = this._injections[normalizedName] ||
                     (this._injections[normalizedName] = []);

    injections.push({ property, fullName: normalizedInjectionName });
  }

  /**
   @private
   @method knownForType
   @param {String} type the type to iterate over
  */
  knownForType(type) {
    let localKnown = dictionary(null);
    let registeredNames = Object.keys(this.registrations);
    for (let index = 0; index < registeredNames.length; index++) {
      let fullName = registeredNames[index];
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

    return assign({}, fallbackKnown, localKnown, resolverKnown);
  }

  isValidFullName(fullName, options) {
    if(EMBER_MODULE_UNIFICATION) {
      /* With a rawString, the fullName doesn't need to contain a : */
      if (options && options[RAW_STRING_OPTION_KEY] && fullName) {
        return true;
      }
    }

    return VALID_FULL_NAME_REGEXP.test(fullName);
  }

  getInjections(fullName) {
    let injections = this._injections[fullName] || [];
    if (this.fallback !== null) {
      injections = injections.concat(this.fallback.getInjections(fullName));
    }
    return injections;
  }

  getTypeInjections(type) {
    let injections = this._typeInjections[type] || [];
    if (this.fallback !== null) {
      injections = injections.concat(this.fallback.getTypeInjections(type));
    }
    return injections;
  }

  resolverCacheKey(name, options={}) {
    return [
      name,
      options.source,
      options[RAW_STRING_OPTION_KEY]
    ].join('\0');
  }

  /**
   Given a fullName and a source fullName returns the fully resolved
   fullName. Used to allow for local lookup.

   ```javascript
   let registry = new Registry();

   // the twitter factory is added to the module system
   registry.expandLocalLookup('component:post-title', { source: 'template:post' }) // => component:post/post-title
   ```

   @private
   @method expandLocalLookup
   @param {String} fullName
   @param {Object} [options]
   @param {String} [options.source] the fullname of the request source (used for local lookups)
   @return {String} fullName
   */
  expandLocalLookup(fullName, options) {
    if (this.resolver !== null && this.resolver.expandLocalLookup) {
      assert('fullName must be a proper full name', this.isValidFullName(fullName));
      assert('options.source must be provided to expandLocalLookup', options && options.source);
      assert('options.source must be a proper full name', this.isValidFullName(options.source));

      let normalizedFullName = this.normalize(fullName);
      let normalizedSource = this.normalize(options.source);

      return expandLocalLookup(this, normalizedFullName, normalizedSource);
    } else if (this.fallback !== null) {
      return this.fallback.expandLocalLookup(fullName, options);
    } else {
      return null;
    }
  }
}

function deprecateResolverFunction(registry) {
  deprecate(
    missingResolverFunctionsDeprecation,
    false,
    { id: 'ember-application.registry-resolver-as-function', until: '3.0.0', url: 'https://emberjs.com/deprecations/v2.x#toc_registry-resolver-as-function' }
  );
  registry.resolver = { resolve: registry.resolver };
}

if (DEBUG) {
  Registry.prototype.normalizeInjectionsHash = function(hash) {
    let injections = [];

    for (let key in hash) {
      if (hash.hasOwnProperty(key)) {
        let {
          fullName,
          rawString
        } = parseInjectionString(hash[key]);
        assert(`Expected a proper full name, given '${fullName}'`, this.isValidFullName(fullName, {[RAW_STRING_OPTION_KEY]: rawString}));

        injections.push({
          property: key,
          fullName: hash[key]
        });
      }
    }

    return injections;
  };

  Registry.prototype.validateInjections = function(injections) {
    if (!injections) { return; }

    for (let i = 0; i < injections.length; i++) {
      let {
        fullName,
        rawString
      } = parseInjectionString(injections[i].fullName);

      assert(`Attempting to inject an unknown injection: '${fullName}'`, this.has(fullName, {[RAW_STRING_OPTION_KEY]: rawString}));
    }
  };
}

function expandLocalLookup(registry, normalizedName, normalizedSource) {
  let cache = registry._localLookupCache;
  let normalizedNameCache = cache[normalizedName];

  if (!normalizedNameCache) {
    normalizedNameCache = cache[normalizedName] = Object.create(null);
  }

  let cached = normalizedNameCache[normalizedSource];

  if (cached !== undefined) { return cached; }

  let expanded = registry.resolver.expandLocalLookup(normalizedName, normalizedSource);

  return normalizedNameCache[normalizedSource] = expanded;
}

function resolve(registry, normalizedName, options) {
  if (options && options.source) {
    // when `source` is provided expand normalizedName
    // and source into the full normalizedName
    let expandedNormalizedName = registry.expandLocalLookup(normalizedName, options);

    // if expandLocalLookup returns falsey, we do not support local lookup
    if (!EMBER_MODULE_UNIFICATION) {
      if (!expandedNormalizedName) {
        return;
      }

      normalizedName = expandedNormalizedName;
    } else if (expandedNormalizedName) {
      // with ember-module-unification, if expandLocalLookup returns something,
      // pass it to the resolve without the source
      normalizedName = expandedNormalizedName;
      options = {};
    }
  }

  let cacheKey = registry.resolverCacheKey(normalizedName, options);
  let cached = registry._resolveCache[cacheKey];
  if (cached !== undefined) { return cached; }
  if (registry._failSet.has(cacheKey)) { return; }

  let resolved;

  if (registry.resolver) {
    resolved = registry.resolver.resolve(normalizedName, options && options.source, options && options[RAW_STRING_OPTION_KEY]);
  }

  if (resolved === undefined) {
    resolved = registry.registrations[normalizedName];
  }

  if (resolved === undefined) {
    registry._failSet.add(cacheKey);
  } else {
    registry._resolveCache[cacheKey] = resolved;
  }

  return resolved;
}

function has(registry, fullName, source, rawString) {
  return registry.resolve(fullName, {
    source,
    [RAW_STRING_OPTION_KEY]: rawString
  }) !== undefined;
}

const privateNames = dictionary(null);
const privateSuffix = `${Math.random()}${Date.now()}`.replace('.', '');

export function privatize([fullName]) {
  let name = privateNames[fullName];
  if (name) { return name; }

  let [type, rawName] = fullName.split(':');
  return privateNames[fullName] = intern(`${type}:${rawName}-${privateSuffix}`);
}
