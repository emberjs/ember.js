// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SproutCore Copy Method");

test("Ember.copy null", function() {
  var obj = {field: null};
  equal(Ember.copy(obj, true).field, null, "null should still be null")
});

