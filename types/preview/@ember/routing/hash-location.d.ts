declare module '@ember/routing/hash-location' {
  import EmberObject from '@ember/object';
  import Location, { UpdateCallback } from '@ember/routing/location';

  /**
   * `Ember.HashLocation` implements the location API using the browser's
   * hash. At present, it relies on a `hashchange` event existing in the
   * browser.
   */
  export default class HashLocation extends EmberObject implements Location {
    getURL(): string;
    setURL(url: string): void;
    replaceURL?(url: string): void;
    onUpdateURL(callback: UpdateCallback): void;
    formatURL(url: string): string;
    initState?(): void;
  }
}

declare module '@ember/routing/location' {
  import HashLocation from '@ember/routing/hash-location';

  export interface Registry {
    hash: HashLocation;
  }
}
