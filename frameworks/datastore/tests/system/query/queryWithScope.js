// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */
 
// test parsing of query string
var q, scope1, scope2;
module("SC.Query#queryWithScope", {
  setup: function() {
    q = SC.Query.create({
      conditions: "foo = bar",
      parameters: { foo: "bar" },
      orderBy: "foo",
      recordType: SC.Record,
      recordTypes: [SC.Record],
      location: SC.Query.REMOTE
    }).freeze();
    
    scope1 = SC.CoreSet.create();
    scope2 = SC.CoreSet.create();
  },
  
  teardown: function() {
    q = scope1 = scope2 = null;
  }
});

function verifyCopy(copy, original) {
  var keys = 'conditions orderBy recordType recordTypes parameters location'.w();
  keys.forEach(function(key) {
    equals(copy.get(key), original.get(key), 'copy.%@ should equal original.%@'.fmt(key, key));
  });
}

test("getting into scope first time", function() {
  
  var q2 = q.queryWithScope(scope1);
  verifyCopy(q2, q);
  equals(q2.get('scope'), scope1, 'new query should have scope1');
  
  var q3 = q.queryWithScope(scope1);
  equals(q3, q2, 'calling again with same scope should return same instance');
});

test("chained scope", function() {
  var q2 = q.queryWithScope(scope1) ;
  var q3 = q2.queryWithScope(scope2);
  
  verifyCopy(q3, q2);
  equals(q3.get('scope'), scope2, 'new query should have scope2');
  
  var q4 = q2.queryWithScope(scope2);
  equals(q4, q3, 'calling again with same scope should return same instance');
});

