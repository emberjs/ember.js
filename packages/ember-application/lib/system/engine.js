/**
@module ember
@submodule ember-application
*/
import Namespace from 'ember-runtime/system/namespace';
import Registry from 'container/registry';
import { privatize as P } from 'container/registry';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import DAG from 'dag-map';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { assert, deprecate } from 'ember-metal/debug';
import { canInvoke } from 'ember-metal/utils';
import EmptyObject from 'ember-metal/empty_object';
import DefaultResolver from 'ember-application/system/resolver';
import EngineInstance from './engine-instance';
import isEnabled from 'ember-metal/features';
import symbol from 'ember-metal/symbol';
import Controller from 'ember-runtime/controllers/controller';
import TextField from 'ember-htmlbars/components/text_field';
import TextArea from 'ember-htmlbars/components/text_area';
import Checkbox from 'ember-htmlbars/components/checkbox';
import LinkToComponent from 'ember-routing-views/components/link-to';
import RoutingService from 'ember-routing/services/routing';
import ContainerDebugAdapter from 'ember-extension-support/container_debug_adapter';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
import { OutletView as HTMLBarsOutletView } from 'ember-routing-views/views/outlet';
import EmberView from 'ember-views/views/view';
import require from 'require';

export const GLIMMER = symbol('GLIMMER');

function props(obj) {
  var properties = [];

  for (var key in obj) {
    properties.push(key);
  }

  return properties;
}

/**
  The `Engine` class contains core functionality for both applications and
  engines.

  Each engine manages a registry that's used for dependency injection and
  exposed through `RegistryProxy`.

  Engines also manage initializers and instance initializers.

  Engines can spawn `EngineInstance` instances via `buildInstance()`.

  @class Engine
  @namespace Ember
  @extends Ember.Namespace
  @uses RegistryProxy
  @category ember-application-engines
  @public
*/
const Engine = Namespace.extend(RegistryProxy, {
  init() {
    this._super(...arguments);

    if (this[GLIMMER] === undefined) {
      this[GLIMMER] = isEnabled('ember-glimmer');
    }

    this.buildRegistry();
  },

  /**
    A private flag indicating whether an engine's initializers have run yet.

    @private
    @property _initializersRan
  */
  _initializersRan: false,

  /**
    Ensure that initializers are run once, and only once, per Engine.

    @private
    @method ensureInitializers
  */
  ensureInitializers() {
    if (!this._initializersRan) {
      this.runInitializers();
      this._initializersRan = true;
    }
  },

  /**
    Create an EngineInstance for this application.

    @private
    @method buildInstance
    @return {Ember.EngineInstance} the application instance
  */
  buildInstance(options = {}) {
    this.ensureInitializers();
    options.base = this;
    return EngineInstance.create(options);
  },

  /**
    Build and configure the registry for the current application.

    @private
    @method buildRegistry
    @return {Ember.Registry} the configured registry
  */
  buildRegistry() {
    var registry = this.__registry__ = this.constructor.buildRegistry(this, {
      [GLIMMER]: this[GLIMMER]
    });

    return registry;
  },

  /**
    @private
    @method initializer
  */
  initializer(options) {
    this.constructor.initializer(options);
  },

  /**
    @private
    @method instanceInitializer
  */
  instanceInitializer(options) {
    this.constructor.instanceInitializer(options);
  },

  /**
    @private
    @method runInitializers
  */
  runInitializers() {
    this._runInitializer('initializers', (name, initializer) => {
      assert('No application initializer named \'' + name + '\'', !!initializer);
      if (initializer.initialize.length === 2) {
        deprecate('The `initialize` method for Application initializer \'' + name + '\' should take only one argument - `App`, an instance of an `Application`.',
                  false,
                  {
                    id: 'ember-application.app-initializer-initialize-arguments',
                    until: '3.0.0',
                    url: 'http://emberjs.com/deprecations/v2.x/#toc_initializer-arity'
                  });

        initializer.initialize(this.__registry__, this);
      } else {
        initializer.initialize(this);
      }
    });
  },

  /**
    @private
    @since 1.12.0
    @method runInstanceInitializers
  */
  runInstanceInitializers(instance) {
    this._runInitializer('instanceInitializers', (name, initializer) => {
      assert('No instance initializer named \'' + name + '\'', !!initializer);
      initializer.initialize(instance);
    });
  },

  _runInitializer(bucketName, cb) {
    var initializersByName = get(this.constructor, bucketName);
    var initializers = props(initializersByName);
    var graph = new DAG();
    var initializer;

    for (var i = 0; i < initializers.length; i++) {
      initializer = initializersByName[initializers[i]];
      graph.addEdges(initializer.name, initializer, initializer.before, initializer.after);
    }

    graph.topsort(function (vertex) {
      cb(vertex.name, vertex.value);
    });
  }
});

Engine.reopenClass({
  initializers: new EmptyObject(),
  instanceInitializers: new EmptyObject(),

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

    ```javascript
    Ember.Application.initializer({
      name: 'namedInitializer',

      initialize: function(application) {
        Ember.debug('Running namedInitializer!');
      }
    });
    ```

    * `before` and `after` are used to ensure that this initializer is ran prior
    or after the one identified by the value. This value can be a single string
    or an array of strings, referencing the `name` of other initializers.

    An example of ordering initializers, we create an initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'first',

      initialize: function(application) {
        Ember.debug('First initializer!');
      }
    });

    // DEBUG: First initializer!
    ```

    We add another initializer named `second`, specifying that it should run
    after the initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'second',
      after: 'first',

      initialize: function(application) {
        Ember.debug('Second initializer!');
      }
    });

    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    ```

    Afterwards we add a further initializer named `pre`, this time specifying
    that it should run before the initializer named `first`:

    ```javascript
    Ember.Application.initializer({
      name: 'pre',
      before: 'first',

      initialize: function(application) {
        Ember.debug('Pre initializer!');
      }
    });

    // DEBUG: Pre initializer!
    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    ```

    Finally we add an initializer named `post`, specifying it should run after
    both the `first` and the `second` initializers:

    ```javascript
    Ember.Application.initializer({
      name: 'post',
      after: ['first', 'second'],

      initialize: function(application) {
        Ember.debug('Post initializer!');
      }
    });

    // DEBUG: Pre initializer!
    // DEBUG: First initializer!
    // DEBUG: Second initializer!
    // DEBUG: Post initializer!
    ```

    * `initialize` is a callback function that receives one argument,
      `application`, on which you can operate.

    Example of using `application` to register an adapter:

    ```javascript
    Ember.Application.initializer({
      name: 'api-adapter',

      initialize: function(application) {
        application.register('api-adapter:main', ApiAdapter);
      }
    });
    ```

    @method initializer
    @param initializer {Object}
    @public
  */

  initializer: buildInitializerMethod('initializers', 'initializer'),

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

    ```javascript
    Ember.Application.instanceInitializer({
      name: 'namedinstanceInitializer',

      initialize: function(application) {
        Ember.debug('Running namedInitializer!');
      }
    });
    ```

    * `before` and `after` are used to ensure that this initializer is ran prior
    or after the one identified by the value. This value can be a single string
    or an array of strings, referencing the `name` of other initializers.

    * See Ember.Application.initializer for discussion on the usage of before
    and after.

    Example instanceInitializer to preload data into the store.

    ```javascript
    Ember.Application.initializer({
      name: 'preload-data',

      initialize: function(application) {
        var userConfig, userConfigEncoded, store;
        // We have a HTML escaped JSON representation of the user's basic
        // configuration generated server side and stored in the DOM of the main
        // index.html file. This allows the app to have access to a set of data
        // without making any additional remote calls. Good for basic data that is
        // needed for immediate rendering of the page. Keep in mind, this data,
        // like all local models and data can be manipulated by the user, so it
        // should not be relied upon for security or authorization.
        //
        // Grab the encoded data from the meta tag
        userConfigEncoded = Ember.$('head meta[name=app-user-config]').attr('content');
        // Unescape the text, then parse the resulting JSON into a real object
        userConfig = JSON.parse(unescape(userConfigEncoded));
        // Lookup the store
        store = application.lookup('service:store');
        // Push the encoded JSON into the store
        store.pushPayload(userConfig);
      }
    });
    ```

    @method instanceInitializer
    @param instanceInitializer
    @public
  */
  instanceInitializer: buildInitializerMethod('instanceInitializers', 'instance initializer'),

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

    @private
    @method buildRegistry
    @static
    @param {Ember.Application} namespace the application for which to
      build the registry
    @return {Ember.Registry} the built registry
    @public
  */
  buildRegistry(namespace, options = {}) {
    var registry = new Registry({
      resolver: resolverFor(namespace)
    });

    registry.set = set;

    registry.register('application:main', namespace, { instantiate: false });

    if (options[GLIMMER]) {
      glimmerSetupRegistry(registry);
    } else {
      htmlbarsSetupRegistry(registry);
    }

    return registry;
  },

  /**
    Set this to provide an alternate class to `Ember.DefaultResolver`


    @deprecated Use 'Resolver' instead
    @property resolver
    @public
  */
  resolver: null,

  /**
    Set this to provide an alternate class to `Ember.DefaultResolver`

    @property resolver
    @public
  */
  Resolver: null
});

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
  @param {Ember.Namespace} namespace the namespace to look for classes
  @return {*} the resolved value for a given lookup
*/
function resolverFor(namespace) {
  let ResolverClass = namespace.get('Resolver') || DefaultResolver;

  return ResolverClass.create({
    namespace: namespace
  });
}

function buildInitializerMethod(bucketName, humanName) {
  return function(initializer) {
    // If this is the first initializer being added to a subclass, we are going to reopen the class
    // to make sure we have a new `initializers` object, which extends from the parent class' using
    // prototypal inheritance. Without this, attempting to add initializers to the subclass would
    // pollute the parent class as well as other subclasses.
    if (this.superclass[bucketName] !== undefined && this.superclass[bucketName] === this[bucketName]) {
      var attrs = {};
      attrs[bucketName] = Object.create(this[bucketName]);
      this.reopenClass(attrs);
    }

    assert('The ' + humanName + ' \'' + initializer.name + '\' has already been registered', !this[bucketName][initializer.name]);
    assert('An ' + humanName + ' cannot be registered without an initialize function', canInvoke(initializer, 'initialize'));
    assert('An ' + humanName + ' cannot be registered without a name property', initializer.name !== undefined);

    this[bucketName][initializer.name] = initializer;
  };
}

function commonSetupRegistry(registry) {
  registry.optionsForType('component', { singleton: false });
  registry.optionsForType('view', { singleton: false });
  registry.injection('renderer', 'dom', 'service:-dom-helper');

  registry.register('controller:basic', Controller, { instantiate: false });

  registry.injection('service:-dom-helper', 'document', 'service:-document');

  registry.injection('view', '_viewRegistry', '-view-registry:main');

  registry.injection('route', '_topLevelViewTemplate', 'template:-outlet');

  registry.injection('view:-outlet', 'namespace', 'application:main');

  registry.injection('controller', 'target', 'router:main');
  registry.injection('controller', 'namespace', 'application:main');

  registry.injection('router', '_bucketCache', P`-bucket-cache:main`);
  registry.injection('route', '_bucketCache', P`-bucket-cache:main`);
  registry.injection('controller', '_bucketCache', P`-bucket-cache:main`);

  registry.injection('route', 'router', 'router:main');

  registry.register('component:-text-field', TextField);
  registry.register('component:-text-area', TextArea);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component:link-to', LinkToComponent);

  // Register the routing service...
  registry.register('service:-routing', RoutingService);
  // Then inject the app router into it
  registry.injection('service:-routing', 'router', 'router:main');

  // DEBUGGING
  registry.register('resolver-for-debugging:main', registry.resolver, { instantiate: false });
  registry.injection('container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
  registry.injection('data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
  // Custom resolver authors may want to register their own ContainerDebugAdapter with this key

  registry.register('container-debug-adapter:main', ContainerDebugAdapter);
}

function glimmerSetupRegistry(registry) {
  commonSetupRegistry(registry);

  let OutletView = require('ember-glimmer/ember-routing-view').OutletView;
  registry.register('view:-outlet', OutletView);

  let glimmerOutletTemplate = require('ember-glimmer/templates/outlet').default;
  let glimmerComponentTemplate = require('ember-glimmer/templates/component').default;
  registry.register(P`template:components/-default`, glimmerComponentTemplate);
  registry.register('template:-outlet', glimmerOutletTemplate);
  registry.injection('view:-outlet', 'template', 'template:-outlet');
  registry.injection('template', 'env', 'service:-glimmer-environment');

  registry.optionsForType('helper', { instantiate: false });
}

function htmlbarsSetupRegistry(registry) {
  commonSetupRegistry(registry);

  registry.optionsForType('template', { instantiate: false });
  registry.register('view:-outlet', HTMLBarsOutletView);

  registry.register('template:-outlet', topLevelViewTemplate);
  registry.register('view:toplevel', EmberView.extend());
}

export default Engine;
