import Ember from 'ember-metal/core'; // Ember.$

// ES6TODO: the functions on EmberStringUtils need their own exports
import EmberStringUtils from "ember-runtime/system/string";
var w = EmberStringUtils.w;

// ES6TODO: the functions on EnumerableUtils need their own exports
import EnumerableUtils from "ember-metal/enumerable_utils";
var forEach = EnumerableUtils.forEach;

/**
@module ember
@submodule ember-views
*/
if (Ember.$) {
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
  var dragEvents = w('dragstart drag dragenter dragleave dragover drop dragend');

  // Copies the `dataTransfer` property from a browser event object onto the
  // jQuery event object for the specified events
  forEach(dragEvents, function(eventName) {
    Ember.$.event.fixHooks[eventName] = { props: ['dataTransfer'] };
  });
}
