// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// NOTE: The test below are based on the Data Hashes state chart.  This models
// the "discard" event in the NestedStore portion of the diagram.

var parent, store, child, storeKey, json, args;
module("SC.NestedStore#discardChanges", {
  setup: function() {
    SC.RunLoop.begin();

    parent = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    args = null;
    
    storeKey = SC.Store.generateStoreKey();

    parent.writeDataHash(storeKey, json, SC.Record.READY_CLEAN);
    parent.editables = null;
    
    store = parent.chain(); // create nested store
    child = store.chain();  // test multiple levels deep

    // commitChangesFromNestedStore() should never be called.  Capture info
    // about call.
    parent.commitChangesFromNestedStore =
    child.commitChangesFromNestedStore =
    store.commitChangesFromNestedStore = function(store, changes, force) {
      if (!args) args = [];
      args.push({ 
        target: this, 
        store: store, 
        changes: changes, 
        force: force 
      });
    };

    SC.RunLoop.end();
  }
});

// ..........................................................
// BASIC STATE TRANSITIONS
//

function testStateTransition() {

  // attempt to commit
  equals(store.discardChanges(), store, 'should return receiver');
  
  // verify result
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'data edit state');
  equals(store.get('hasChanges'), NO, 'hasChanges should be NO');
  equals(store.readDataHash(storeKey), json, 'data hash should return parent hash again');
  equals(store.readStatus(storeKey), parent.readStatus(storeKey), 'should return record status from parent');
  ok(!store.chainedChanges || !store.chainedChanges.length, 'should have no chainedChanges queued');
  
  // should NOT invoke commitChangesFromNestedStore
  equals(args, null, 'should not call commitChangesFromNestedStore');
}

test("state = INHERITED", function() {
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - data edit state');
  testStateTransition();
});


test("state = LOCKED", function() {
  
  store.readDataHash(storeKey); // force to locked mode
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'precond - data edit state');
  testStateTransition();
});

test("state = EDITABLE", function() {
  
  // write in some data to store
  store.writeDataHash(storeKey, json);
  store.dataHashDidChange(storeKey);
  
  // check preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'precond - data edit state');
  ok(store.chainedChanges  && store.chainedChanges.contains(storeKey), 'editable record should be in chainedChanges set');

  testStateTransition();
});


// ..........................................................
// SPECIAL CASES
// 

// TODO: Add more special cases for SC.NestedStore#discardChanges
