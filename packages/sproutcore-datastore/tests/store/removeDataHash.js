// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// NOTE: The test below are based on the Data Hashes state chart.  This models
// the "remove" event in the Store portion of the diagram.

var store, child, storeKey, json;
module("SC.Store#removeDataHash", {
  setup: function() {
    store = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    
    storeKey = SC.Store.generateStoreKey();

    store.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
    store.editables = null; // manually patch to setup test state
    child = store.chain();  // test multiple levels deep
  }
});

// ..........................................................
// BASIC STATE TRANSITIONS
// 

// The transition from each base state performs the same operation, so just
// run the same test on each state.
function testRemoveDataHash() {
  var oldrev = store.revisions[storeKey];
  
  // perform test
  equals(store.removeDataHash(storeKey, SC.Record.DESTROYED_CLEAN), store, 'should return receiver');
  
  // verify
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'new edit state should be locked');
  
  equals(store.readDataHash(storeKey), null, 'should have NO json data');
  equals(store.readStatus(storeKey), SC.Record.DESTROYED_CLEAN, 'should have new status');

  equals(store.revisions[storeKey], oldrev, 'should not change revision');
  if (!SC.none(oldrev)) {
    ok(store.revisions.hasOwnProperty(storeKey), 'should clone reference to revision');
  }
}


test("edit state=LOCKED", function() {
  
  // test preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'precond - edit state should be locked');
  
  testRemoveDataHash();

});

test("edit state=EDITABLE", function() {
  
  // test preconditions
  store.readEditableDataHash(storeKey);
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'precond - edit state should be editable');
  
  testRemoveDataHash();

});

// ..........................................................
// REMOVE NON-EXISTING 
// 

test("remove a non-existing hash", function() {
  storeKey = SC.Store.generateStoreKey(); // new store key!
  equals(store.readDataHash(storeKey), null, 'precond - store should not have a data hash for store key yet');
  
  // perform write
  equals(store.removeDataHash(storeKey, SC.Record.DESTROYED_CLEAN), store, 'should return receiver');
  
  // verify change
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'new status should be locked');
  equals(store.readDataHash(storeKey), null, 'should still be null');
  equals(store.readStatus(storeKey), SC.Record.DESTROYED_CLEAN, 'should have new record status');
});

// ..........................................................
// PROPOGATING TO NESTED STORES
// 

test("change should propogate to child if child edit state = INHERITED", function() {

  // verify preconditions
  equals(child.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - child edit state should be INHERITED');

  // perform change
  store.removeDataHash(storeKey, SC.Record.DESTROYED_CLEAN);
  
  // verify
  same(child.readDataHash(storeKey), null, 'child should pick up change');
  equals(child.readStatus(storeKey), SC.Record.DESTROYED_CLEAN, 'child should pick up new status');
});


function testLockedOrEditableChild() {
  // perform change
  store.removeDataHash(storeKey, SC.Record.DESTROYED_CLEAN);
  
  // verify
  same(child.readDataHash(storeKey), json, 'child should NOT pick up change');
  equals(child.readStatus(storeKey), SC.Record.READY_CLEAN, 'child should pick up new status');
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









