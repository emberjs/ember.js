/*
  Internal implementations of the classic class APIs (`extend`, `reopen`, and
  `reopenClass`), without the deprecation that the public methods on
  `CoreObject` fire.

  Framework classes still need to build classic classes internally -- mostly to
  apply framework mixins such as `Observable` or `ActionHandler` -- and there is
  nothing an app author can do about that. Internal code calls these directly so
  that the classic classes deprecation is only triggered by app and addon code.

  See RFC #1117: https://rfcs.emberjs.com/id/1117-deprecate-classic-classes
*/

import type CoreObject from '@ember/object/core';
import Mixin, { applyMixin } from '@ember/object/mixin';

type EmberClassConstructor<T> = new (...args: any[]) => T;

type MergeArray<Arr extends any[]> = Arr extends [infer T, ...infer Rest]
  ? T & MergeArray<Rest>
  : unknown;

const reopen = Mixin.prototype.reopen;

/*
  The non-deprecated implementation behind `CoreObject.extend`.
*/
export function classicExtend<Statics, Instance, M extends Array<unknown>>(
  Parent: Statics & EmberClassConstructor<Instance>,
  ...mixins: M
): Readonly<Statics> & EmberClassConstructor<Instance> & MergeArray<M>;
export function classicExtend(Parent: any, ...mixins: any[]) {
  let Class = class extends Parent {};
  reopen.apply((Class as unknown as typeof CoreObject).PrototypeMixin, mixins);
  return Class;
}

/*
  The non-deprecated implementation behind `CoreObject.reopen`.
*/
export function classicReopen<C extends typeof CoreObject>(Class: C, ...args: any[]): C {
  Class.willReopen();
  reopen.apply(Class.PrototypeMixin, args);
  return Class;
}

/*
  The non-deprecated implementation behind `CoreObject.reopenClass`.
*/
export function classicReopenClass<C extends typeof CoreObject>(
  Class: C,
  ...mixins: Array<Mixin | Record<string, unknown>>
): C {
  applyMixin(Class, mixins);
  return Class;
}

/*
  The non-deprecated implementation behind `CoreObject.prototype.reopen`.
*/
export function classicReopenInstance<T extends CoreObject>(
  obj: T,
  ...args: Array<Mixin | Record<string, unknown>>
): T {
  applyMixin(obj, args);
  return obj;
}
