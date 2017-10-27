interface IBackburner {
  join(...args: any[]): void;
  on(...args: any[]): void;
  scheduleOnce(...args: any[]): void;
}
interface IRun {
  (...args: any[]): any;
  schedule(...args: any[]): void;
  later(...args: any[]): void;
  join(...args: any[]): void;
  backburner: IBackburner
}

export const run: IRun;

export const PROPERTY_DID_CHANGE: symbol;

export const flaggedInstrument: any;

export function setHasViews(fn: () => boolean): null;

export function runInTransaction(context: any, methodName: string): any;

export function _instrumentStart(name: string, _payload: (_payloadParam: any) => any, _payloadParam: any): () => void;

export function get(obj: any, keyName: string): any;

export function set(obj: any, keyName: string, value: any, tolerant?: boolean): void;

export function computed(...args: Array<any>): any;

export function didRender(object: any, key: string, reference: any): boolean;

export function isNone(obj: any): boolean;

export function tagForProperty(object: any, propertyKey: string, _meta?: any): any;

export function tagFor(object: any, _meta?: any): any;

export function watchKey(obj: any, keyName: string, meta?: any): void;

export function isProxy(value: any): boolean;

export class Cache<T, V> {
  constructor(limit: number, func: (obj: T) => V, key?: (obj: T) => string, store?: any)
  get(obj: T): V
}
