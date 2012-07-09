// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
var dragEvents = Ember.String.w('dragstart drag dragenter dragleave dragover drop dragend');

// Copies the `dataTransfer` property from a browser event object onto the
// jQuery event object for the specified events
Ember.EnumerableUtils.forEach(dragEvents, function(eventName) {
  Ember.$.event.fixHooks[eventName] = { props: ['dataTransfer'] };
});
