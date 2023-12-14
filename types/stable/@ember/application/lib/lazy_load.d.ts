declare module '@ember/application/lib/lazy_load' {
  export let _loaded: Record<string, unknown>;
  /**
      Detects when a specific package of Ember (e.g. 'Application')
      has fully loaded and is available for extension.

      The provided `callback` will be called with the `name` passed
      resolved from a string into the object:

      ``` javascript
      import { onLoad } from '@ember/application';

      onLoad('Ember.Application' function(hbars) {
        hbars.registerHelper(...);
      });
      ```

      @method onLoad
      @static
      @for @ember/application
      @param name {String} name of hook
      @param callback {Function} callback to be called
      @private
    */
  export function onLoad(name: string, callback: (obj: any) => void): void;
  /**
      Called when an Ember.js package (e.g Application) has finished
      loading. Triggers any callbacks registered for this event.

      @method runLoadHooks
      @static
      @for @ember/application
      @param name {String} name of hook
      @param object {Object} object to pass to callbacks
      @private
    */
  export function runLoadHooks(name: string, object: unknown): void;
}
