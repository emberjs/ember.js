// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module, ok, equals, same, test, MyApp */

// test core array-mapping methods for ManyArray
var store, storeKey, storeId, rec, storeIds, recs, arrayRec;
module("SC.ManyArray core methods", {
  setup: function() {

    // setup dummy app and store
    MyApp = SC.Object.create({
      store: SC.Store.create()
    });

    // setup a dummy model
    MyApp.Foo = SC.Record.extend({});

    SC.RunLoop.begin();

    // load some data
    storeIds = [1,2,3,4];
    MyApp.store.loadRecords(MyApp.Foo, [
      { guid: 1, firstName: "John", lastName: "Doe", age: 32 },
      { guid: 2, firstName: "Jane", lastName: "Doe", age: 30 },
      { guid: 3, firstName: "Emily", lastName: "Parker", age: 7 },
      { guid: 4, firstName: "Johnny", lastName: "Cash", age: 17 },
      { guid: 50, firstName: "Holder", fooMany: storeIds }
    ]);

    storeKey = MyApp.store.storeKeyFor(MyApp.Foo, 1);

    // get record
    rec = MyApp.store.materializeRecord(storeKey);
    storeId = rec.get('id');

    // get many array.
    arrayRec = MyApp.store.materializeRecord(MyApp.store.storeKeyFor(MyApp.Foo, 50));

    recs = SC.ManyArray.create({
      record: arrayRec,
      propertyName: "fooMany",
      recordType: MyApp.Foo,
      isEditable: YES
    });
    arrayRec.relationships = [recs];
  },

  teardown: function() {
    SC.RunLoop.end();
  }
});

// ..........................................................
// LENGTH
//

test("should pass through length", function() {
  equals(recs.get('length'), storeIds.length, 'rec should pass through length');
});

test("changing storeIds length should change length of rec array also", function() {

  var oldlen = recs.get('length');

  storeIds.pushObject(SC.Store.generateStoreKey()); // change length

  ok(storeIds.length > oldlen, 'precond - storeKeys.length should have changed');
  equals(recs.get('length'), storeIds.length, 'rec should pass through length');
});

// ..........................................................
// objectAt
//

test("should materialize record for object", function() {
  equals(storeIds[0], storeId, 'precond - storeIds[0] should be storeId');
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');
});

test("reading past end of array length should return undefined", function() {
  equals(recs.objectAt(2000), undefined, 'recs.objectAt(2000) should be undefined');
});

test("modifying the underlying storeId should change the returned materialized record", function() {
  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // create a new record.
  var rec2 = MyApp.store.createRecord(MyApp.Foo, { guid: 5, firstName: "Fred" });
  var storeId2 = rec2.get('id');

  // add to beginning of storeKey array
  storeIds.unshiftObject(storeId2);
  equals(recs.get('length'), 5, 'should now have length of 5');
  equals(recs.objectAt(0), rec2, 'objectAt(0) should return new record');
  equals(recs.objectAt(1), rec, 'objectAt(1) should return old record');
});

test("reading a record not loaded in store should trigger retrieveRecord", function() {
  var callCount = 0;

  // patch up store to record a call and to make it look like data is not
  // loaded.

  MyApp.store.removeDataHash(storeKey, SC.Record.EMPTY);
  MyApp.store.retrieveRecord = function() { callCount++; };

  var rec = recs.objectAt(0);
  equals(MyApp.store.readStatus(rec), SC.Record.EMPTY, 'precond - storeKey must not be loaded');

  equals(callCount, 1, 'store.retrieveRecord() should have been called');
});

// ..........................................................
// replace()
//

test("adding a record to the ManyArray should pass through storeIds", function() {

  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // create a new record.
  var rec2 = MyApp.store.createRecord(MyApp.Foo, { guid: 5, firstName: "rec2" });
  var storeId2 = rec2.get('id');

  // add record to beginning of record array
  recs.unshiftObject(rec2);

  // verify record array
  equals(recs.get('length'), 5, 'should now have length of 2');
  equals(recs.objectAt(0), rec2, 'recs.objectAt(0) should return new record');
  equals(recs.objectAt(1), rec, 'recs.objectAt(1) should return old record');

  // verify storeKeys
  storeIds = arrayRec.readAttribute('fooMany'); // array might have changed
  equals(storeIds.objectAt(0), storeId2, 'storeKeys[0] should return new storeKey');
  equals(storeIds.objectAt(1), storeId, 'storeKeys[1] should return old storeKey');
});

// ..........................................................
// Property Observing
//

test("changing the underlying storeIds should notify observers of records", function() {

  // setup observer
  var obj = SC.Object.create({
    cnt: 0,
    observer: function() { this.cnt++; }
  });
  recs.addObserver('[]', obj, obj.observer);

  // now modify storeKeys
  storeIds.pushObject(5);
  equals(obj.cnt, 1, 'observer should have fired after changing storeKeys');
});

test("swapping storeIds array should change ManyArray and observers", function() {

  // setup alternate storeKeys
  var rec2 = MyApp.store.createRecord(MyApp.Foo, { guid: 5, firstName: "rec2" });
  var storeId2 = rec2.get('id');
  var storeIds2 = [storeId2];

  // setup observer
  var obj = SC.Object.create({
    cnt: 0,
    observer: function() { this.cnt++; }
  });
  recs.addObserver('[]', obj, obj.observer);

  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');

  // now swap storeKeys
  obj.cnt = 0 ;
  arrayRec.writeAttribute('fooMany', storeIds2);

  SC.RunLoop.end();
  SC.RunLoop.begin();

  // verify observer fired and record changed
  equals(obj.cnt, 1, 'observer should have fired after swap');
  equals(recs.objectAt(0), rec2, 'recs.objectAt(0) should return new rec');

  // modify storeKey2, make sure observer fires and content changes
  obj.cnt = 0;
  storeIds2.unshiftObject(storeId);
  equals(obj.cnt, 1, 'observer should have fired after edit');
  equals(recs.get('length'), 2, 'should reflect new length');
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should return pushed rec');

});

test("reduced properties", function() {
  equals(recs.get('@sum(age)'), 32+30+7+17, 'sum reducer should return the correct value');
  equals(recs.get('@max(age)'), 32, 'max reducer should return the correct value');
  equals(recs.get('@min(age)'), 7, 'min reducer should return the correct value');
  equals(recs.get('@average(age)'), (32+30+7+17)/4.0, 'average reducer should return the correct value');
});

test("Test that _findInsertionLocation returns the correct location.", function () {
  var location,
    newRec,
    sortByFirstName = function (a, b) {
      if (a.get('firstName') == b.get('firstName')) return 0;
      else if (a.get('firstName') < b.get('firstName')) return -1;
      else return 1;
    };

  // Order the many array manually by firstName.
  arrayRec.set('fooMany', [3,2,1,4]);
  recs._storeIdsContentDidChange(0, 4, 4);

  // Check the insertion location of a record that should appear first.
  newRec = SC.Object.create({ guid: 5, firstName: "Adam", lastName: "Doe", age: 15 });
  location = recs._findInsertionLocation(newRec, 0, recs.get('length') - 1, sortByFirstName);

  equals(location, 0, "The insertion location should be");

  // Check the insertion location of a record that should appear in the middle.
  newRec = SC.Object.create({ guid: 5, firstName: "Farmer", lastName: "Doe", age: 95 });
  location = recs._findInsertionLocation(newRec, 0, recs.get('length') - 1, sortByFirstName);

  equals(location, 1, "The insertion location should be");

  newRec = SC.Object.create({ guid: 5, firstName: "Jen", lastName: "Doe", age: 95 });
  location = recs._findInsertionLocation(newRec, 0, recs.get('length') - 1, sortByFirstName);

  equals(location, 2, "The insertion location should be");

  newRec = SC.Object.create({ guid: 5, firstName: "Johnny", lastName: "Doe", age: 95 });
  location = recs._findInsertionLocation(newRec, 0, recs.get('length') - 1, sortByFirstName);

  equals(location, 3, "The insertion location should be");

  // Check the insertion location of a record that should appear last.
  newRec = SC.Object.create({ guid: 5, firstName: "Zues", lastName: "Doe", age: 95 });
  location = recs._findInsertionLocation(newRec, 0, recs.get('length') - 1, sortByFirstName);

  equals(location, 4, "The insertion location should be");
});

// ..........................................................
// New records
//

test("Test new record support.", function () {
  var newRec = MyApp.store.createRecord(MyApp.Foo, { firstName: "Adam", lastName: "Doe", age: 15 }),
    holder = MyApp.store.find(MyApp.Foo, 50);

  recs.set('supportNewRecords', false);
  try {
    recs.pushObject(newRec);
    ok(false, "Should not be able to push a record without an id without supportNewRecords.");
  } catch (ex) {
    ok(true, "Should not be able to push a record without an id without supportNewRecords.");
  }

  recs.set('supportNewRecords', true);
  try {
    recs.pushObject(newRec);
    ok(true, "Should be able to push a record without an id normally.");
  } catch (ex) {
    ok(false, "Should be able to push a record without an id normally.");
  }

  ok(newRec.hasObserverFor('id'), "The transient record should have an observer on its id.");
  equals(newRec.get('id'), undefined, "The transient record should still have an undefined id.");
  equals(recs.objectAt(4), newRec, "The transient record should be accessible in the many array.");
  equals(holder.get('status'), SC.Record.READY_CLEAN, "The record should not be dirtied when the transient record is added.");

  SC.run(function () {
    newRec.set('id', 200);
  });

  ok(!newRec.hasObserverFor('id'), "The post-transient record should not have an observer on its id.");
  equals(newRec.get('id'), 200, "The post-transient record should have an id of 200.");
  equals(holder.get('status'), SC.Record.READY_DIRTY, "The record should be dirtied when the relationship is actually updated.");

});
