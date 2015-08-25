import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';

// ES6TODO: the functions on EnumerableUtils need their own exports
import environment from 'ember-metal/environment';

var jQuery;

if (environment.hasDOM) {
  // mainContext is set in `package/loader/lib/main.js` to the `this` context before entering strict mode
  jQuery = (Ember.imports && Ember.imports.jQuery) || (mainContext && mainContext.jQuery); //jshint ignore:line
  if (!jQuery && typeof require === 'function') {
    jQuery = require('jquery');
  }

  assert(
    'Ember Views require jQuery between 1.7 and 2.1',
    jQuery && (jQuery().jquery.match(/^((1\.(7|8|9|10|11))|(2\.(0|1)))(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY)
  );

  if (jQuery) {
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
    var dragEvents = [
      'dragstart',
      'drag',
      'dragenter',
      'dragleave',
      'dragover',
      'drop',
      'dragend'
    ];

    // Copies the `dataTransfer` property from a browser event object onto the
    // jQuery event object for the specified events
    dragEvents.forEach(function(eventName) {
      jQuery.event.fixHooks[eventName] = {
        props: ['dataTransfer']
      };
    });
  }
}

export default jQuery;
