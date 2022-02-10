import EmberObject from '@ember/object';

export interface FactoryClass {
  positionalParams?: string | string[] | undefined | null;
}

export interface Factory<T, C extends FactoryClass | object = FactoryClass> {
  class?: C;
  name?: string;
  fullName?: string;
  normalizedName?: string;
  create(props?: { [prop: string]: any }): T;
}

export interface EngineInstanceOptions {
  mountPoint: string;
  routable: boolean;
}

export interface LookupOptions {
  singleton?: boolean;
  instantiate?: boolean;
}

declare class EngineInstance extends EmberObject {
  boot(): void;

  lookup<T>(fullName: string, options?: LookupOptions): T | undefined;
  factoryFor<T, C>(fullName: string, options?: LookupOptions): Factory<T, C> | undefined;
  register<T, C>(fullName: string, factory: Factory<T, C>, options?: LookupOptions): void;
  hasRegistration(name: string, options?: LookupOptions): boolean;

  /** @internal */
  mountPoint?: string;
  /** @internal */
  routable?: boolean;
  /** @internal */
  buildChildEngineInstance(name: string, options?: EngineInstanceOptions): EngineInstance;
}

export default EngineInstance;
