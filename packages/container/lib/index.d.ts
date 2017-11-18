import { Owner } from 'ember-utils';
interface Container {
  registry: any;
  owner: Owner | null;
  cache: any | null;
  factoryManagerCache: any | null;
  isDestroyed: boolean;
  validationCache: any | null;
  lookup(fullName: string, options: any): any;
  destroy(): void;
  reset(fullName: string): void;
  ownerInjection(): any;
  _resolveCacheKey(name: string, options: any): any;
  factoryFor(fullName: string, options: any): any;
}
export const privatize: any;
export const Registry: any;
export const Container: (registry: any, options?: any) => Container;