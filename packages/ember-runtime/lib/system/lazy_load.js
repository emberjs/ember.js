/*globals CustomEvent */

import { ENV, environment } from 'ember-environment';

/**
  @module ember
  @submodule ember-runtime
*/

const loadHooks = ENV.EMBER_LOAD_HOOKS || {};
const loaded = {};
export let _loaded = loaded;

/**
  Detects when a specific package of Ember (e.g. 'Ember.Application')
  has fully loaded and is available for extension.

  The provided `callback` will be called with the `name` passed
  resolved from a string into the object:

  ``` javascript
  Ember.onLoad('Ember.Application' function(hbars) {
    hbars.registerHelper(...);
  });
  ```

  @method onLoad
  @for Ember
  @param name {String} name of hook
  @param callback {Function} callback to be called
  @private
*/
export function onLoad(name, callback) {
  let object = loaded[name];

  loadHooks[name] = loadHooks[name] || [];
  loadHooks[name].push(callback);

  if (object) {
    callback(object);
  }
}

/**
  Called when an Ember.js package (e.g Ember.Application) has finished
  loading. Triggers any callbacks registered for this event.

  @method runLoadHooks
  @for Ember
  @param name {String} name of hook
  @param object {Object} object to pass to callbacks
  @private
*/
export function runLoadHooks(name, object) {
  loaded[name] = object;
  let window = environment.window;

  if (window && typeof CustomEvent === 'function') {
    let event = new CustomEvent(name, { detail: object, name });
    window.dispatchEvent(event);
  }

  if (loadHooks[name]) {
    loadHooks[name].forEach(callback => callback(object));
  }
}
