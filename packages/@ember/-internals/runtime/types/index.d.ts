import { ObserverMethod } from './-private/types';
import CoreObject from './core';
import Observable from './observable';

export default class Object extends CoreObject implements Observable {
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
  getWithDefault<K extends keyof this>(key: K, defaultValue: any): unknown;
  incrementProperty(keyName: keyof this, increment?: number): number;
  decrementProperty(keyName: keyof this, decrement?: number): number;
  toggleProperty(keyName: keyof this): boolean;
  cacheFor<K extends keyof this>(key: K): unknown;
}
