declare module '@ember/routing/history-location' {
  import EmberObject from '@ember/object';
  import Location, { UpdateCallback } from '@ember/routing/location';

  /**
   * Ember.HistoryLocation implements the location API using the browser's
   * history.pushState API.
   */
  export default class HistoryLocation extends EmberObject implements Location {
    getURL(): string;
    setURL(url: string): void;
    replaceURL?(url: string): void;
    onUpdateURL(callback: UpdateCallback): void;
    formatURL(url: string): string;
    initState?(): void;
  }
}

declare module '@ember/routing/location' {
  import HistoryLocation from '@ember/routing/history-location';

  export interface Registry {
    history: HistoryLocation;
  }
}
