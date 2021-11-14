import { EmberClassConstructor, Objectify, ObserverMethod } from './types/-private/types';
import PublicCoreObject from './types/core';
import Evented from './types/evented';
import Observable from './types/observable';

export const TargetActionSupport: any;
export function isArray(arr: any): boolean;
export const ControllerMixin: any;

export function deprecatingAlias(
  name: string,
  opts: {
    id: string;
    until: string;
  }
): any;

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

export class Object extends CoreObject implements Observable {
  get<K extends keyof this>(key: K): unknown;
  getProperties<K extends keyof this>(list: K[]): Record<K, unknown>;
  getProperties<K extends keyof this>(...list: K[]): Record<K, unknown>;
  set<K extends keyof this>(key: K, value: this[K]): this[K];
  set<T>(key: keyof this, value: T): T;
  setProperties<K extends keyof this>(hash: Pick<this, K>): Record<K, unknown>;
  setProperties<K extends keyof this>(
    // tslint:disable-next-line:unified-signatures
    hash: { [KK in K]: any }
  ): Record<K, unknown>;
  notifyPropertyChange(keyName: string): this;
  addObserver<Target>(key: keyof this, target: Target, method: ObserverMethod<Target, this>): this;
  addObserver(key: keyof this, method: ObserverMethod<this, this>): this;
  removeObserver<Target>(
    key: keyof this,
    target: Target,
    method: ObserverMethod<Target, this>
  ): this;
  removeObserver(key: keyof this, method: ObserverMethod<this, this>): this;
  incrementProperty(keyName: keyof this, increment?: number): number;
  decrementProperty(keyName: keyof this, decrement?: number): number;
  toggleProperty(keyName: keyof this): boolean;
  cacheFor<K extends keyof this>(key: K): unknown;
}

export function _contentFor(proxy: any): any;

export const A: any;
export const ActionHandler: any;
export { Evented };
export function typeOf(obj: any): string;
