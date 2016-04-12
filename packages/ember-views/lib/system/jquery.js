import { context, environment } from 'ember-environment';

let jQuery;

if (environment.hasDOM) {
  jQuery = context.imports.jQuery;
  if (!jQuery && typeof require === 'function') {
    jQuery = require('jquery');
  }

  if (jQuery) {
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
    [
      'dragstart',
      'drag',
      'dragenter',
      'dragleave',
      'dragover',
      'drop',
      'dragend'
    ].forEach(function(eventName) {
      jQuery.event.fixHooks[eventName] = {
        props: ['dataTransfer']
      };
    });
  }
}

export default jQuery;
