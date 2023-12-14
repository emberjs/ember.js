/*globals CustomEvent */
import { ENV } from '@ember/-internals/environment';
import { window } from '@ember/-internals/browser-environment';
/**
  @module @ember/application
*/
const loadHooks = ENV.EMBER_LOAD_HOOKS || {};
const loaded = {};
export let _loaded = loaded;
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
export function onLoad(name, callback) {
  let object = loaded[name];
  let hooks = loadHooks[name] ??= [];
  hooks.push(callback);
  if (object) {
    callback(object);
  }
}
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
export function runLoadHooks(name, object) {
  loaded[name] = object;
  if (window && typeof CustomEvent === 'function') {
    let event = new CustomEvent(name, {
      detail: object
    });
    window.dispatchEvent(event);
  }
  loadHooks[name]?.forEach(callback => callback(object));
}