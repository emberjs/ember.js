declare module '@ember/routing/history-location' {
  import EmberObject from '@ember/object';
  import type { default as EmberLocation, UpdateCallback } from '@ember/routing/location';
  /**
      HistoryLocation implements the location API using the browser's
      history.pushState API.

      Using `HistoryLocation` results in URLs that are indistinguishable from a
      standard URL. This relies upon the browser's `history` API.

      Example:

      ```app/router.js
      Router.map(function() {
        this.route('posts', function() {
          this.route('new');
        });
      });

      Router.reopen({
        location: 'history'
      });
      ```

      This will result in a posts.new url of `/posts/new`.

      Keep in mind that your server must serve the Ember app at all the routes you
      define.

      Using `HistoryLocation` will also result in location states being recorded by
      the browser `history` API with the following schema:

      ```
      window.history.state -> { path: '/', uuid: '3552e730-b4a6-46bd-b8bf-d8c3c1a97e0a' }
      ```

      This allows each in-app location state to be tracked uniquely across history
      state changes via the `uuid` field.

      @class HistoryLocation
      @extends EmberObject
      @protected
    */
  export default class HistoryLocation extends EmberObject implements EmberLocation {
    location: Location;
    baseURL: string;
    history?: Window['history'];
    _previousURL?: string;
    _popstateHandler?: EventListener;
    /**
          Will be pre-pended to path upon state change
      
          @property rootURL
          @default '/'
          @private
        */
    rootURL: string;
    /**
          @private
      
          Returns normalized location.hash
      
          @method getHash
        */
    getHash(): string;
    init(): void;
    /**
          Used to set state on first call to setURL
      
          @private
          @method initState
        */
    initState(): void;
    /**
          Returns the current `location.pathname` without `rootURL` or `baseURL`
      
          @private
          @method getURL
          @return url {String}
        */
    getURL(): string;
    /**
          Uses `history.pushState` to update the url without a page reload.
      
          @private
          @method setURL
          @param path {String}
        */
    setURL(path: string): void;
    /**
          Uses `history.replaceState` to update the url without a page reload
          or history modification.
      
          @private
          @method replaceURL
          @param path {String}
        */
    replaceURL(path: string): void;
    /**
         Pushes a new state.
      
         @private
         @method pushState
         @param path {String}
        */
    pushState(path: string): void;
    /**
         Replaces the current state.
      
         @private
         @method replaceState
         @param path {String}
        */
    replaceState(path: string): void;
    /**
          Register a callback to be invoked whenever the browser
          history changes, including using forward and back buttons.
      
          @private
          @method onUpdateURL
          @param callback {Function}
        */
    onUpdateURL(callback: UpdateCallback): void;
    /**
          Used when using `{{action}}` helper.  The url is always appended to the rootURL.
      
          @private
          @method formatURL
          @param url {String}
          @return formatted url {String}
        */
    formatURL(url: string): string;
    /**
          Cleans up the HistoryLocation event listener.
      
          @private
          @method willDestroy
        */
    willDestroy(): void;
    _removeEventListener(): void;
  }
}
