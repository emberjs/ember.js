import {
  tracked
} from '../..';

export function createTracked(values, proto = {}) {
  function Class() {
    for (let prop in values) {
      this[prop] = values[prop];
    }
  }

  for (let prop in values) {
    Object.defineProperty(proto, prop, tracked(proto, prop, { enumerable: true, configurable: true, writable: true, value: values[prop] }));
  }

  Class.prototype = proto;

  return new Class();
}

export function createWithDescriptors(values) {
  function Class() {}

  for (let prop in values) {
    let descriptor = Object.getOwnPropertyDescriptor(values, prop);
    Object.defineProperty(Class.prototype, prop, tracked(Class.prototype, prop, descriptor));
  }

  return new Class();
}
