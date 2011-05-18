// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// NOTE: The test below are based on the Data Hashes state chart.  This models
// the "write" event in the NestedStore portion of the diagram.

var parent, store, child, storeKey, json;
module("SC.NestedStore#writeDataHash", {
  setup: function() {
    parent = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    
    storeKey = SC.Store.generateStoreKey();

    parent.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
    parent.editables = null; // manually patch to setup test state
    
    store = parent.chain(); // create nested store
    child = store.chain();  // test multiple levels deep
  }
});

// ..........................................................
// BASIC STATE TRANSITIONS
// 

// The transition from each base state performs the same operation, so just
// run the same test on each state.
function testWriteDataHash() {
  var oldrev = store.revisions[storeKey];
  
  // perform test
  var json2 = { foo: "bar" };
  equals(store.writeDataHash(storeKey, json2, SC.Record.READY_NEW), store, 'should return receiver');
  
  // verify
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'new edit state should be editable');
  
  equals(store.readDataHash(storeKey), json2, 'should have new json data hash');
  equals(store.readStatus(storeKey), SC.Record.READY_NEW, 'should have new status');

  equals(store.revisions[storeKey], oldrev, 'should not change revision');
  if (!SC.none(oldrev)) {
    ok(store.revisions.hasOwnProperty(storeKey), 'should clone reference to revision');
  }
}


test("edit state=INHERITED", function() {
  
  // test preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - edit state should be inherited');
  
  testWriteDataHash();
});

test("edit state=LOCKED", function() {
  
  // test preconditions
  store.readDataHash(storeKey);
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'precond - edit state should be locked');
  
  testWriteDataHash();

});

test("edit state=EDITABLE", function() {
  
  // test preconditions
  store.readEditableDataHash(storeKey);
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'precond - edit state should be editable');
  
  testWriteDataHash();

});

// ..........................................................
// WRITING NEW VS EXISTING
// 

test("writing a new hash", function() {
  storeKey = SC.Store.generateStoreKey(); // new store key!
  equals(parent.readDataHash(storeKey), null, 'precond - parent should not have a data hash for store key yet');
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - edit status should be inherited');
  
  // perform write
  equals(store.writeDataHash(storeKey, json, SC.Record.READY_NEW), store, 'should return receiver');
  
  // verify change
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'new status should be editable');
  equals(store.readDataHash(storeKey), json, 'should match new json');
  equals(store.readStatus(storeKey), SC.Record.READY_NEW, 'should have new record status');
});

// ..........................................................
// PROPOGATING TO NESTED STORES
// 

test("change should propogate to child if child edit state = INHERITED", function() {

  // verify preconditions
  equals(child.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - child edit state should be INHERITED');

  // perform change
  var json2 = { version: 2 };
  store.writeDataHash(storeKey, json2, SC.Record.READY_NEW);
  
  // verify
  same(child.readDataHash(storeKey), json2, 'child should pick up change');
  equals(parent.readDataHash(storeKey), json, 'parent should still have old json');
  
  equals(child.readStatus(storeKey), SC.Record.READY_NEW, 'child should pick up new status');
  equals(parent.readStatus(storeKey), SC.Record.READY_CLEAN, 'parent should still have old status');

});


function testLockedOrEditableChild() {
  // perform change
  var json2 = { version: 2 };
  store.writeDataHash(storeKey, json2, SC.Record.READY_NEW);
  
  // verify
  same(child.readDataHash(storeKey), json, 'child should NOT pick up change');
  equals(parent.readDataHash(storeKey), json, 'parent should still have old json');
  
  equals(child.readStatus(storeKey), SC.Record.READY_CLEAN, 'child should pick up new status');
  equals(parent.readStatus(storeKey), SC.Record.READY_CLEAN, 'parent should still have old status');
}


test("change should not propogate to child if child edit state = LOCKED", function() {

  // verify preconditions
  child.readDataHash(storeKey);
  equals(child.storeKeyEditState(storeKey), SC.Store.LOCKED, 'precond - child edit state should be LOCKED');

  testLockedOrEditableChild();
});

test("change should not propogate to child if child edit state = EDITABLE", function() {

  // verify preconditions
  child.readEditableDataHash(storeKey);
  equals(child.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'precond - child edit state should be EDITABLE');

  testLockedOrEditableChild();
});









