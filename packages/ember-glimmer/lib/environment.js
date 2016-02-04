import { Environment } from 'glimmer-runtime';
import { get } from 'ember-metal/property_get';

// @implements PathReference
export class RootReference {
  constructor(value) {
    this._value = value;
  }

  value() {
    return this._value;
  }

  isDirty() {
    return true;
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {
  }
}

// @implements PathReference
class PropertyReference {
  constructor(parentReference, propertyKey) {
    this._parentReference = parentReference;
    this._propertyKey = propertyKey;
  }

  value() {
    return get(this._parentReference.value(), this._propertyKey);
  }

  isDirty() {
    return true;
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {
  }
}

import { default as concat } from './helpers/concat';

const helpers = {
  concat
};


export default class extends Environment {
  hasComponentDefinition() {
    return false;
  }

  hasHelper(name) {
    return typeof helpers[name[0]] === 'function';
  }

  lookupHelper(name) {
    return helpers[name[0]];
  }

  rootReferenceFor(value) {
    return new RootReference(value);
  }
}
