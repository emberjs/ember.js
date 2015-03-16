import Ember from "ember-metal/core"; // Ember.assert
import { indexOf } from "ember-metal/enumerable_utils";
import InjectedProperty from "ember-metal/injected_property";
import keys from "ember-metal/keys";

/**
  Namespace for injection helper methods.

  @class inject
  @namespace Ember
  @static
  */
function inject() {
  Ember.assert("Injected properties must be created through helpers, see `" +
               keys(inject).join("`, `") + "`");
}

// Dictionary of injection validations by type, added to by `createInjectionHelper`
var typeValidators = {};

/**
  This method allows other Ember modules to register injection helpers for a
  given container type. Helpers are exported to the `inject` namespace as the
  container type itself.

  @private
  @method createInjectionHelper
  @since 1.10.0
  @for Ember
  @param {String} type The container type the helper will inject
  @param {Function} validator A validation callback that is executed at mixin-time
*/
export function createInjectionHelper(type, validator) {
  typeValidators[type] = validator;

  inject[type] = function(name) {
    return new InjectedProperty(type, name);
  };
}

/**
  Validation function that runs per-type validation functions once for each
  injected type encountered.

  @private
  @method validatePropertyInjections
  @since 1.10.0
  @for Ember
  @param {Object} factory The factory object
*/
export function validatePropertyInjections(factory) {
  var proto = factory.proto();
  var types = [];
  var key, desc, validator, i, l;

  for (key in proto) {
    desc = proto[key];
    if (desc instanceof InjectedProperty && indexOf(types, desc.type) === -1) {
      types.push(desc.type);
    }
  }

  if (types.length) {
    for (i = 0, l = types.length; i < l; i++) {
      validator = typeValidators[types[i]];

      if (typeof validator === 'function') {
        validator(factory);
      }
    }
  }

  return true;
}

export default inject;
