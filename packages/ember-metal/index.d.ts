import { Tag } from '@glimmer/reference';

export function peekMeta(obj: any): any;

export const PROPERTY_DID_CHANGE: symbol;

export function setHasViews(fn: () => boolean): null;

export function runInTransaction(context: any, methodName: string): any;

export function get(obj: any, keyName: string): any;

export function set(
  obj: any,
  keyName: string,
  value: any,
  tolerant?: boolean
): void;

export function objectAt(arr: any, i: number): any;

export function computed(...args: Array<any>): any;

export function didRender(object: any, key: string, reference: any): boolean;

export function isNone(obj: any): boolean;

export function watchKey(obj: any, keyName: string, meta?: any): void;

export class Cache<T, V> {
  constructor(
    limit: number,
    func: (obj: T) => V,
    key?: (obj: T) => string,
    store?: any
  );
  get(obj: T): V;
}

export { tagForProperty, tagFor } from './lib/tags';
export { tracked } from './lib/tracked';
