// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module, ok, equals, same, test */

// NOTE: The test below are based on the Data Hashes state chart.  This models
// the "commit" event in the NestedStore portion of the diagram.

var parent, store, child, storeKey, json, args;
module("SC.NestedStore#commitChanges", {
  setup: function() {
    SC.RunLoop.begin();

    parent = SC.Store.create();

    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    args = [];

    storeKey = SC.Store.generateStoreKey();

    store = parent.chain(); // create nested store
    child = store.chain();  // test multiple levels deep

    // override commitChangesFromNestedStore() so we can ensure it is called
    // save call history for later evaluation
    parent.commitChangesFromNestedStore =
    child.commitChangesFromNestedStore =
    store.commitChangesFromNestedStore = function(store, changes, force) {
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

function testStateTransition(shouldIncludeStoreKey, shouldCallParent) {

  // attempt to commit
  equals(store.commitChanges(), store, 'should return receiver');

  // verify result
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'data edit state');

  if (shouldCallParent === NO) {
    ok(!args || args.length===0, 'should not call commitChangesFromNestedStore');
  } else {
    equals(args.length, 1, 'should have called commitChangesFromNestedStore');

    var opts = args[0] || {}; // avoid exceptions
    equals(opts.target, parent, 'should have called on parent store');

    // verify if changes passed to callback included storeKey
    var changes = opts.changes;
    var didInclude = changes && changes.contains(storeKey);
    if (shouldIncludeStoreKey) {
      ok(didInclude, 'passed set of changes should include storeKey');
    } else {
      ok(!didInclude, 'passed set of changes should NOT include storeKey');
    }
  }

  equals(store.get('hasChanges'), NO, 'hasChanges should be cleared');
  ok(!store.chainedChanges || store.chainedChanges.length===0, 'should have empty chainedChanges set');
}

test("state = INHERITED", function() {

  // write in some data to parent
  parent.writeDataHash(storeKey, json);

  // check preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.INHERITED, 'precond - data edit state');

  testStateTransition(NO, NO);
});


test("state = LOCKED", function() {

  // write in some data to parent
  parent.writeDataHash(storeKey, json);
  parent.editables = null ; // manually force to lock state
  store.readDataHash(storeKey);

  // check preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.LOCKED, 'precond - data edit state');
  ok(!store.chainedChanges || !store.chainedChanges.contains(storeKey), 'locked record should not be in chainedChanges set');

  testStateTransition(NO, NO);
});

test("state = EDITABLE", function() {

  // write in some data to parent
  store.writeDataHash(storeKey, json);
  store.dataHashDidChange(storeKey);

  // check preconditions
  equals(store.storeKeyEditState(storeKey), SC.Store.EDITABLE, 'precond - data edit state');
  ok(store.chainedChanges  && store.chainedChanges.contains(storeKey), 'editable record should be in chainedChanges set');

  testStateTransition(YES, YES);
});


// ..........................................................
// SPECIAL CASES
// 

test("commiting a changed record should immediately notify outstanding records in parent store", function() {

  var Rec = SC.Record.extend({

    fooCnt: 0,
    fooDidChange: function() { this.fooCnt++; }.observes('foo'),

    statusCnt: 0,
    statusDidChange: function() { this.statusCnt++; }.observes('status'),

    reset: function() { this.fooCnt = this.statusCnt = 0; },

    equals: function(fooCnt, statusCnt, str) {
      if (!str) str = '' ;
      equals(this.get('fooCnt'), fooCnt, str + ':fooCnt');
      equals(this.get('statusCnt'), statusCnt, str + ':statusCnt');
    }

  });

  SC.RunLoop.begin();

  var store = SC.Store.create();
  var prec  = store.createRecord(Rec, { foo: "bar", guid: 1 });

  var child = store.chain();
  var crec  = child.find(Rec, prec.get('id'));

  // check assumptions
  ok(!!crec, 'prerec - should find child record');
  equals(crec.get('foo'), 'bar', 'prerec - child record should have foo');

  // modify child record - should not modify parent
  prec.reset();
  crec.set('foo', 'baz');
  equals(prec.get('foo'), 'bar', 'should not modify parent before commit');
  prec.equals(0,0, 'before commitChanges');

  // commit changes - note: still inside runloop
  child.commitChanges();
  equals(prec.get('foo'), 'baz', 'should push data to parent');
  prec.equals(1,1, 'after commitChanges'); // should notify immediately

  SC.RunLoop.end();

  // should not notify again after runloop - nothing to do
  prec.equals(1,1,'after runloop ends - should not notify again');

});


test("Changes to relationships should propagate to the parent store.", function() {

  var MyApp = window.MyApp = SC.Object.create({
    store: SC.Store.create()
  });

  MyApp.Rec = SC.Record.extend({
    relatedChild: SC.Record.toOne('MyApp.RelatedRec', {
      inverse: 'relatedParent'
    }),

    relatedChildren: SC.Record.toMany('MyApp.RelatedRecs', {
      inverse: 'relatedParent'
    })
  });

  MyApp.RelatedRec = SC.Record.extend({
    relatedParent: SC.Record.toOne('MyApp.Rec', {
      inverse: 'relatedChild',
      isMaster: NO
    })
  });

  MyApp.RelatedRecs = SC.Record.extend({
    relatedParent: SC.Record.toOne('MyApp.Rec', {
      inverse: 'relatedChildren',
      isMaster: NO
    })
  });

  SC.RunLoop.begin();

  MyApp.store.loadRecord(MyApp.RelatedRec, { guid: 2, relatedParent: 1});
  MyApp.store.loadRecord(MyApp.RelatedRecs, { guid: 3, relatedParent: 1 });
  MyApp.store.loadRecord(MyApp.RelatedRecs, { guid: 4, relatedParent: 1 });
  MyApp.store.loadRecord(MyApp.Rec, { guid: 1, relatedChild: 2, relatedChildren: [3,4] });

  var primaryRec = MyApp.store.find(MyApp.Rec, 1);
  var primaryRelatedRec  = MyApp.store.find(MyApp.RelatedRec, 2);
  var primaryRelatedRecs1  = MyApp.store.find(MyApp.RelatedRecs, 3);
  var primaryRelatedRecs2  = MyApp.store.find(MyApp.RelatedRecs, 4);

  var nestedStore = MyApp.store.chain();
  var nestedRec = nestedStore.find(MyApp.Rec, primaryRec.get('id'));
  var nestedRelatedRec = nestedStore.find(MyApp.RelatedRec, primaryRelatedRec.get('id'));
  var nestedRelatedRecs1 = nestedStore.find(MyApp.RelatedRecs, primaryRelatedRecs1.get('id'));
  var nestedRelatedRecs2 = nestedStore.find(MyApp.RelatedRecs, primaryRelatedRecs2.get('id'));

  // check assumptions
  ok(!!nestedRec, 'Prior to nested changes should find primaryRec in nested store');
  ok(!!nestedRelatedRec, 'Prior to nested changes should find nestedRelatedRec in nested store');
  ok(!!nestedRelatedRecs1, 'Prior to nested changes should find nestedRelatedRecs1 in nested store');
  ok(!!nestedRelatedRecs2, 'Prior to nested changes should find nestedRelatedRecs2 in nested store');
  equals(primaryRec.get('relatedChild'), primaryRelatedRec, 'Prior to changes primaryRec relatedChild should be');
  equals(primaryRelatedRec.get('relatedParent'), primaryRec, 'Prior to changes primaryRelatedRec relatedParent should be');
  equals(primaryRelatedRecs1.get('relatedParent'), primaryRec, 'Prior to changes primaryRelatedRecs1 relatedParent should be');
  equals(primaryRelatedRecs2.get('relatedParent'), primaryRec, 'Prior to changes primaryRelatedRecs2 relatedParent should be');
  equals(primaryRec.get('status'), SC.Record.READY_CLEAN, 'Prior to changes primaryRec status should be READY_CLEAN');
  equals(primaryRelatedRec.get('status'), SC.Record.READY_CLEAN, 'Prior to changes primaryRelatedRec status should be READY_CLEAN');
  equals(primaryRelatedRecs1.get('status'), SC.Record.READY_CLEAN, 'Prior to changes primaryRelatedRecs1 status should be READY_CLEAN');
  equals(primaryRelatedRecs2.get('status'), SC.Record.READY_CLEAN, 'Prior to changes primaryRelatedRecs2 status should be READY_CLEAN');

  nestedRec.set('relatedChild', null);
  nestedRelatedRecs2.set('relatedParent', null);
  nestedRec.get('relatedChildren').popObject();

  // Modifying nested store record relationships should not modify primary store record relationships
  equals(primaryRec.get('relatedChild'), primaryRelatedRec, 'After nested changes primaryRec relatedChild should be');
  equals(primaryRelatedRec.get('relatedParent'), primaryRec, 'After nested changes primaryRelatedRec relatedParent should be');
  equals(primaryRelatedRecs1.get('relatedParent'), primaryRec, 'After nested changes primaryRelatedRecs1 relatedParent should be');
  equals(primaryRelatedRecs2.get('relatedParent'), primaryRec, 'After nested changes primaryRelatedRecs2 relatedParent should be');
  equals(primaryRec.get('status'), SC.Record.READY_CLEAN, 'After nested changes primaryRec status should be READY_CLEAN');
  equals(primaryRelatedRec.get('status'), SC.Record.READY_CLEAN, 'After nested changes primaryRelatedRec status should be READY_CLEAN');
  equals(primaryRelatedRecs1.get('status'), SC.Record.READY_CLEAN, 'After nested changes primaryRelatedRecs1 status should be READY_CLEAN');
  equals(primaryRelatedRecs2.get('status'), SC.Record.READY_CLEAN, 'After nested changes primaryRelatedRecs2 status should be READY_CLEAN');
  equals(nestedRec.get('relatedChild'), null, 'After nested changes nestedRec relatedChild should be');
  equals(nestedRelatedRec.get('relatedParent'), null, 'After nested changes nestedRelatedRec relatedParent should be');
  equals(nestedRelatedRecs1.get('relatedParent'), null, 'After nested changes nestedRelatedRecs1 relatedParent should be');
  equals(nestedRelatedRecs2.get('relatedParent'), null, 'After nested changes nestedRelatedRecs2 relatedParent should be');
  equals(nestedRec.get('status'), SC.Record.READY_DIRTY, 'After nested changes relatedChild status should be READY_DIRTY');
  equals(nestedRelatedRec.get('status'), SC.Record.READY_CLEAN, 'After nested changes nestedRelatedRec status should be READY_CLEAN');
  equals(nestedRelatedRecs1.get('status'), SC.Record.READY_CLEAN, 'After nested changes nestedRelatedRecs1 status should be READY_CLEAN');
  equals(nestedRelatedRecs2.get('status'), SC.Record.READY_CLEAN, 'After nested changes nestedRelatedRecs2 status should be READY_CLEAN');

  // commit changes - note: still inside runloop
  nestedStore.commitChanges();
  equals(primaryRec.get('relatedChild'), null, 'After commit changes primaryRec relatedChild should be');
  equals(primaryRelatedRec.get('relatedParent'), null, 'After commit changes primaryRelatedRec relatedParent should be');
  equals(primaryRelatedRecs1.get('relatedParent'), null, 'After commit changes primaryRelatedRecs1 relatedParent should be');
  equals(primaryRelatedRecs2.get('relatedParent'), null, 'After commit changes primaryRelatedRecs2 relatedParent should be');
  equals(primaryRec.get('status'), SC.Record.READY_DIRTY, 'After commit changes primaryRec status should be READY_DIRTY');
  equals(primaryRelatedRec.get('status'), SC.Record.READY_CLEAN, 'After commit changes primaryRelatedRec status should be READY_CLEAN');
  equals(primaryRelatedRecs1.get('status'), SC.Record.READY_CLEAN, 'After commit changes primaryRelatedRecs1 status should be READY_CLEAN');
  equals(primaryRelatedRecs2.get('status'), SC.Record.READY_CLEAN, 'After commit changes primaryRelatedRecs2 status should be READY_CLEAN');

  SC.RunLoop.end();

  delete window.MyApp;
});
