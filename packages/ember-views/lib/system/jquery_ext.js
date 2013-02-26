/**
@module ember
@submodule ember-views
*/
if (Ember.$) {
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
  var dragEvents = Ember.String.w('dragstart drag dragenter dragleave dragover drop dragend');

  // Copies the `dataTransfer` property from a browser event object onto the
  // jQuery event object for the specified events
  Ember.EnumerableUtils.forEach(dragEvents, function(eventName) {
    Ember.$.event.fixHooks[eventName] = { props: ['dataTransfer'] };
  });
}
