import { dictionary, assign, intern } from 'ember-utils';
import { assert, deprecate } from 'ember-debug';
import { EMBER_MODULE_UNIFICATION } from 'ember/features';
import Container from './container';
import { DEBUG } from 'ember-env-flags';

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
export default function Registry(options = {}) {
  this.fallback = options.fallback || null;

  if (options.resolver) {
    this.resolver = options.resolver;
    if (typeof this.resolver === 'function') {
      deprecateResolverFunction(this);
    }
  }

  this.registrations = dictionary(options.registrations || null);

  this._typeInjections        = dictionary(null);
  this._injections            = dictionary(null);

  this._localLookupCache      = Object.create(null);
  this._normalizeCache        = dictionary(null);
  this._resolveCache          = dictionary(null);
  this._failCache             = dictionary(null);

  this._options               = dictionary(null);
  this._typeOptions           = dictionary(null);
}

Registry.prototype = {
  /**
   A backup registry for resolving registrations when no matches can be found.

   @private
   @property fallback
   @type Registry
   */
  fallback: null,

  /**
   An object that has a `resolve` method that resolves a name.

   @private
   @property resolver
   @type Resolver
   */
  resolver: null,

  /**
   @private
   @property registrations
   @type InheritingDict
   */
  registrations: null,

  /**
   @private

   @property _typeInjections
   @type InheritingDict
   */
  _typeInjections: null,

  /**
   @private

   @property _injections
   @type InheritingDict
   */
  _injections: null,

  /**
   @private

   @property _normalizeCache
   @type InheritingDict
   */
  _normalizeCache: null,

  /**
   @private

   @property _resolveCache
   @type InheritingDict
   */
  _resolveCache: null,

  /**
   @private

   @property _options
   @type InheritingDict
   */
  _options: null,

  /**
   @private

   @property _typeOptions
   @type InheritingDict
   */
  _typeOptions: null,

  /**
   Creates a container based on this registry.

   @private
   @method container
   @param {Object} options
   @return {Container} created container
   */
  container(options) {
    return new Container(this, options);
  },

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
    assert('fullName must be a proper full name', this.validateFullName(fullName));

    if (factory === undefined) {
      throw new TypeError(`Attempting to register an unknown factory: '${fullName}'`);
    }

    let normalizedName = this.normalize(fullName);

    if (this._resolveCache[normalizedName]) {
      throw new Error(`Cannot re-register: '${fullName}', as it has already been resolved.`);
    }

    delete this._failCache[normalizedName];
    this.registrations[normalizedName] = factory;
    this._options[normalizedName] = options;
  },

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
    assert('fullName must be a proper full name', this.validateFullName(fullName));

    let normalizedName = this.normalize(fullName);

    this._localLookupCache = Object.create(null);

    delete this.registrations[normalizedName];
    delete this._resolveCache[normalizedName];
    delete this._failCache[normalizedName];
    delete this._options[normalizedName];
  },

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
    assert('fullName must be a proper full name', this.validateFullName(fullName));
    let factory = resolve(this, this.normalize(fullName), options);
    if (factory === undefined && this.fallback) {
      factory = this.fallback.resolve(...arguments);
    }
    return factory;
  },

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
    if (this.resolver && this.resolver.lookupDescription) {
      return this.resolver.lookupDescription(fullName);
    } else if (this.fallback) {
      return this.fallback.describe(fullName);
    } else {
      return fullName;
    }
  },

  /**
   A hook to enable custom fullName normalization behavior

   @private
   @method normalizeFullName
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalizeFullName(fullName) {
    if (this.resolver && this.resolver.normalize) {
      return this.resolver.normalize(fullName);
    } else if (this.fallback) {
      return this.fallback.normalizeFullName(fullName);
    } else {
      return fullName;
    }
  },

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
  },

  /**
   @method makeToString

   @private
   @param {any} factory
   @param {string} fullName
   @return {function} toString function
   */
  makeToString(factory, fullName) {
    if (this.resolver && this.resolver.makeToString) {
      return this.resolver.makeToString(factory, fullName);
    } else if (this.fallback) {
      return this.fallback.makeToString(factory, fullName);
    } else {
      return factory.toString();
    }
  },

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
    if (!this.isValidFullName(fullName)) {
      return false;
    }

    let source = options && options.source && this.normalize(options.source);

    return has(this, this.normalize(fullName), source);
  },

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
  },

  getOptionsForType(type) {
    let optionsForType = this._typeOptions[type];
    if (optionsForType === undefined && this.fallback) {
      optionsForType = this.fallback.getOptionsForType(type);
    }
    return optionsForType;
  },

  /**
   @private
   @method options
   @param {String} fullName
   @param {Object} options
   */
  options(fullName, options = {}) {
    let normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  },

  getOptions(fullName) {
    let normalizedName = this.normalize(fullName);
    let options = this._options[normalizedName];

    if (options === undefined && this.fallback) {
      options = this.fallback.getOptions(fullName);
    }
    return options;
  },

  getOption(fullName, optionName) {
    let options = this._options[fullName];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    }

    let type = fullName.split(':')[0];
    options = this._typeOptions[type];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    } else if (this.fallback) {
      return this.fallback.getOption(fullName, optionName);
    }
  },

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
    assert('fullName must be a proper full name', this.validateFullName(fullName));

    let fullNameType = fullName.split(':')[0];
    if (fullNameType === type) {
      throw new Error(`Cannot inject a '${fullName}' on other ${type}(s).`);
    }

    let injections = this._typeInjections[type] ||
                     (this._typeInjections[type] = []);

    injections.push({
      property: property,
      fullName: fullName
    });
  },

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
  injection(fullName, property, injectionName) {
    this.validateFullName(injectionName);
    let normalizedInjectionName = this.normalize(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.typeInjection(fullName, property, normalizedInjectionName);
    }

    assert('fullName must be a proper full name', this.validateFullName(fullName));
    let normalizedName = this.normalize(fullName);

    let injections = this._injections[normalizedName] ||
                     (this._injections[normalizedName] = []);

    injections.push({
      property: property,
      fullName: normalizedInjectionName
    });
  },

  /**
   @private
   @method knownForType
   @param {String} type the type to iterate over
  */
  knownForType(type) {
    let fallbackKnown, resolverKnown;

    let localKnown = dictionary(null);
    let registeredNames = Object.keys(this.registrations);
    for (let index = 0; index < registeredNames.length; index++) {
      let fullName = registeredNames[index];
      let itemType = fullName.split(':')[0];

      if (itemType === type) {
        localKnown[fullName] = true;
      }
    }

    if (this.fallback) {
      fallbackKnown = this.fallback.knownForType(type);
    }

    if (this.resolver && this.resolver.knownForType) {
      resolverKnown = this.resolver.knownForType(type);
    }

    return assign({}, fallbackKnown, localKnown, resolverKnown);
  },

  validateFullName(fullName) {
    if (!this.isValidFullName(fullName)) {
      throw new TypeError(`Invalid Fullname, expected: 'type:name' got: ${fullName}`);
    }

    return true;
  },

  isValidFullName(fullName) {
    return VALID_FULL_NAME_REGEXP.test(fullName);
  },

  normalizeInjectionsHash(hash) {
    let injections = [];

    for (let key in hash) {
      if (hash.hasOwnProperty(key)) {
        assert(`Expected a proper full name, given '${hash[key]}'`, this.validateFullName(hash[key]));

        injections.push({
          property: key,
          fullName: hash[key]
        });
      }
    }

    return injections;
  },

  getInjections(fullName) {
    let injections = this._injections[fullName] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getInjections(fullName));
    }
    return injections;
  },

  getTypeInjections(type) {
    let injections = this._typeInjections[type] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getTypeInjections(type));
    }
    return injections;
  },

  resolverCacheKey(name, options) {
    if (!EMBER_MODULE_UNIFICATION) {
      return name;
    }

    return (options && options.source) ? `${options.source}:${name}` : name;
  }
};

function deprecateResolverFunction(registry) {
  deprecate('Passing a `resolver` function into a Registry is deprecated. Please pass in a Resolver object with a `resolve` method.',
            false,
            { id: 'ember-application.registry-resolver-as-function', until: '3.0.0', url: 'https://emberjs.com/deprecations/v2.x#toc_registry-resolver-as-function' });
  registry.resolver = {
    resolve: registry.resolver
  };
}

if (DEBUG) {
  Registry.prototype.validateInjections = function(injections) {
    if (!injections) { return; }

    let fullName;

    for (let i = 0; i < injections.length; i++) {
      fullName = injections[i].fullName;

      assert(`Attempting to inject an unknown injection: '${fullName}'`, this.has(fullName));
    }
  }
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
Registry.prototype.expandLocalLookup = function Registry_expandLocalLookup(fullName, options) {
  if (this.resolver && this.resolver.expandLocalLookup) {
    assert('fullName must be a proper full name', this.validateFullName(fullName));
    assert('options.source must be provided to expandLocalLookup', options && options.source);
    assert('options.source must be a proper full name', this.validateFullName(options.source));

    let normalizedFullName = this.normalize(fullName);
    let normalizedSource = this.normalize(options.source);

    return expandLocalLookup(this, normalizedFullName, normalizedSource);
  } else if (this.fallback) {
    return this.fallback.expandLocalLookup(fullName, options);
  } else {
    return null;
  }
};

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
  if (registry._failCache[cacheKey]) { return; }

  let resolved;

  if (registry.resolver) {
    resolved = registry.resolver.resolve(normalizedName, options && options.source);
  }

  if (resolved === undefined) {
    resolved = registry.registrations[normalizedName];
  }

  if (resolved === undefined) {
    registry._failCache[cacheKey] = true;
  } else {
    registry._resolveCache[cacheKey] = resolved;
  }

  return resolved;
}

function has(registry, fullName, source) {
  return registry.resolve(fullName, { source }) !== undefined;
}

const privateNames = dictionary(null);
const privateSuffix = `${Math.random()}${Date.now()}`.replace('.', '');

export function privatize([fullName]) {
  let name = privateNames[fullName];
  if (name) { return name; }

  let [type, rawName] = fullName.split(':');
  return privateNames[fullName] = intern(`${type}:${rawName}-${privateSuffix}`);
}
