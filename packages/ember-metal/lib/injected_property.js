import { getOwner } from 'ember-utils';
import { assert } from 'ember-debug';
import { ComputedProperty } from './computed';
import { descriptorFor } from './meta';

/**
 @module ember
 @private
 */

/**
  Read-only property that returns the result of a container lookup.

  @class InjectedProperty
  @namespace Ember
  @constructor
  @param {String} type The container type the property will lookup
  @param {String} name (optional) The name the property will lookup, defaults
         to the property's name
  @private
*/
export default class InjectedProperty extends ComputedProperty {
  constructor(type, name) {
    super(injectedPropertyGet);

    this.type = type;
    this.name = name;
  }
}

function injectedPropertyGet(keyName) {
  let desc = descriptorFor(this, keyName);
  let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

  assert(`InjectedProperties should be defined with the inject computed property macros.`, desc && desc.type);
  assert(`Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`, owner);

  return owner.lookup(`${desc.type}:${desc.name || keyName}`);
}
