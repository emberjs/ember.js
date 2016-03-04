import { get } from 'ember-metal/property_get';
import { ConditionalReference as GlimmerConditionalReference } from 'glimmer-runtime';
import { toBool as emberToBool } from '../helpers/if-unless';

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

// @implements PathReference
export class UpdatableReference extends RootReference {
  update(value) {
    this._value = value;
  }
}

export class ConditionalReference extends GlimmerConditionalReference {
  toBool(predicate) {
    return emberToBool(predicate);
  }
}
