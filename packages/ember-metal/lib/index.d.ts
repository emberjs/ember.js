declare module 'ember-metal' {
  export const run: { [key: string]: any };

  export function setHasViews(fn: () => boolean): null;

  export function runInTransaction(context: any, methodName: string): any;

  export function _instrumentStart(name: string, _payload: (_payloadParam: any) => any, _payloadParam: any): () => void;

  export function get(obj: any, keyName: string): any;

  export function tagForProperty(object: any, propertyKey: string, _meta?: any): any;

  export function tagFor(object: any, _meta?: any): any;

  export function isProxy(value: any): boolean;

  export class Cache {
    constructor(limit: number, func: (obj: any) => any, key: any, store?: any)
  }
}