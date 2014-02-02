// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, dataHashes;
var Person;


module("SC.Store#loadRecord", {
  setup: function() {

    Person = SC.Record.extend({
      first: SC.Record.attr(String, { isRequired: YES}),
      last: SC.Record.attr(String),
      age: SC.Record.attr(Number),
      isAlive: SC.Record.attr(Boolean)
    });

    SC.RunLoop.begin();

    store = SC.Store.create();

    dataHashes = [

    {
      guid: 1,
      first: "John",
      last: "Sproutish",
      age: 35,
      isAlive: YES},

    {
      guid: 2,
      first: "Sarah",
      last: "Coop",
      age: 28,
      isAlive: YES }];

    SC.RunLoop.end();
  }
});

test("loadRecord loads new / update existing record in store", function() {
  var aDataHash = dataHashes[0];
  var storeKey = store.loadRecord(Person, aDataHash);
  ok(storeKey, "A store key is generated for a new record.");

  var doesStoreKeyResolveToPK = aDataHash.guid === store.idFor(storeKey);
  ok(doesStoreKeyResolveToPK, "The storeKey resolves to the correct Primary Key");

  var isStatusCorrect = store.peekStatus(storeKey) & SC.Record.READY_CLEAN;
  ok(isStatusCorrect, "Record is in SC.Record.READY_CLEAN state after loading into store.");

  // Change the record
  aDataHash['age'] = 40;
  var storeKeyAfterUpdate = store.loadRecord(Person, aDataHash);
  ok(storeKey === storeKeyAfterUpdate, "When the same record is loaded a second time its store key remains unchanged.");

  var record = store.materializeRecord(storeKey);
  ok(record.get('age') === 40, "Record in store is updated with new values from data hash.");
});

test("The data hash of the record should be correct BEFORE the status changes.", function () {
  var rec1;
  var aDataHash = dataHashes[0];
  var storeKey = store.loadRecord(Person, aDataHash);

  store.set('dataSource', SC.DataSource.create({
    retrieveRecords: function () { return true; }
  }));

  //create record
  rec1 = store.materializeRecord(storeKey);

  rec1.addObserver('status', function () {
    if (this.get('status') === SC.Record.READY_CLEAN) {
      equals(this.get('last'), "Post-Sproutish", "The string attribute should be correct since the status has updated.");
    }
  });

  SC.run(function () {
    rec1.refresh();
  });

  store.loadRecord(Person, {guid: 1 , first: "John", last: "Post-Sproutish", age: 35 , isAlive: true}, 1);
});
