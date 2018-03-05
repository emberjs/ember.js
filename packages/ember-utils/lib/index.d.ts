import { Opaque } from '@glimmer/interfaces';

export interface Factory<T, C> {
  class: C;
  fullName: string;
  normalizedName: string;
  create(props?: { [prop: string]: any; }): T;
}

export interface LookupOptions {
  source?: string;
  namespace?: string;
}

export interface Owner {
  lookup<T>(fullName: string, options?: LookupOptions): T;
  lookup(fullName: string, options?: LookupOptions): any;
  factoryFor<T, C>(fullName: string, options?: LookupOptions): Factory<T, C> | undefined;
  factoryFor(fullName: string, options?: LookupOptions): Factory<any, any> | undefined;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string, options?: LookupOptions): boolean;
}

export const NAME_KEY: string;
export function getOwner(obj: {}): Owner;
export function setOwner(obj: {}, owner: Owner): void;
export function symbol(debugName: string): string;
export function assign(original: any, ...args: any[]): any;
export const OWNER: string;

export function generateGuid(obj: Opaque, prefix?: string): string;
export function guidFor(obj: Opaque): string;
export function uuid(): number;
