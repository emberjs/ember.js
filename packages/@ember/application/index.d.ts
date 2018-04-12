export interface LookupOptions {
  source?: string;
  namespace?: string;
}

export interface Factory<T, C> {
  class: C;
  fullName: string;
  normalizedName: string;
  create(props?: { [prop: string]: any }): T;
}

export interface Owner {
  lookup<T>(fullName: string, options?: LookupOptions): T;
  lookup(fullName: string, options?: LookupOptions): any;
  factoryFor<T, C>(fullName: string, options?: LookupOptions): Factory<T, C> | undefined;
  factoryFor(fullName: string, options?: LookupOptions): Factory<any, any> | undefined;
  buildChildEngineInstance<T>(name: string): T;
  hasRegistration(name: string, options?: LookupOptions): boolean;
}

export function getOwner(obj: {}): Owner;
export function setOwner(obj: {}, owner: Owner): void;
export const OWNER: string;
