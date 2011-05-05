// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SC.View.create");

test("registers view in the global views hash using layerId for event targeted", function() {
  var v = SC.View.create();
  equals(SC.View.views[v.get('elementId')], v, 'registers view');
});

