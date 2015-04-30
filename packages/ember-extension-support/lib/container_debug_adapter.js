import Ember from "ember-metal/core";
import { A as emberA } from "ember-runtime/system/native_array";
import { typeOf } from "ember-runtime/utils";
import {
  dasherize,
  classify
} from "ember-runtime/system/string";
import Namespace from "ember-runtime/system/namespace";
import EmberObject from "ember-runtime/system/object";

/**
@module ember
@submodule ember-extension-support
*/

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
  @since 1.5.0
*/
export default EmberObject.extend({
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
    @param {String} type The type. e.g. "model", "controller", "route"
    @return {boolean} whether a list is available for this type.
  */
  canCatalogEntriesByType(type) {
    if (type === 'model' || type === 'template') {
      return false;
    }

    return true;
  },

  /**
    Returns the available classes a given type.

    @method catalogEntriesByType
    @param {String} type The type. e.g. "model", "controller", "route"
    @return {Array} An array of strings.
  */
  catalogEntriesByType(type) {
    var namespaces = emberA(Namespace.NAMESPACES);
    var types = emberA();
    var typeSuffixRegex = new RegExp(`${classify(type)}$`);

    namespaces.forEach(function(namespace) {
      if (namespace !== Ember) {
        for (var key in namespace) {
          if (!namespace.hasOwnProperty(key)) { continue; }
          if (typeSuffixRegex.test(key)) {
            var klass = namespace[key];
            if (typeOf(klass) === 'class') {
              types.push(dasherize(key.replace(typeSuffixRegex, '')));
            }
          }
        }
      }
    });
    return types;
  }
});
