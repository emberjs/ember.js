import Debug, { inspect as emberInspect } from '@ember/debug/ember-inspector-support/utils/ember/debug';
import {
  ComputedProperty,
  EmberObject,
  meta as emberMeta,
} from '@ember/debug/ember-inspector-support/utils/ember';
import { emberSafeRequire } from '@ember/debug/ember-inspector-support/utils/ember/loader';

/**
 * Check if given key on the passed object is a computed property
 * @param object
 * @param key
 * @return {boolean|*}
 */
export function isComputed(object, key) {
  // Ember > 3.10
  if (Debug.isComputed && Debug.isComputed(object, key)) {
    return true;
  }

  if (emberMeta(object) && emberMeta(object).peekDescriptors(key)) {
    return !!emberMeta(object).peekDescriptors(key)._getter;
  }

  if (getDescriptorFor(object, key) instanceof ComputedProperty) {
    return true;
  }
}

/**
 * This allows us to pass in a COMPUTED_DECORATOR function and get the descriptor for it.
 * It should be implemented Ember side eventually.
 * @param {EmberObject} object The object we are inspecting
 * @param {String} key The key for the property on the object
 */
export function getDescriptorFor(object, key) {
  if (object[key]?.isDescriptor) {
    return object[key];
  }

  // exists longer than ember 3.10
  if (Debug.isComputed) {
    const { descriptorForDecorator, descriptorForProperty } =
      emberSafeRequire('@ember/-internals/metal') || {};
    return (
      descriptorForDecorator?.(object[key]) ||
      descriptorForProperty?.(object, key)
    );
  }

  return object[key];
}

export function typeOf(obj) {
  return Object.prototype.toString
    .call(obj)
    .match(/\s([a-zA-Z]+)/)[1]
    .toLowerCase();
}

export function inspect(value) {
  if (typeof value === 'function') {
    return `${value.name || 'function'}() { ... }`;
  } else if (value instanceof EmberObject) {
    return value.toString();
  } else if (value instanceof HTMLElement) {
    return `<${value.tagName.toLowerCase()}>`;
  } else if (typeOf(value) === 'array') {
    if (value.length === 0) {
      return '[]';
    } else if (value.length === 1) {
      return `[ ${inspect(value[0])} ]`;
    } else {
      return `[ ${inspect(value[0])}, ... ]`;
    }
  } else if (value instanceof Error) {
    return `Error: ${value.message}`;
  } else if (value === null) {
    return 'null';
  } else if (typeOf(value) === 'date') {
    return value.toString();
  } else if (typeof value === 'object') {
    // `Ember.inspect` is able to handle this use case,
    // but it is very slow as it loops over all props,
    // so summarize to just first 2 props
    // if it defines a toString, we use that instead
    if (
      typeof value.toString === 'function' &&
      value.toString !== Object.prototype.toString &&
      value.toString !== Function.prototype.toString
    ) {
      try {
        return `<Object:${value.toString()}>`;
      } catch (e) {
        //
      }
    }
    let ret = [];
    let v;
    let count = 0;
    let broken = false;

    for (let key in value) {
      if (!('hasOwnProperty' in value) || value.hasOwnProperty(key)) {
        if (count++ > 1) {
          broken = true;
          break;
        }
        v = value[key];
        if (v === 'toString') {
          continue;
        } // ignore useless items
        if (typeOf(v).includes('function')) {
          v = `function ${v.name}() { ... }`;
        }
        if (typeOf(v) === 'array') {
          v = `[Array : ${v.length}]`;
        }
        if (typeOf(v) === 'object') {
          v = '[Object]';
        }
        ret.push(`${key}: ${v}`);
      }
    }
    let suffix = ' }';
    if (broken) {
      suffix = ' ...}';
    }
    return `{ ${ret.join(', ')}${suffix}`;
  } else {
    return emberInspect(value);
  }
}
