/**
@module ember
@submodule ember-extension-support
*/

require('ember-application');

/**
  The `ContainerDebugAdapter` helps the container and resolver interface
  with tools that debug Ember such as the
  [Ember Extension](https://github.com/tildeio/ember-extension)
  for Chrome and Firefox.

  This class can be extended by a custom resolver implementer
  to override some of the methods with library-specific code.

  The methods likely to be overridden are:

  * `canCatalogEntriesByType`
  * `catalogEntriesByType`

  The adapter will need to be registered
  in the application's container as `container-debug-adapter:main`

  Example:

  ```javascript
  Application.initializer({
    name: "containerDebugAdapter",

    initialize: function(container, application) {
      application.register('container-debug-adapter:main', require('app/container-debug-adapter'));
    }
  });
  ```

  @class ContainerDebugAdapter
  @namespace Ember
  @extends Ember.Object
*/
Ember.ContainerDebugAdapter = Ember.Object.extend({
  init: function() {
    this._super();
  },

  /**
    The container of the application being debugged.
    This property will be injected
    on creation.

    @property container
    @default null
  */
  container: null,

  /**
    The resolver instance of the application
    being debugged. This property will be injected
    on creation.

    @property resolver
    @default null
  */
  resolver: null,

  /**
    Returns true if it is possible to catalog a list of available
    classes in the resolver for a given type.

    @method canCatalogEntriesByType
    @param {string} type The type. e.g. "model", "controller", "route"
    @return {boolean} whether a list is available for this type.
  */
  canCatalogEntriesByType: function(type) {
    if (type === 'model' || type === 'template') return false;
    return true;
  },

  /**
    Returns the available classes a given type.

    @method catalogEntriesByType
    @param {string} type The type. e.g. "model", "controller", "route"
    @return {Array} An array of classes.
  */
  catalogEntriesByType: function(type) {
    var namespaces = Ember.A(Ember.Namespace.NAMESPACES), types = Ember.A(), self = this;
    var typeSuffixRegex = new RegExp(Ember.String.classify(type) + "$");
    namespaces.forEach(function(namespace) {
      if (namespace !== Ember) {
        for (var key in namespace) {
          if (!namespace.hasOwnProperty(key)) { continue; }
          if (typeSuffixRegex.test(key)) {
            var klass = namespace[key];
            if (Ember.typeOf(klass) === 'class') {
              types.push(klass);
            }
          }
        }
      }
    });
    return types;
  }
});

