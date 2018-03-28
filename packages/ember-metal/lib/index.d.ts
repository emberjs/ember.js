import { Tag } from '@glimmer/reference';

interface IBackburner {
  join(...args: any[]): void;
  on(...args: any[]): void;
  scheduleOnce(...args: any[]): void;
  schedule(queueName: string, target: Object | null, method: Function | string): void;
}

export function peekMeta(obj: any): any;

export function run(...args: any[]): any;
export function schedule(...args: any[]): void;
export function later(...args: any[]): void;
export function join(...args: any[]): void;
export const backburner: IBackburner;
export function getCurrentRunLoop(): boolean;

export const PROPERTY_DID_CHANGE: symbol;

export const flaggedInstrument: any;

export function setHasViews(fn: () => boolean): null;

export function runInTransaction(context: any, methodName: string): any;

export function _instrumentStart(name: string, _payload: (_payloadParam: any) => any, _payloadParam: any): () => void;

export function get(obj: any, keyName: string): any;

export function set(obj: any, keyName: string, value: any, tolerant?: boolean): void;

export function objectAt(arr: any, i: number): any;

export function computed(...args: Array<any>): any;

export function didRender(object: any, key: string, reference: any): boolean;

export function isNone(obj: any): boolean;

export function tagForProperty(object: any, propertyKey: string, _meta?: any): Tag;

export function tagFor(object: any, _meta?: any): Tag;

export function watchKey(obj: any, keyName: string, meta?: any): void;

export function isProxy(value: any): boolean;

export function setProxy(value: any): any;

export class Cache<T, V> {
  constructor(limit: number, func: (obj: T) => V, key?: (obj: T) => string, store?: any)
  get(obj: T): V
}

export const WeakSet: WeakSetConstructor;
