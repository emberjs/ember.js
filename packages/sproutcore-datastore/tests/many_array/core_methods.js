// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

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
    
    SC.run.begin();
    
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
    storeId = get(rec, 'id');
    
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
    SC.run.end();
  }
});

// ..........................................................
// LENGTH
// 

test("should pass through length", function() {
  equals(get(recs, 'length'), storeIds.length, 'rec should pass through length');  
});

test("changing storeIds length should change length of rec array also", function() {

  var oldlen = get(recs, 'length');
  
  storeIds.pushObject(SC.Store.generateStoreKey()); // change length
  
  ok(storeIds.length > oldlen, 'precond - storeKeys.length should have changed');
  equals(get(recs, 'length'), storeIds.length, 'rec should pass through length');    
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
  var storeId2 = get(rec2, 'id');
  
  // add to beginning of storeKey array
  storeIds.unshiftObject(storeId2);
  equals(get(recs, 'length'), 5, 'should now have length of 5');
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
  var storeId2 = get(rec2, 'id');
  
  // add record to beginning of record array
  recs.unshiftObject(rec2);
  
  // verify record array
  equals(get(recs, 'length'), 5, 'should now have length of 2');
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
  SC.addObserver(recs, '[]', obj, obj.observer); 
  
  // now modify storeKeys
  storeIds.pushObject(5);
  equals(obj.cnt, 1, 'observer should have fired after changing storeKeys');
});

test("swapping storeIds array should change ManyArray and observers", function() {

  // setup alternate storeKeys
  var rec2 = MyApp.store.createRecord(MyApp.Foo, { guid: 5, firstName: "rec2" });
  var storeId2 = get(rec2, 'id');
  var storeIds2 = [storeId2];
  
  // setup observer
  var obj = SC.Object.create({
    cnt: 0,
    observer: function() { this.cnt++; }
  });
  SC.addObserver(recs, '[]', obj, obj.observer); 
  
  // read record once to make it materialized
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should materialize record');  
  
  // now swap storeKeys
  obj.cnt = 0 ;
  arrayRec.writeAttribute('fooMany', storeIds2);

  SC.run.end();
  SC.run.begin();
  
  // verify observer fired and record changed
  equals(obj.cnt, 1, 'observer should have fired after swap');
  equals(recs.objectAt(0), rec2, 'recs.objectAt(0) should return new rec');
  
  // modify storeKey2, make sure observer fires and content changes
  obj.cnt = 0;
  storeIds2.unshiftObject(storeId);
  equals(obj.cnt, 1, 'observer should have fired after edit');
  equals(get(recs, 'length'), 2, 'should reflect new length');
  equals(recs.objectAt(0), rec, 'recs.objectAt(0) should return pushed rec');  

});
