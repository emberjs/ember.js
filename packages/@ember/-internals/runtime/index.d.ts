import { EmberClassConstructor, Objectify } from './types/-private/types';
import PublicCoreObject from './types/core';
import PublicEmberObject from './types/index';
import Evented from './types/evented';
export { default as copy } from './lib/copy';

export const TargetActionSupport: any;
export function isArray(arr: any): boolean;

// The public version doesn't export some deprecated methods.
// However, these are still used internally. Returning `any` is
// very loose, but it's essentially what was here before.
export class CoreObject extends PublicCoreObject {
  static extend<Statics, Instance>(
    this: Statics & EmberClassConstructor<Instance>,
    ...args: any[]
  ): Objectify<Statics> & EmberClassConstructor<Instance>;
  static reopen(...args: any[]): any;
  static reopenClass(...args: any[]): any;
}

export const FrameworkObject: any;

// The public version doesn't export some deprecated methods.
// However, these are still used internally. Returning `any` is
// very loose, but it's essentially what was here before.
export class Object extends PublicEmberObject {
  static extend<Statics, Instance>(
    this: Statics & EmberClassConstructor<Instance>,
    ...args: any[]
  ): Objectify<Statics> & EmberClassConstructor<Instance>;
  static reopen(...args: any[]): any;
  static reopenClass(...args: any[]): any;
}

export function _contentFor(proxy: any): any;

export const A: any;
export const ActionHandler: any;
export { Evented };
export function typeOf(obj: any): string;
