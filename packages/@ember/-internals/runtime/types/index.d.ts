import { ObserverMethod } from './-private/types';
import CoreObject from './core';
import Observable from './observable';

export default class Object extends CoreObject implements Observable {
  get(key: string): unknown;
  getProperties<L extends string[]>(list: L): { [Key in L[number]]: unknown };
  getProperties<L extends string[]>(...list: L): { [Key in L[number]]: unknown };
  set<T>(key: string, value: T): T;
  setProperties<T extends Record<string, any>>(hash: T): T;
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
