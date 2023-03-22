declare module '@ember/routing/none-location' {
  import EmberObject from '@ember/object';
  import Location, { UpdateCallback } from '@ember/routing/location';

  /**
   * Ember.NoneLocation does not interact with the browser. It is useful for
   * testing, or when you need to manage state with your Router, but temporarily
   * don't want it to muck with the URL (for example when you embed your
   * application in a larger page).
   */
  export default class NoneLocation extends EmberObject implements Location {
    getURL(): string;
    setURL(url: string): void;
    replaceURL?(url: string): void;
    onUpdateURL(callback: UpdateCallback): void;
    formatURL(url: string): string;
    initState?(): void;
  }
}

declare module '@ember/routing/location' {
  import NoneLocation from '@ember/routing/none-location';

  export interface Registry {
    none: NoneLocation;
  }
}
