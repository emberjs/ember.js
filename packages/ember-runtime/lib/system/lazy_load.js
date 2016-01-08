/*globals CustomEvent */

import Ember from 'ember-metal/core'; // Ember.ENV.EMBER_LOAD_HOOKS
import { A as emberA } from 'ember-runtime/system/native_array';

/**
  @module ember
  @submodule ember-runtime
*/

var loadHooks = Ember.ENV.EMBER_LOAD_HOOKS || {};
var loaded = {};
export var _loaded = loaded;

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
  var object = loaded[name];

  loadHooks[name] = loadHooks[name] || emberA();
  loadHooks[name].pushObject(callback);

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

  if (typeof window === 'object' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    var event = new CustomEvent(name, { detail: object, name: name });
    window.dispatchEvent(event);
  }

  if (loadHooks[name]) {
    loadHooks[name].forEach((callback) => callback(object));
  }
}
