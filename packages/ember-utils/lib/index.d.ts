import { Opaque } from '@glimmer/interfaces';

export interface Factory<T> {
  class: any;
  fullName: string;
  normalizedName: string;
  create(props?: { [prop: string]: any; }): T;
}

export interface LookupOptions {
  source: string;
}

export interface Owner {
  lookup<T>(fullName: string, options?: LookupOptions): T;
  lookup(fullName: string, options?: LookupOptions): any;
  factoryFor<T>(fullName: string, options?: LookupOptions): Factory<T>;
  factoryFor(fullName: string, options?: LookupOptions): Factory<any>;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string, options?: LookupOptions): boolean;

  // maybe not needed, we were only using for cache key
  _resolveLocalLookupName(name: string, source: string): any;
}

export const NAME_KEY: string;
export function getOwner(obj: {}): Owner;
export function symbol(debugName: string): string;
export function assign(original: any, ...args: any[]): any;
export const OWNER: string;

export function generateGuid(obj: Opaque, prefix?: string): string;
export function guidFor(obj: Opaque): string;
export function uuid(): number;
