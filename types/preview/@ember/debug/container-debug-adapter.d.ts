declare module '@ember/debug/container-debug-adapter' {
  import EmberObject from '@ember/object';
  import type { Resolver } from '@ember/owner';

  /**
   * The ContainerDebugAdapter helps the container and resolver interface
   * with tools that debug Ember such as the Ember Inspector for Chrome and Firefox.
   */
  export default class ContainerDebugAdapter extends EmberObject {
    resolver: Resolver;
    canCatalogEntriesByType(type: string): boolean;
    catalogEntriesByType(type: string): string[];
  }
}
