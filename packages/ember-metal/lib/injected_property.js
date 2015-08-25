import { assert } from 'ember-metal/debug';
import { ComputedProperty } from 'ember-metal/computed';
import { AliasedProperty } from 'ember-metal/alias';
import { Descriptor } from 'ember-metal/properties';

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
function InjectedProperty(type, name) {
  this.type = type;
  this.name = name;

  this._super$Constructor(injectedPropertyGet);
  AliasedPropertyPrototype.oneWay.call(this);
}

function injectedPropertyGet(keyName) {
  var desc = this[keyName];

  assert(`InjectedProperties should be defined with the Ember.inject computed property macros.`, desc && desc.isDescriptor && desc.type);
  assert(`Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`, this.container);

  return this.container.lookup(desc.type + ':' + (desc.name || keyName));
}

InjectedProperty.prototype = Object.create(Descriptor.prototype);

var InjectedPropertyPrototype = InjectedProperty.prototype;
var ComputedPropertyPrototype = ComputedProperty.prototype;
var AliasedPropertyPrototype = AliasedProperty.prototype;

InjectedPropertyPrototype._super$Constructor = ComputedProperty;

InjectedPropertyPrototype.get = ComputedPropertyPrototype.get;
InjectedPropertyPrototype.readOnly = ComputedPropertyPrototype.readOnly;

InjectedPropertyPrototype.teardown = ComputedPropertyPrototype.teardown;

export default InjectedProperty;
