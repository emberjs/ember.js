import { assert } from 'ember-metal/debug';
import InjectedProperty from 'ember-metal/injected_property';
import { meta } from 'ember-metal/meta';

/**
  Namespace for injection helper methods.

  @class inject
  @namespace Ember
  @static
  @public
*/
export default function inject() {
  assert(`Injected properties must be created through helpers, see '${Object.keys(inject).join('"', '"')}'`);
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
  // TODO: this function is stupid;
  var proto = factory.proto();
  var types = [];
  let m = meta(proto);

  m.forEachDescs((name, desc) => {
    if (desc === undefined) { return; }
    types.push(desc.type); // some unique crap
  });

  if (types.length) {
    for (let i = 0, l = types.length; i < l; i++) {
      let validator = typeValidators[types[i]];

      if (typeof validator === 'function') {
        validator(factory);
      }
    }
  }

  return true;
}
