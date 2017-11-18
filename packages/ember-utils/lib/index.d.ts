import { Opaque } from '@glimmer/interfaces';

export interface Factory<T> {
  create(options: any): T;
}

export interface Owner {
  lookup<T>(fullName: string, options?: { source: string }): T;
  lookup(fullName: string, options?: { source: string }): any;
  factoryFor<T>(fullName: string, options?: { source: string }): Factory<T>;
  factoryFor(fullName: string, options?: { source: string }): Factory<any>;
}

export const NAME_KEY: string;
export function getOwner(obj: {}): Owner;
export function symbol(debugName: string): string;
export function assign(original: any, ...args: any[]): any;
export const OWNER: string;
export const HAS_NATIVE_WEAKMAP: boolean;

export function generateGuid(obj: Opaque, prefix?: string): string;
export function guidFor(obj: Opaque): string;
export function uuid(): number;
