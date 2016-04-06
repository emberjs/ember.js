import { get } from 'ember-metal/property_get';
import { ConstReference } from 'glimmer-reference';
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

export class GetHelperReference {
  constructor(sourceReference, pathReference) {
    this.sourceReference = sourceReference;
    this.pathReference = pathReference;
  }

  isDirty() { return true; }

  value() {
    return this.sourceReference.get(this.pathReference.value()).value();
  }

  get(propertyKey) {
    return new PropertyReference(this, propertyKey);
  }

  destroy() {}
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

export class ConstConditionalReference extends ConstReference {
  constructor(reference) {
    super(emberToBool(reference.value()));
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

import { assert } from 'ember-metal/debug';
import { dasherize } from 'ember-runtime/system/string';

export class AttributeBindingReference {
  static apply(component, microsyntax, operations) {
    let reference = this.parse(component, microsyntax);
    operations.addAttribute(reference.attributeName, reference);
  }

  static parse(component, microsyntax) {
    let colonIndex = microsyntax.indexOf(':');

    if (colonIndex === -1) {
      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', microsyntax !== 'class');
      return new this(component, microsyntax);
    } else {
      let prop = microsyntax.substring(0, colonIndex);
      let attr = microsyntax.substring(colonIndex + 1);

      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', attr !== 'class');

      return new this(component, prop, attr);
    }
  }

  constructor(component, propertyName, attributeName=propertyName) {
    this.component = component;
    this.propertyName = propertyName;
    this.attributeName = attributeName;
  }

  value() {
    let value = get(this.component, this.propertyName);

    if (value === null || value === undefined) {
      return null;
    } else {
      return value;
    }
  }

  isDirty() { return true; }
  destroy() {}
}

export function applyClassNameBinding(component, microsyntax, operations) {
  let [ prop, truthy, falsy ] = microsyntax.split(':');
  let ref;

  if (truthy !== undefined) {
    ref = new ColonClassNameBindingReference(component, prop, truthy, falsy);
  } else {
    ref = new SimpleClassNameBindingReference(component, prop);
  }

  operations.addAttribute('class', ref);
}

// @implements Reference
class SimpleClassNameBindingReference {
  constructor(component, propertyPath) {
    this.component = component;
    this.propertyPath = propertyPath;
  }

  value() {
    let value = get(this.component, this.propertyPath);

    if (value === true) {
      return propertyPathToClassName(this.propertyPath);
    } else if (value || value === 0) {
      return value;
    } else {
      return null;
    }
  }

  isDirty() { return true; }
  destroy() {}
}

// @implements Reference
class ColonClassNameBindingReference {
  constructor(component, propertyPath, truthy, falsy) {
    this.component = component;
    this.propertyPath = propertyPath;
    this.truthy = truthy || null;
    this.falsy = falsy || null;
  }

  value() {
    let value = get(this.component, this.propertyPath);
    return !!value ? this.truthy : this.falsy;
  }

  isDirty() { return true; }
  destroy() {}
}

function propertyPathToClassName(propertyPath) {
  let parts = propertyPath.split('.');
  let last = parts[parts.length - 1];

  return dasherize(last);
}

const EMPTY_OBJECT = {};

// @implements PathReference
export class UnboundReference {
  constructor(sourceRef, key = null) {
    this.sourceRef = sourceRef;
    this.key = key;
    this.cache = EMPTY_OBJECT;
  }

  value() {
    let { cache } = this;

    if (cache === EMPTY_OBJECT) {
      let { key, sourceRef } = this;
      let sourceVal = sourceRef.value();
      cache = this.cache = key ? get(sourceVal, key) : sourceVal;
    }

    return cache;
  }

  get(key) {
    return new UnboundReference(this, key);
  }

  destroy() {}
}
