declare module '@ember/service' {
  import EmberObject from '@ember/object';
  import type { BasicComputedProperty } from '@ember/object/computed';

  export default class Service extends EmberObject {}
  /**
   * Creates a property that lazily looks up a service in the container. There
   * are no restrictions as to what objects a service can be injected into.
   */
  export function inject(): Service; // @inject() foo, foo: inject()
  export function inject(target: object, propertyKey: string | symbol): void; // @inject foo
  export function inject<K extends keyof Registry>(name: K): Registry[K] & BasicComputedProperty; // @inject('store') foo      @inject() foo

  /**
   * Creates a property that lazily looks up a service in the container. There
   * are no restrictions as to what objects a service can be injected into.
   */
  export function service(): Service; // @service() foo, foo: service()
  export function service(target: object, propertyKey: string | symbol): void; // @service foo
  export function service<K extends keyof Registry>(name: K): Registry[K] & BasicComputedProperty; // @service('store') foo      @service() foo

  // A type registry for Ember `Service`s. Meant to be declaration-merged so
  // string lookups resolve to the correct type.
  export interface Registry extends Record<string, Service> {}
}

declare module '@ember/owner' {
  import { Registry } from '@ember/service';
  export interface DIRegistry {
    service: Registry;
  }
}
