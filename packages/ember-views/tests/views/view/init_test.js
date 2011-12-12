// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

module("Ember.View.create");

test("registers view in the global views hash using layerId for event targeted", function() {
  var v = Ember.View.create();
  equals(Ember.View.views[get(v, 'elementId')], v, 'registers view');
});

