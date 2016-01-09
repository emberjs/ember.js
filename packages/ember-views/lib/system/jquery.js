import Ember from 'ember-metal/core';

// ES6TODO: the functions on EnumerableUtils need their own exports
import environment from 'ember-metal/environment';

var jQuery;

if (environment.hasDOM) {
  // mainContext is set in `package/loader/lib/main.js` to the `this` context before entering strict mode
  jQuery = (Ember.imports && Ember.imports.jQuery) || (mainContext && mainContext.jQuery); //jshint ignore:line
  if (!jQuery && typeof require === 'function') {
    jQuery = require('jquery');
  }

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
