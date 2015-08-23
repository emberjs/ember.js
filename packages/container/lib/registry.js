import { assert } from 'ember-metal/debug';
import dictionary from 'ember-metal/dictionary';
import assign from 'ember-metal/assign';
import Container from './container';

var VALID_FULL_NAME_REGEXP = /^[^:]+.+:[^:]+$/;

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
function Registry(options) {
  this.fallback = options && options.fallback ? options.fallback : null;

  this.resolver = options && options.resolver ? options.resolver : function() {};

  this.registrations  = dictionary(options && options.registrations ? options.registrations : null);

  this._typeInjections        = dictionary(null);
  this._injections            = dictionary(null);
  this._factoryTypeInjections = dictionary(null);
  this._factoryInjections     = dictionary(null);

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
   @private
   @property resolver
   @type function
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

   @property _factoryTypeInjections
   @type InheritingDict
   */
  _factoryTypeInjections: null,

  /**
   @private

   @property _factoryInjections
   @type InheritingDict
   */
  _factoryInjections: null,

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
   var registry = new Registry();

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
  register(fullName, factory, options) {
    assert('fullName must be a proper full name', this.validateFullName(fullName));

    if (factory === undefined) {
      throw new TypeError('Attempting to register an unknown factory: `' + fullName + '`');
    }

    var normalizedName = this.normalize(fullName);

    if (this._resolveCache[normalizedName]) {
      throw new Error('Cannot re-register: `' + fullName + '`, as it has already been resolved.');
    }

    delete this._failCache[normalizedName];
    this.registrations[normalizedName] = factory;
    this._options[normalizedName] = (options || {});
  },

  /**
   Unregister a fullName

   ```javascript
   var registry = new Registry();
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

    var normalizedName = this.normalize(fullName);

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
   var registry = new Registry();
   registry.register('api:twitter', Twitter);

   registry.resolve('api:twitter') // => Twitter
   ```

   Optionally the registry can be provided with a custom resolver.
   If provided, `resolve` will first provide the custom resolver
   the opportunity to resolve the fullName, otherwise it will fallback
   to the registry.

   ```javascript
   var registry = new Registry();
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
  resolve(fullName) {
    assert('fullName must be a proper full name', this.validateFullName(fullName));
    var factory = resolve(this, this.normalize(fullName));
    if (factory === undefined && this.fallback) {
      factory = this.fallback.resolve(fullName);
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
    return fullName;
  },

  /**
   A hook to enable custom fullName normalization behaviour

   @private
   @method normalizeFullName
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalizeFullName(fullName) {
    return fullName;
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
    return factory.toString();
  },

  /**
   Given a fullName check if the container is aware of its factory
   or singleton instance.

   @private
   @method has
   @param {String} fullName
   @return {Boolean}
   */
  has(fullName) {
    assert('fullName must be a proper full name', this.validateFullName(fullName));
    return has(this, this.normalize(fullName));
  },

  /**
   Allow registering options for all factories of a type.

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   // if all of type `connection` must not be singletons
   registry.optionsForType('connection', { singleton: false });

   registry.register('connection:twitter', TwitterConnection);
   registry.register('connection:facebook', FacebookConnection);

   var twitter = container.lookup('connection:twitter');
   var twitter2 = container.lookup('connection:twitter');

   twitter === twitter2; // => false

   var facebook = container.lookup('connection:facebook');
   var facebook2 = container.lookup('connection:facebook');

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
    var optionsForType = this._typeOptions[type];
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
  options(fullName, options) {
    options = options || {};
    var normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  },

  getOptions(fullName) {
    var normalizedName = this.normalize(fullName);
    var options = this._options[normalizedName];
    if (options === undefined && this.fallback) {
      options = this.fallback.getOptions(fullName);
    }
    return options;
  },

  getOption(fullName, optionName) {
    var options = this._options[fullName];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    }

    var type = fullName.split(':')[0];
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
   var registry = new Registry();
   var container = registry.container();

   registry.register('router:main', Router);
   registry.register('controller:user', UserController);
   registry.register('controller:post', PostController);

   registry.typeInjection('controller', 'router', 'router:main');

   var user = container.lookup('controller:user');
   var post = container.lookup('controller:post');

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

    var fullNameType = fullName.split(':')[0];
    if (fullNameType === type) {
      throw new Error('Cannot inject a `' + fullName +
      '` on other ' + type + '(s).');
    }

    var injections = this._typeInjections[type] ||
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
   var registry = new Registry();
   var container = registry.container();

   registry.register('source:main', Source);
   registry.register('model:user', User);
   registry.register('model:post', Post);

   // injecting one fullName on another fullName
   // eg. each user model gets a post model
   registry.injection('model:user', 'post', 'model:post');

   // injecting one fullName on another type
   registry.injection('model', 'source', 'source:main');

   var user = container.lookup('model:user');
   var post = container.lookup('model:post');

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
    var normalizedInjectionName = this.normalize(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.typeInjection(fullName, property, normalizedInjectionName);
    }

    assert('fullName must be a proper full name', this.validateFullName(fullName));
    var normalizedName = this.normalize(fullName);

    var injections = this._injections[normalizedName] ||
                     (this._injections[normalizedName] = []);

    injections.push({
      property: property,
      fullName: normalizedInjectionName
    });
  },


  /**
   Used only via `factoryInjection`.

   Provides a specialized form of injection, specifically enabling
   all factory of one type to be injected with a reference to another
   object.

   For example, provided each factory of type `model` needed a `store`.
   one would do the following:

   ```javascript
   var registry = new Registry();

   registry.register('store:main', SomeStore);

   registry.factoryTypeInjection('model', 'store', 'store:main');

   var store = registry.lookup('store:main');
   var UserFactory = registry.lookupFactory('model:user');

   UserFactory.store instanceof SomeStore; //=> true
   ```

   @private
   @method factoryTypeInjection
   @param {String} type
   @param {String} property
   @param {String} fullName
   */
  factoryTypeInjection(type, property, fullName) {
    var injections = this._factoryTypeInjections[type] ||
                     (this._factoryTypeInjections[type] = []);

    injections.push({
      property: property,
      fullName: this.normalize(fullName)
    });
  },

  /**
   Defines factory injection rules.

   Similar to regular injection rules, but are run against factories, via
   `Registry#lookupFactory`.

   These rules are used to inject objects onto factories when they
   are looked up.

   Two forms of injections are possible:

   * Injecting one fullName on another fullName
   * Injecting one fullName on a type

   Example:

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('store:main', Store);
   registry.register('store:secondary', OtherStore);
   registry.register('model:user', User);
   registry.register('model:post', Post);

   // injecting one fullName on another type
   registry.factoryInjection('model', 'store', 'store:main');

   // injecting one fullName on another fullName
   registry.factoryInjection('model:post', 'secondaryStore', 'store:secondary');

   var UserFactory = container.lookupFactory('model:user');
   var PostFactory = container.lookupFactory('model:post');
   var store = container.lookup('store:main');

   UserFactory.store instanceof Store; //=> true
   UserFactory.secondaryStore instanceof OtherStore; //=> false

   PostFactory.store instanceof Store; //=> true
   PostFactory.secondaryStore instanceof OtherStore; //=> true

   // and both models share the same source instance
   UserFactory.store === PostFactory.store; //=> true
   ```

   @private
   @method factoryInjection
   @param {String} factoryName
   @param {String} property
   @param {String} injectionName
   */
  factoryInjection(fullName, property, injectionName) {
    var normalizedName = this.normalize(fullName);
    var normalizedInjectionName = this.normalize(injectionName);

    this.validateFullName(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.factoryTypeInjection(normalizedName, property, normalizedInjectionName);
    }

    var injections = this._factoryInjections[normalizedName] || (this._factoryInjections[normalizedName] = []);

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
    for (let index = 0, length = registeredNames.length; index < length; index++) {
      let fullName = registeredNames[index];
      let itemType = fullName.split(':')[0];

      if (itemType === type) {
        localKnown[fullName] = true;
      }
    }

    if (this.fallback) {
      fallbackKnown = this.fallback.knownForType(type);
    }

    if (this.resolver.knownForType) {
      resolverKnown = this.resolver.knownForType(type);
    }

    return assign({}, fallbackKnown, localKnown, resolverKnown);
  },

  validateFullName(fullName) {
    if (!VALID_FULL_NAME_REGEXP.test(fullName)) {
      throw new TypeError('Invalid Fullname, expected: `type:name` got: ' + fullName);
    }
    return true;
  },

  validateInjections(injections) {
    if (!injections) { return; }

    var fullName;

    for (var i = 0, length = injections.length; i < length; i++) {
      fullName = injections[i].fullName;

      if (!this.has(fullName)) {
        throw new Error('Attempting to inject an unknown injection: `' + fullName + '`');
      }
    }
  },

  normalizeInjectionsHash(hash) {
    var injections = [];

    for (var key in hash) {
      if (hash.hasOwnProperty(key)) {
        assert('Expected a proper full name, given \'' + hash[key] + '\'', this.validateFullName(hash[key]));

        injections.push({
          property: key,
          fullName: hash[key]
        });
      }
    }

    return injections;
  },

  getInjections(fullName) {
    var injections = this._injections[fullName] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getInjections(fullName));
    }
    return injections;
  },

  getTypeInjections(type) {
    var injections = this._typeInjections[type] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getTypeInjections(type));
    }
    return injections;
  },

  getFactoryInjections(fullName) {
    var injections = this._factoryInjections[fullName] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getFactoryInjections(fullName));
    }
    return injections;
  },

  getFactoryTypeInjections(type) {
    var injections = this._factoryTypeInjections[type] || [];
    if (this.fallback) {
      injections = injections.concat(this.fallback.getFactoryTypeInjections(type));
    }
    return injections;
  }
};

function resolve(registry, normalizedName) {
  var cached = registry._resolveCache[normalizedName];
  if (cached) { return cached; }
  if (registry._failCache[normalizedName]) { return; }

  var resolved = registry.resolver(normalizedName) || registry.registrations[normalizedName];

  if (resolved) {
    registry._resolveCache[normalizedName] = resolved;
  } else {
    registry._failCache[normalizedName] = true;
  }

  return resolved;
}

function has(registry, fullName) {
  return registry.resolve(fullName) !== undefined;
}

export default Registry;
