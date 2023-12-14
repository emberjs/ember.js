declare module '@ember/routing/location' {
  /**
      @module @ember/routing/location
    */
  /**
      `Location` defines an interface to be implemented by `location` APIs. It is
      not user-constructible; the only valid way to get a `Location` is via one of
      its concrete implementations.

      ## Implementations

      You can pass an implementation name (`hash`, `history`, `none`) to force a
      particular implementation to be used in your application.

      - See [HashLocation](/ember/release/classes/HashLocation).
      - See [HistoryLocation](/ember/release/classes/HistoryLocation).
      - See [NoneLocation](/ember/release/classes/NoneLocation).

      ## Location API

      Each location implementation must provide the following methods:

      * `getURL`: returns the current URL.
      * `setURL(path)`: sets the current URL.
      * `replaceURL(path)`: replace the current URL (optional).
      * `onUpdateURL(callback)`: triggers the callback when the URL changes.
      * `formatURL(url)`: formats `url` to be placed into `href` attribute.

      Calling `setURL` or `replaceURL` will not trigger onUpdateURL callbacks.

      ## Custom implementation

      Ember scans `app/locations/*` for extending the Location API.

      Example:

      ```javascript
      import HistoryLocation from '@ember/routing/history-location';

      export default class MyHistory {
        implementation = 'my-custom-history';

        constructor() {
          this._history = HistoryLocation.create(...arguments);
        }

        create() {
          return new this(...arguments);
        }

        pushState(path) {
           this._history.pushState(path);
        }
      }
      ```

      @for @ember/routing/location
      @class Location
      @since 5.0.0
      @public
    */
  export default interface Location {
    /**
     * If the location needs to redirect to a different URL, it can cancel routing
     * by setting the `cancelRouterSetup` property on itself to false.
     * @property cancelRouterSetup
     * @type Boolean
     * @optional
     * @default true
     * @public
     */
    cancelRouterSetup?: boolean;
    /**
     * The current URL.
     * @property
     * @type String
     * @public
     */
    getURL(): string;
    /**
     * Sets the current URL. Calling `setURL` will not trigger `onUpdateURL`
     * callbacks.
     *
     * @public
     * @method
     * @param {String} url the new URL to update to.
     */
    setURL(url: string): void;
    /**
     * Replace the current URL (optional). Calling `replaceURL` will not trigger
     * `onUpdateURL` callbacks.
     *
     * @public
     * @method
     * @param {String} url the new URL to replace the current URL with.
     */
    replaceURL?(url: string): void;
    /**
     * triggers the callback when the URL changes.
     * @param {(newUrl: string) => void} callback A function to run when the URL
     *   changes. The the new URL string is provided as the only argument.
     */
    onUpdateURL(callback: UpdateCallback): void;
    /**
     * Formats url to be placed into href attribute.
     *
     * @public
     * @method
     * @param {String} url the url to format
     */
    formatURL(url: string): string;
    initState?(): void;
    destroy(): void;
  }
  export type UpdateCallback = (url: string) => void;
  export interface Registry extends Record<string, Location | undefined> {}
}
