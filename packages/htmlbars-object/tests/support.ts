import { ClassMeta, Mixin, toMixin } from 'htmlbars-object';
export { Mixin };

export function get(obj, key) {
  return obj[key];
}

export function set(obj, key, value) {
  return obj[key] = value;
}

export function mixin(obj, ...extensions) {
  if (obj._meta) throw new Error("Can't reopen a POJO after mixins were already applied to it");
  extensions.forEach(e => toMixin(e).apply(obj));
  obj._Meta.seal();
  return obj;
}