import { Mixin, Blueprint, toMixin } from 'glimmer-object';
import { setProperty } from 'glimmer-object-reference';
export { Mixin };

export function get(obj, key) {
  if (key.indexOf('.') !== -1) {
    let path = key.split('.');
    return path.reduce((obj, key) => obj[key], obj);
  }
  return obj[key];
}

export function set(obj, key, value) {
  if (key.indexOf('.') !== -1) {
    let path = key.split('.');
    let parent = path.slice(0, -1).reduce((obj, key) => obj[key], obj);
    setProperty(parent, path[path.length - 1], value);
  } else {
    setProperty(obj, key, value);
  }
}

export function mixin(obj, ...extensions) {
  // if (obj._meta) throw new Error("Can't reopen a POJO after mixins were already applied to it");
  extensions.forEach(e => toMixin(e).apply(obj));
  return obj;
}

export function defineProperty(obj: any, key: string, desc: Blueprint) {
  let extensions = {};
  extensions[key] = desc;

  mixin(obj, extensions);
}
