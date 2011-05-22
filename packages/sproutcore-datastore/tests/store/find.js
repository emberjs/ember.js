// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test querying through find() on the store
module("SC.Query querying find() on a store", {
  setup: function() {
    SC.run.begin();
    // setup dummy app and store
    MyApp = SC.Object.create({});
    
    // setup a dummy model
    MyApp.Foo = SC.Record.extend();
    MyApp.Bar = SC.Record.extend();
    
    // setup data source that just returns cached storeKeys
    MyApp.DataSource = SC.DataSource.create({

      fetch: function(store, query) {
        this.query = query;
        this.store = store;
        this.fetchCount++ ;
        
        // used by tests to verify remote queries
        if (get(query, 'location') === SC.Query.REMOTE) {
          if (get(query, 'recordType') === MyApp.Foo) {
            store.loadQueryResults(query, get(this, 'storeKeys'));    
          }
        }
        
        return YES ;
      },
      
      reset: function() {
        this.query = this.store = null ;
        this.fetchCount = this.prepareCount = 0 ;
      },
      
      fetchEquals: function(store, query, count, desc) {
        if (desc===undefined && typeof count === 'string') {
          desc = count;  count = undefined;
        }
        if (count===undefined) count = 1; 
        
        equals(this.store, store, desc + ': should get store');
        equals(this.query, query, desc + ': should get query');
        equals(this.fetchCount, count, desc + ': should get count');
      },
      
      destroyRecord: function(store, storeKey){
        store.dataSourceDidDestroy(storeKey);
        return YES;
      }
      
    });
    
    MyApp.store = SC.Store.create().from(MyApp.DataSource);
    
    var records = [
      { guid: 1, firstName: "John", lastName: "Doe", married: true },
      { guid: 2, firstName: "Jane", lastName: "Doe", married: false },
      { guid: 3, firstName: "Emily", lastName: "Parker", bornIn: 1975, married: true },
      { guid: 4, firstName: "Johnny", lastName: "Cash", married: true },
      { guid: 5, firstName: "Bert", lastName: "Berthold", married: true }
    ];
    
    // load some data
    MyApp.DataSource.storeKeys = MyApp.store.loadRecords(MyApp.Foo, records);
    SC.run.end();
    
    SC.run.begin();
    // for sanity check, load two record types
    MyApp.store.loadRecords(MyApp.Bar, records);
    SC.run.end();
    
  },
  
  teardown: function() {
    MyApp = null ;
    SC.Record.subclasses.clear(); //reset
  }
  
});

// ..........................................................
// FINDING SINGLE RECORDS
// 

test("find(recordType, id)", function() {
  
  equals(get(MyApp.store.find('MyApp.Foo', 1), 'firstName'), 'John', 'should return foo(1)');
  equals(get(MyApp.store.find(MyApp.Foo, 1), 'firstName'), 'John', 'should return foo(1)');  
});

test("find(record)", function() {
  
  var rec1 = MyApp.store.find(MyApp.Foo, 1);
  equals(MyApp.store.find(rec1), rec1, 'find(rec1) should return rec1');
  
  var rec2 = MyApp.store.chain().find(rec1);
  ok(rec2 !== rec1, 'nested.find(rec1) should not return same instance');
  equals(get(rec2, 'storeKey'), get(rec1, 'storeKey'), 'nested.find(rec1) should return same record in nested store');
});

// ..........................................................
// RECORD ARRAY CACHING
// 
 
test("caching for a single store", function() {
  var r1 = MyApp.store.find(MyApp.Foo);  
  var r2 = MyApp.store.find(MyApp.Foo);
  ok(!!r1, 'should return a record array');
  ok(r1.isEnumerable, 'returned item should be enumerable');
  equals(get(r1, 'store'), MyApp.store, 'return object should be owned by store');
  equals(r2, r1, 'should return same record array for multiple calls');
});

test("find() caching for a chained store", function() {
  var r1 = MyApp.store.find(MyApp.Foo);  
  
  var child = MyApp.store.chain();
  var r2 = child.find(MyApp.Foo);
  var r3 = child.find(MyApp.Foo);

  ok(!!r1, 'should return a record array from base store');
  equals(get(r1, 'store'), MyApp.store, 'return object should be owned by store');
  
  ok(!!r2, 'should return a recurd array from child store');
  equals(get(r2, 'store'), child, 'return object should be owned by child store');
  
  ok(r2 !== r1, 'return value for child store should not be same as parent');
  equals(r3, r2, 'return value from child store should be the same after multiple calls');
  
  // check underlying queries
  ok(!!get(r1, 'query'), 'record array should have a query');
  equals(get(r2, 'query'), get(r1, 'query'), 'record arrays from parent and child stores should share the same query');
});

test("data source must get the right calls", function() {
  var ds = get(MyApp.store, 'dataSource');
  
  ds.reset();  
  var records = MyApp.store.find(MyApp.Foo);
  var q = SC.Query.local(MyApp.Foo);
  ds.fetchEquals(MyApp.store, q, 'after fetch');
});

// ..........................................................
// RECORD PROPERTIES
// 

test("should find records based on boolean", function() {
  SC.run.begin();
  var q = SC.Query.local(MyApp.Foo, "married=YES");
  var records = MyApp.store.find(q);
  equals(get(records, 'length'), 4, 'record length should be 4');
  SC.run.end();
});

test("should find records based on query string", function() {
  
  SC.run.begin();
  var q = SC.Query.local(MyApp.Foo, { conditions:"firstName = 'John'" });
  var records = MyApp.store.find(q);
  equals(get(records, 'length'), 1, 'record length should be 1');
  equals(get(records.objectAt(0), 'firstName'), 'John', 'name should be John');
  SC.run.end();
});

test("should find records based on SC.Query", function() {
  var q = SC.Query.create({
    recordType: MyApp.Foo, 
    conditions:"firstName = 'Jane'"
  });
  
  var records = MyApp.store.find(q);
  
  equals(get(records, 'length'), 1, 'record length should be 1');
  equals(get(records.objectAt(0), 'firstName'), 'Jane', 'name should be Jane');
});

test("modifying a record should update RecordArray automatically", function() {
  var q    = SC.Query.local(MyApp.Foo, "firstName = 'Jane'"),
      recs = MyApp.store.find(q);
      
  equals(get(recs, 'length'), 1, 'record length should be 1');
  equals(get(recs.objectAt(0), 'firstName'), 'Jane', 'name should be Jane');
  
  SC.run.begin();

  var r2 = MyApp.store.find(MyApp.Foo, 3);
  ok(get(r2, 'firstName') !== 'Jane', 'precond - firstName is not Jane');
  set(r2, 'firstName', 'Jane');

  SC.run.end();
  
  equals(get(recs, 'length'), 2, 'record length should increase');
  same(recs.getEach('firstName'), ['Jane', 'Jane'], 'check all firstNames are Jane');
  
  // try the other direction...
  SC.run.begin();
  set(r2, 'firstName', 'Ester');
  SC.run.end(); 
  
  equals(get(recs, 'length'), 1, 'record length should decrease');

});

test("should find records based on SC.Query without recordType", function() {
  
  var q = SC.Query.local(SC.Record, "lastName = 'Doe'");
  
  var records = MyApp.store.find(q);
  equals(get(records, 'length'), 4, 'record length should be 2');

  same(records.getEach('firstName'), 'John John Jane Jane'.w(), 'firstNames should match');
});

test("should find records within a passed record array", function() {

  SC.run.begin();
  
  var q = SC.Query.create({ 
    recordType: MyApp.Foo, 
    conditions: "firstName = 'Emily'" 
  });

  var recArray = MyApp.store.find(MyApp.Foo);
  var records  = recArray.find(q);
  
  equals(get(records, 'length'), 1, 'record length should be 1');
  equals(get(records.objectAt(0), 'firstName'), 'Emily', 'name should be Emily');

  SC.run.end();
  
});

test("sending a new store key array from the data source should update record array", function() {
  
  var q       = SC.Query.remote(MyApp.Foo),
      records = MyApp.store.find(q);
  
  SC.run.begin();
  equals(get(records, 'length'), 5, 'record length should be 5');
  SC.run.end();
  
  var newStoreKeys = MyApp.DataSource.storeKeys.copy();
  newStoreKeys.pop();
  
  // .replace() will call .enumerableContentDidChange()
  SC.run.begin();
  MyApp.store.loadQueryResults(q, newStoreKeys);
  SC.run.end();
  
  equals(get(records, 'length'), 4, 'record length should be 4');

});


test("loading more data into the store should propagate to record array", function() {
  
  var records = MyApp.store.find(MyApp.Foo);
  
  equals(get(records, 'length'), 5, 'record length before should be 5');

  SC.run.begin();
  
  var newStoreKeys = MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 10, firstName: "John", lastName: "Johnson" }
  ]);
  
  SC.run.end();
  
  equals(get(records, 'length'), 6, 'record length after should be 6');
});

test("loading more data into the store should propagate to record array with query", function() {

  var q = SC.Query.local(MyApp.Foo, "firstName = 'John'"),
      records = MyApp.store.find(q);
  
  equals(get(records, 'length'), 1, 'record length before should be 1');

  SC.run.begin();
  var newStoreKeys = MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 10, firstName: "John", lastName: "Johnson" }
  ]);
  SC.run.end();
  
  // .replace() will call .enumerableContentDidChange()
  // and should fire original SC.Query again
  equals(get(records, 'length'), 2, 'record length after should be 2');
  
  // subsequent updates to store keys should also work
  SC.run.begin();
  var newStoreKeys2 = MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 11, firstName: "John", lastName: "Norman" }
  ]);
  SC.run.end();
  
  equals(get(records, 'length'), 3, 'record length after should be 3');
});

test("Loading records after SC.Query should show up", function() {
  
  var q = SC.Query.local(MyApp.Foo, "firstName = 'John'"),
      records = MyApp.store.find(q);
      
  equals(get(records, 'length'), 1, 'record length should be 1');
  equals(get(records.objectAt(0), 'firstName'), 'John', 'name should be John');
  
  var recordsToLoad = [
    { guid: 20, firstName: "John", lastName: "Johnson" },
    { guid: 21, firstName: "John", lastName: "Anderson" },
    { guid: 22, firstName: "Barbara", lastName: "Jones" }
  ];
  
  SC.run.begin();
  MyApp.store.loadRecords(MyApp.Foo, recordsToLoad);
  SC.run.end();
  
  equals(get(records, 'length'), 3, 'record length should be 3');
  
  equals(get(records.objectAt(0), 'firstName'), 'John', 'name should be John');
  equals(get(records.objectAt(1), 'firstName'), 'John', 'name should be John');
  equals(get(records.objectAt(2), 'firstName'), 'John', 'name should be John');
});

test("Loading records after getting empty record array based on SC.Query should update", function() {
  
  var q = SC.Query.local(MyApp.Foo, "firstName = 'Maria'");
  var records = MyApp.store.find(q);
  equals(get(records, 'length'), 0, 'record length should be 0');
  
  var recordsToLoad = [
    { guid: 20, firstName: "Maria", lastName: "Johnson" }
  ];
  
  SC.run.begin();
  MyApp.store.loadRecords(MyApp.Foo, recordsToLoad);
  SC.run.end();
  
  equals(get(records, 'length'), 1, 'record length should be 1');
  
  equals(get(records.objectAt(0), 'firstName'), 'Maria', 'name should be Maria');  
});

test("Changing a record should make it show up in RecordArrays based on SC.Query", function() {
  
  var q, records, record;
  
  q = SC.Query.local(MyApp.Foo, "firstName = 'Maria'");
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 0, 'record length should be 0');
  
  SC.run.begin();
  record = MyApp.store.find(MyApp.Foo, 1);
  set(record, 'firstName', 'Maria');
  SC.run.end();
  
  equals(get(records, 'length'), 1, 'record length should be 1');
  equals(get(records.objectAt(0), 'firstName'), 'Maria', 'name should be Maria');
});

test("Deleting a record should make the RecordArray based on SC.Query update accordingly", function() {
  
  var q, records;

  q = SC.Query.local(MyApp.Foo, "firstName = 'John'");
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 1, 'record length should be 1');
  
  SC.run.begin();
  records.objectAt(0).destroy();
  SC.run.end();
  
  equals(get(records, 'length'), 0, 'record length should be 0');
});

test("Using find() with SC.Query on store with no data source should work", function() {

  var q, records, recordsToLoad;
  
  SC.run.begin();
  
  // create a store with no data source
  MyApp.store3 = SC.Store.create();
  
  q = SC.Query.local(MyApp.Foo, "firstName = 'John'");
  records = MyApp.store3.find(q);
  equals(get(records, 'length'), 0, 'record length should be 0');
  
  recordsToLoad = [
    { guid: 20, firstName: "John", lastName: "Johnson" },
    { guid: 21, firstName: "John", lastName: "Anderson" },
    { guid: 22, firstName: "Barbara", lastName: "Jones" }
  ];

  MyApp.store3.loadRecords(MyApp.Foo, recordsToLoad);
  
  SC.run.end();
  
  equals(get(records, 'length'), 2, 'record length should be 2');  
});

test("Using orderBy in SC.Query returned from find()", function() {
  
  var q, records;
  
  q = SC.Query.local(MyApp.Foo, { orderBy: "firstName ASC" });
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 5, 'record length should be 5');
  
  same(records.getEach('firstName'), ["Bert", "Emily", "Jane", "John", "Johnny"], 'first name should be properly sorted');  
});

test("Using orderBy in SC.Query returned from find() and loading more records to original store key array", function() {

  var q, records, newStoreKeys2;
  
  q = SC.Query.local(MyApp.Foo, { orderBy:"firstName ASC" });
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 5, 'record length should be 5');
  
  equals(get(records.objectAt(0), 'firstName'), 'Bert', 'name should be Bert');
  equals(get(records.objectAt(4), 'firstName'), 'Johnny', 'name should be Johnny');
  
  SC.run.begin();
  newStoreKeys2 = MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 11, firstName: "Anna", lastName: "Petterson" }
  ]);
  SC.run.end();
  
  equals(get(records.objectAt(0), 'firstName'), 'Anna', 'name should be Anna');
  equals(get(records.objectAt(1), 'firstName'), 'Bert', 'name should be Bert');
  equals(get(records.objectAt(5), 'firstName'), 'Johnny', 'name should be Johnny');
  
});


test("Using orderBy in SC.Query and loading more records to the store", function() {

  var q, records;
  
  SC.run.begin();
  q = SC.Query.local(MyApp.Foo, { orderBy:"firstName ASC" });
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 5, 'record length should be 5');
  equals(get(records.objectAt(0), 'firstName'), 'Bert', 'name should be Bert');
  
  MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 11, firstName: "Anna", lastName: "Petterson" }
  ]);
  SC.run.end();
  
  equals(get(records, 'length'), 6, 'record length should be 6');
  
  equals(get(records.objectAt(0), 'firstName'), 'Anna', 'name should be Anna');
  equals(get(records.objectAt(5), 'firstName'), 'Johnny', 'name should be Johnny');
  
});

test("Chaining find() queries", function() {
  
  var q, records, q2, records2;
  
  q = SC.Query.local(MyApp.Foo, "lastName='Doe'");
  records = MyApp.store.find(q);
  equals(get(records, 'length'), 2, 'record length should be 2');
  
  q2 = SC.Query.local(MyApp.Foo, "firstName='John'");
  records2 = records.find(q2);

  equals(get(records2, 'length'), 1, 'record length should be 1');  
  equals(get(records2.objectAt(0), 'firstName'), 'John', 'name should be John');
  
});

test("Chaining find() queries and loading more records", function() {

  var q, q2, records;
  
  SC.run.begin();
  q = SC.Query.local(MyApp.Foo, "lastName='Doe'");
  q2 = SC.Query.local(MyApp.Foo, "firstName='John'");
  
  records = MyApp.store.find(q).find(q2);
  equals(get(records, 'length'), 1, 'record length should be 1');
  
  MyApp.store.loadRecords(MyApp.Foo, [
    { guid: 11, firstName: "John", lastName: "Doe" }
  ]);
  SC.run.end();
  
  equals(get(records, 'length'), 2, 'record length should be 2');  
});


module("create record");
 
test("creating record appears in future find()", function() {
  var Rec, store, r;
  
  Rec = SC.Record.extend({ title: SC.Record.attr(String) });
  store = SC.Store.create();
  
  SC.run(function() {
    store.loadRecords(Rec, 
      [ { title: "A", guid: 1 }, 
        { title: "B", guid: 2 } ]);
  });
  
  equals(get(store.find(Rec), 'length'), 2, 'should have two initial record');

  SC.run(function() {
    store.createRecord(Rec, { title: "C" });
    
    // NOTE: calling find() here should flush changes to the record arrays
    // so that find() always returns an accurate result
    r = store.find(Rec);
    equals(get(r, 'length'), 3, 'should return additional record');
  });

  r = store.find(Rec);
  equals(get(r, 'length'), 3, 'should return additional record');  
});

