// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test parsing of query string
module("SC.Query#copy");

test("basic copy", function() {
  var q=  SC.Query.create({
    conditions: "foo = bar",
    parameters: { foo: "bar" },
    orderBy: "foo",
    recordType: SC.Record,
    recordTypes: [SC.Record],
    location: SC.Query.REMOTE,
    scope: SC.Set.create()
  }).freeze();
  
  var keys = 'conditions orderBy recordType recordTypes parameters location scope'.w();
  var copy = q.copy();
  
  equals(copy.isFrozen, NO, 'copy should not be frozen');
  keys.forEach(function(key) {
    equals(get(copy, key), get(q, key), 'copy.%@ should = original.%@'.fmt(key, key));
  }, this);
  
});
