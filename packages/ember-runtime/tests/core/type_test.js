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

  equals(Ember.typeOf(undefined),     'undefined', "item of type undefined");
  equals(Ember.typeOf(a),             'null',      "item of type null");
	equals(Ember.typeOf(arr),           'array',     "item of type array");
	equals(Ember.typeOf(obj),           'object',    "item of type object");
	equals(Ember.typeOf(object),        'instance',  "item of type instance");
	equals(Ember.typeOf(object.method), 'function',  "item of type function") ;
	equals(Ember.typeOf(Ember.Object),     'class',     "item of type class");
  equals(Ember.typeOf(new Error()),   'error',     "item of type error");
});

