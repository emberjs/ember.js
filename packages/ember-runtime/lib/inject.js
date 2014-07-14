import Ember from "ember-metal/core"; // Ember.assert
import { indexOf } from "ember-metal/enumerable_utils";
import InjectedProperty from "ember-metal/injected_property";
import keys from "ember-metal/keys";

/**
  Namespace for injection helper methods.

  @class inject
  @namespace Ember
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
  @namespace Ember
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
  Validation function intended to be invoked at when extending a factory with
  injected properties. Runs per-type validation functions once for each injected
  type encountered.

  Note that this currently modifies the mixin themselves, which is technically
  dubious but is practically of little consequence. This may change in the
  future.

  @private
  @method validatePropertyInjections
  @namespace Ember
  @param {Object} factory The factory object being extended
  @param {Object} props A hash of properties to be added to the factory
*/
export function validatePropertyInjections(factory, props) {
  var types = [];
  var key, desc, validator, i, l;

  for (key in props) {
    desc = props[key];
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
