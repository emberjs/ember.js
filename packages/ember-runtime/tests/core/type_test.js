// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember Type Checking");

test("Ember.typeOf", function() {
	var a = null,
      arr = [1,2,3],
      obj = {},
      object = Ember.Object.create({ method: function() {} });

  equal(Ember.typeOf(undefined),     'undefined', "item of type undefined");
  equal(Ember.typeOf(a),             'null',      "item of type null");
	equal(Ember.typeOf(arr),           'array',     "item of type array");
	equal(Ember.typeOf(obj),           'object',    "item of type object");
	equal(Ember.typeOf(object),        'instance',  "item of type instance");
	equal(Ember.typeOf(object.method), 'function',  "item of type function") ;
	equal(Ember.typeOf(Ember.Object),     'class',     "item of type class");
  equal(Ember.typeOf(new Error()),   'error',     "item of type error");
});

