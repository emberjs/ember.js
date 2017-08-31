import { getOwner } from 'ember-utils';
import { assert } from 'ember-debug';
import { ComputedProperty } from './computed';
import { AliasedProperty } from './alias';
import { Descriptor } from './properties';
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
export default function InjectedProperty(type, name) {
  this.type = type;
  this.name = name;

  this._super$Constructor(injectedPropertyGet);
  AliasedPropertyPrototype.oneWay.call(this);
}

function injectedPropertyGet(keyName) {
  let desc = this[keyName];
  let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

  assert(`InjectedProperties should be defined with the inject computed property macros.`, desc && desc.isDescriptor && desc.type);
  assert(`Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`, owner);

  return owner.lookup(`${desc.type}:${desc.name || keyName}`);
}

InjectedProperty.prototype = Object.create(Descriptor.prototype);

const InjectedPropertyPrototype = InjectedProperty.prototype;
const ComputedPropertyPrototype = ComputedProperty.prototype;
const AliasedPropertyPrototype = AliasedProperty.prototype;

InjectedPropertyPrototype._super$Constructor = ComputedProperty;

InjectedPropertyPrototype.get = ComputedPropertyPrototype.get;
InjectedPropertyPrototype.readOnly = ComputedPropertyPrototype.readOnly;
InjectedPropertyPrototype.teardown = ComputedPropertyPrototype.teardown;
