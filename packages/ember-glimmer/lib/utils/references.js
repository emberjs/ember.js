import { get } from 'ember-metal/property_get';
import { ConditionalReference as GlimmerConditionalReference } from 'glimmer-runtime';
import emberToBool from './to-bool';

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

  destroy() {}
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

  destroy() {}
}

// @implements PathReference
export class UpdatableReference extends RootReference {
  update(value) {
    this._value = value;
  }
}

export class HashHelperReference {
  constructor(args) {
    this.namedArgs = args.named;
  }

  isDirty() { return true; }

  value() {
    return this.namedArgs.value();
  }

  get(propertyKey) {
    return this.namedArgs.get(propertyKey);
  }

  destroy() {}
}

export class ConditionalReference extends GlimmerConditionalReference {
  toBool(predicate) {
    return emberToBool(predicate);
  }
}

// @implements PathReference
export class SimpleHelperReference {
  constructor(helper, args) {
    this.helper = helper;
    this.args = args;
  }

  isDirty() { return true; }

  value() {
    let { helper, args: { positional, named } } = this;

    return helper(positional.value(), named.value());
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {}
}

// @implements PathReference
export class ClassBasedHelperReference {
  constructor(instance, args) {
    this.instance = instance;
    this.args = args;
  }

  isDirty() { return true; }

  value() {
    let { instance, args: { positional, named } } = this;

    return instance.compute(positional.value(), named.value());
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {}
}

// @implements PathReference
export class InternalHelperReference {
  constructor(helper, args) {
    this.helper = helper;
    this.args = args;
  }

  isDirty() { return true; }

  value() {
    let { helper, args } = this;

    return helper(args);
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {}
}
