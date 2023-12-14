export { getEngineParent, setEngineParent } from './lib/engine-parent';
import { canInvoke } from '@ember/-internals/utils';
import Controller from '@ember/controller';
import Namespace from '@ember/application/namespace';
import { Registry } from '@ember/-internals/container';
import DAG from 'dag-map';
import { assert } from '@ember/debug';
import ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
import { get, set } from '@ember/object';
import EngineInstance from '@ember/engine/instance';
import { RoutingService } from '@ember/routing/-internals';
import { ComponentLookup } from '@ember/-internals/views';
import { setupEngineRegistry } from '@ember/-internals/glimmer';
import { RegistryProxyMixin } from '@ember/-internals/runtime';
function props(obj) {
  let properties = [];
  for (let key in obj) {
    properties.push(key);
  }
  return properties;
}
class Engine extends Namespace.extend(RegistryProxyMixin) {
  constructor() {
    super(...arguments);
    /**
      A private flag indicating whether an engine's initializers have run yet.
             @private
      @property _initializersRan
    */
    this._initializersRan = false;
  }
  /**
    This creates a registry with the default Ember naming conventions.
       It also configures the registry:
       * registered views are created every time they are looked up (they are
      not singletons)
    * registered templates are not factories; the registered value is
      returned directly.
    * the router receives the application as its `namespace` property
    * all controllers receive the router as their `target` and `controllers`
      properties
    * all controllers receive the application as their `namespace` property
    * the application view receives the application controller as its
      `controller` property
    * the application view receives the application template as its
      `defaultTemplate` property
       @method buildRegistry
    @static
    @param {Application} namespace the application for which to
      build the registry
    @return {Ember.Registry} the built registry
    @private
  */
  static buildRegistry(namespace) {
    let registry = new Registry({
      resolver: resolverFor(namespace)
    });
    registry.set = set;
    registry.register('application:main', namespace, {
      instantiate: false
    });
    commonSetupRegistry(registry);
    setupEngineRegistry(registry);
    return registry;
  }
  init(properties) {
    super.init(properties);
    this.buildRegistry();
  }
  /**
    Ensure that initializers are run once, and only once, per engine.
       @private
    @method ensureInitializers
  */
  ensureInitializers() {
    if (!this._initializersRan) {
      this.runInitializers();
      this._initializersRan = true;
    }
  }
  /**
    Create an EngineInstance for this engine.
       @public
    @method buildInstance
    @return {EngineInstance} the engine instance
  */
  buildInstance(options = {}) {
    this.ensureInitializers();
    return EngineInstance.create({
      ...options,
      base: this
    });
  }
  /**
    Build and configure the registry for the current engine.
       @private
    @method buildRegistry
    @return {Ember.Registry} the configured registry
  */
  buildRegistry() {
    let registry = this.__registry__ = this.constructor.buildRegistry(this);
    return registry;
  }
  /**
    @private
    @method initializer
  */
  initializer(initializer) {
    this.constructor.initializer(initializer);
  }
  /**
    @private
    @method instanceInitializer
  */
  instanceInitializer(initializer) {
    this.constructor.instanceInitializer(initializer);
  }
  /**
    @private
    @method runInitializers
  */
  runInitializers() {
    this._runInitializer('initializers', (name, initializer) => {
      assert(`No application initializer named '${name}'`, initializer);
      initializer.initialize(this);
    });
  }
  /**
    @private
    @since 1.12.0
    @method runInstanceInitializers
  */
  runInstanceInitializers(instance) {
    this._runInitializer('instanceInitializers', (name, initializer) => {
      assert(`No instance initializer named '${name}'`, initializer);
      initializer.initialize(instance);
    });
  }
  _runInitializer(bucketName, cb) {
    let initializersByName = get(this.constructor, bucketName);
    let initializers = props(initializersByName);
    let graph = new DAG();
    let initializer;
    for (let name of initializers) {
      initializer = initializersByName[name];
      assert(`missing ${bucketName}: ${name}`, initializer);
      graph.add(initializer.name, initializer, initializer.before, initializer.after);
    }
    graph.topsort(cb);
  }
}
Engine.initializers = Object.create(null);
Engine.instanceInitializers = Object.create(null);
/**
  The goal of initializers should be to register dependencies and injections.
  This phase runs once. Because these initializers may load code, they are
  allowed to defer application readiness and advance it. If you need to access
  the container or store you should use an InstanceInitializer that will be run
  after all initializers and therefore after all code is loaded and the app is
  ready.

  Initializer receives an object which has the following attributes:
  `name`, `before`, `after`, `initialize`. The only required attribute is
  `initialize`, all others are optional.

  * `name` allows you to specify under which name the initializer is registered.
  This must be a unique name, as trying to register two initializers with the
  same name will result in an error.

  ```app/initializer/named-initializer.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('Running namedInitializer!');
  }

  export default {
    name: 'named-initializer',
    initialize
  };
  ```

  * `before` and `after` are used to ensure that this initializer is ran prior
  or after the one identified by the value. This value can be a single string
  or an array of strings, referencing the `name` of other initializers.

  An example of ordering initializers, we create an initializer named `first`:

  ```app/initializer/first.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('First initializer!');
  }

  export default {
    name: 'first',
    initialize
  };
  ```

  ```bash
  // DEBUG: First initializer!
  ```

  We add another initializer named `second`, specifying that it should run
  after the initializer named `first`:

  ```app/initializer/second.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('Second initializer!');
  }

  export default {
    name: 'second',
    after: 'first',
    initialize
  };
  ```

  ```
  // DEBUG: First initializer!
  // DEBUG: Second initializer!
  ```

  Afterwards we add a further initializer named `pre`, this time specifying
  that it should run before the initializer named `first`:

  ```app/initializer/pre.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('Pre initializer!');
  }

  export default {
    name: 'pre',
    before: 'first',
    initialize
  };
  ```

  ```bash
  // DEBUG: Pre initializer!
  // DEBUG: First initializer!
  // DEBUG: Second initializer!
  ```

  Finally we add an initializer named `post`, specifying it should run after
  both the `first` and the `second` initializers:

  ```app/initializer/post.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('Post initializer!');
  }

  export default {
    name: 'post',
    after: ['first', 'second'],
    initialize
  };
  ```

  ```bash
  // DEBUG: Pre initializer!
  // DEBUG: First initializer!
  // DEBUG: Second initializer!
  // DEBUG: Post initializer!
  ```

  * `initialize` is a callback function that receives one argument,
    `application`, on which you can operate.

  Example of using `application` to register an adapter:

  ```app/initializer/api-adapter.js
  import ApiAdapter from '../utils/api-adapter';

  export function initialize(application) {
    application.register('api-adapter:main', ApiAdapter);
  }

  export default {
    name: 'post',
    after: ['first', 'second'],
    initialize
  };
  ```

  @method initializer
  @param initializer {Object}
  @public
*/
Engine.initializer = buildInitializerMethod('initializers', 'initializer');
/**
  Instance initializers run after all initializers have run. Because
  instance initializers run after the app is fully set up. We have access
  to the store, container, and other items. However, these initializers run
  after code has loaded and are not allowed to defer readiness.

  Instance initializer receives an object which has the following attributes:
  `name`, `before`, `after`, `initialize`. The only required attribute is
  `initialize`, all others are optional.

  * `name` allows you to specify under which name the instanceInitializer is
  registered. This must be a unique name, as trying to register two
  instanceInitializer with the same name will result in an error.

  ```app/initializer/named-instance-initializer.js
  import { debug } from '@ember/debug';

  export function initialize() {
    debug('Running named-instance-initializer!');
  }

  export default {
    name: 'named-instance-initializer',
    initialize
  };
  ```

  * `before` and `after` are used to ensure that this initializer is ran prior
  or after the one identified by the value. This value can be a single string
  or an array of strings, referencing the `name` of other initializers.

  * See Application.initializer for discussion on the usage of before
  and after.

  Example instanceInitializer to preload data into the store.

  ```app/initializer/preload-data.js

  export function initialize(application) {
      var userConfig, userConfigEncoded, store;
      // We have a HTML escaped JSON representation of the user's basic
      // configuration generated server side and stored in the DOM of the main
      // index.html file. This allows the app to have access to a set of data
      // without making any additional remote calls. Good for basic data that is
      // needed for immediate rendering of the page. Keep in mind, this data,
      // like all local models and data can be manipulated by the user, so it
      // should not be relied upon for security or authorization.

      // Grab the encoded data from the meta tag
      userConfigEncoded = document.querySelector('head meta[name=app-user-config]').attr('content');

      // Unescape the text, then parse the resulting JSON into a real object
      userConfig = JSON.parse(unescape(userConfigEncoded));

      // Lookup the store
      store = application.lookup('service:store');

      // Push the encoded JSON into the store
      store.pushPayload(userConfig);
  }

  export default {
    name: 'named-instance-initializer',
    initialize
  };
  ```

  @method instanceInitializer
  @param instanceInitializer
  @public
*/
Engine.instanceInitializer = buildInitializerMethod('instanceInitializers', 'instance initializer');
/**
  This function defines the default lookup rules for container lookups:

  * templates are looked up on `Ember.TEMPLATES`
  * other names are looked up on the application after classifying the name.
    For example, `controller:post` looks up `App.PostController` by default.
  * if the default lookup fails, look for registered classes on the container

  This allows the application to register default injections in the container
  that could be overridden by the normal naming convention.

  @private
  @method resolverFor
  @param {Ember.Enginer} namespace the namespace to look for classes
  @return {*} the resolved value for a given lookup
*/
function resolverFor(namespace) {
  let ResolverClass = namespace.Resolver;
  let props = {
    namespace
  };
  return ResolverClass.create(props);
}
/** @internal */
export function buildInitializerMethod(bucketName, humanName) {
  return function (initializer) {
    // If this is the first initializer being added to a subclass, we are going to reopen the class
    // to make sure we have a new `initializers` object, which extends from the parent class' using
    // prototypal inheritance. Without this, attempting to add initializers to the subclass would
    // pollute the parent class as well as other subclasses.
    // SAFETY: The superclass may be an Engine, we don't call unless we confirmed it was ok.
    let superclass = this.superclass;
    if (superclass[bucketName] !== undefined && superclass[bucketName] === this[bucketName]) {
      let attrs = {
        [bucketName]: Object.create(this[bucketName])
      };
      this.reopenClass(attrs);
    }
    assert(`The ${humanName} '${initializer.name}' has already been registered`, !this[bucketName][initializer.name]);
    assert(`An ${humanName} cannot be registered without an initialize function`, canInvoke(initializer, 'initialize'));
    assert(`An ${humanName} cannot be registered without a name property`, initializer.name !== undefined);
    let initializers = this[bucketName];
    initializers[initializer.name] = initializer;
  };
}
function commonSetupRegistry(registry) {
  registry.optionsForType('component', {
    singleton: false
  });
  registry.optionsForType('view', {
    singleton: false
  });
  registry.register('controller:basic', Controller, {
    instantiate: false
  });
  // Register the routing service...
  registry.register('service:-routing', RoutingService);
  // DEBUGGING
  registry.register('resolver-for-debugging:main', registry.resolver, {
    instantiate: false
  });
  registry.register('container-debug-adapter:main', ContainerDebugAdapter);
  registry.register('component-lookup:main', ComponentLookup);
}
export default Engine;