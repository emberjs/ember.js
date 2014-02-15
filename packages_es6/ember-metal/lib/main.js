/**
Ember Metal

@module ember
@submodule ember-metal
*/

// IMPORTS

import Ember from "ember-metal/core";
import {instrument, subscribe, unsubscribe, reset} from "ember-metal/instrumentation";
import {
  generateGuid,
  GUID_KEY,
  GUID_PREFIX,
  guidFor,
  META_DESC,
  EMPTY_META,
  meta,
  getMeta,
  setMeta,
  metaPath,
  inspect,
  typeOf,
  tryCatchFinally,
  isArray,
  makeArray,
  canInvoke,
  tryInvoke,
  tryFinally
} from "ember-metal/utils";
import EmberError from "ember-metal/error";
import EnumerableUtils from "ember-metal/enumerable_utils";

import {create, platform} from "ember-metal/platform";
import ArrayPolyfills from "ember-metal/array";
import Logger from "ember-metal/logger";

import {get, getWithDefault, normalizeTuple, _getPath} from "ember-metal/property_get";

// EXPORTS to the global window Ember.

Ember.Instrumentation = {
  instrument: instrument,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  reset: reset
}

Ember.generateGuid    = generateGuid;
Ember.GUID_KEY        = GUID_KEY;
Ember.GUID_PREFIX     = GUID_PREFIX;
Ember.create          = create;
Ember.platform        = platform;
Ember.ArrayPolyfills  = ArrayPolyfills;
Ember.Error           = EmberError;
Ember.guidFor         = guidFor;
Ember.META_DESC       = META_DESC;
Ember.EMPTY_META      = EMPTY_META;
Ember.meta            = meta;
Ember.getMeta         = getMeta;
Ember.setMeta         = setMeta;
Ember.metaPath        = metaPath;
Ember.inspect         = inspect;
Ember.typeOf          = typeOf;
Ember.tryCatchFinally = tryCatchFinally;
Ember.isArray = isArray;
Ember.makeArray = makeArray;
Ember.canInvoke = canInvoke;
Ember.tryInvoke = tryInvoke;
Ember.tryFinally = tryFinally;

Ember.Logger = Logger;

Ember.get = get;
Ember.getWithDefault = getWithDefault;
Ember.normalizeTuple = normalizeTuple;
Ember._getPath = _getPath;

Ember.EnumerableUtils = EnumerableUtils;

// ..........................................................
// ERROR HANDLING
//

/**
  A function may be assigned to `Ember.onerror` to be called when Ember
  internals encounter an error. This is useful for specialized error handling
  and reporting code.

  ```javascript
  Ember.onerror = function(error) {
    Em.$.ajax('/report-error', 'POST', {
      stack: error.stack,
      otherInformation: 'whatever app state you want to provide'
    });
  };
  ```

  @event onerror
  @for Ember
  @param {Exception} error the error object
*/
Ember.onerror = null;

// require('ember-metal/instrumentation');
require('ember-metal/map');
// require('ember-metal/platform');
// require('ember-metal/utils');
// require('ember-metal/error');
// require('ember-metal/logger');
// require('ember-metal/property_get');
require('ember-metal/property_set');
require('ember-metal/properties');
require('ember-metal/property_events');
require('ember-metal/get_properties');
require('ember-metal/set_properties');
require('ember-metal/chains');
require('ember-metal/computed');
require('ember-metal/watching');
require('ember-metal/watch_key');
require('ember-metal/watch_path');
require('ember-metal/events');
require('ember-metal/observer');
require('ember-metal/mixin');
require('ember-metal/binding');
require('ember-metal/run_loop');
require('ember-metal/libraries');

window.Ember = Ember;

export default Ember;
