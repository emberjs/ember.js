import { tracked } from '../..';

export function createWithDescriptors(values) {
  function Class() {}

  for (let prop in values) {
    let descriptor = Object.getOwnPropertyDescriptor(values, prop);
    Object.defineProperty(Class.prototype, prop, tracked(Class.prototype, prop, descriptor));
  }

  return new Class();
}
