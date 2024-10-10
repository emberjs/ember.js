import EmberObject from '@ember/object';
import { inspect as emberInspect } from '@ember/debug';

export function typeOf(obj: any) {
  return Object.prototype.toString
    .call(obj)
    .match(/\s([a-zA-Z]+)/)![1]!
    .toLowerCase();
}

export function inspect(value: any): string {
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
      } catch {
        //
      }
    }
    let ret = [];
    let v;
    let count = 0;
    let broken = false;

    for (let key in value) {
      if (!('hasOwnProperty' in value) || Object.prototype.hasOwnProperty.call(value, key)) {
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
