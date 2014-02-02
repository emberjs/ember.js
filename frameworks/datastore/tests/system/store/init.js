// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// This file tests the initial state of the store when it is first created
// either independently or as a chained store.

module("SC.Store#init");

test("initial setup for root store", function() {
  var store = SC.Store.create();
  
  equals(SC.typeOf(store.dataHashes), SC.T_HASH, 'should have dataHashes');
  equals(SC.typeOf(store.revisions), SC.T_HASH, 'should have revisions');
  equals(SC.typeOf(store.statuses), SC.T_HASH, 'should have statuses');
  ok(!store.editables, 'should not have editables');
  ok(!store.recordErrors, 'should not have recordErrors');
  ok(!store.queryErrors, 'should not have queryErrors');
}); 

