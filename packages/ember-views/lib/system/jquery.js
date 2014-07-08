import Ember from 'ember-metal/core'; // Ember.assert
import { w } from "ember-runtime/system/string";

// ES6TODO: the functions on EnumerableUtils need their own exports
import { forEach } from "ember-metal/enumerable_utils";

/**
Ember Views

@module ember
@submodule ember-views
@requires ember-runtime
@main ember-views
*/

var jQuery = (Ember.imports && Ember.imports.jQuery) || (this && this.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views require jQuery between 1.7 and 2.1", jQuery && (jQuery().jquery.match(/^((1\.(7|8|9|10|11))|(2\.(0|1)))(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
@module ember
@submodule ember-views
*/
if (jQuery) {
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
  var dragEvents = w('dragstart drag dragenter dragleave dragover drop dragend');

  // Copies the `dataTransfer` property from a browser event object onto the
  // jQuery event object for the specified events
  forEach(dragEvents, function(eventName) {
    jQuery.event.fixHooks[eventName] = { props: ['dataTransfer'] };
  });
}

export default jQuery;
