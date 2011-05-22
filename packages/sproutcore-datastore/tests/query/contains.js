// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test parsing of query string
var store, storeKey, foo1, foo2, bar1, bar2, baz, barChild, MyApp, q;
module("SC.Query comparison of records", {
  setup: function() {
    
    SC.run.begin();
    
    // setup dummy app and store
    MyApp = SC.Object.create({
      store: SC.Store.create()
    });
    
    // setup a dummy model
    MyApp.Foo = SC.Record.extend();
    MyApp.Bar = SC.Record.extend();
    MyApp.BarChild = MyApp.Bar.extend();
    MyApp.Baz = SC.Record.extend();
    
    // load some data
    MyApp.store.loadRecords(MyApp.Foo, [
      { guid: 1, firstName: "John", lastName: "Doe", year: 1974 },
      { guid: 2, firstName: "Jane", lastName: "Doe", year: 1975 }
    ]);
    
    MyApp.store.loadRecords(MyApp.Bar, [
      { guid: 3, firstName: "Emily", lastName: "Parker", year: 1975, active: null },
      { guid: 4, firstName: "Johnny", lastName: "Cash", active: false }
    ]);
    
    MyApp.store.loadRecords(MyApp.Baz, [
      { guid: 5, firstName: "Bert", lastName: "Berthold", active: true }
    ]);

    MyApp.store.loadRecords(MyApp.BarChild, [
      { guid: 6, firstName: "Bert", lastName: "Ernie", active: true }
    ]);
    
    SC.run.end();
    
    foo1 = MyApp.store.find(MyApp.Foo,1);
    foo2 = MyApp.store.find(MyApp.Foo,2);
    bar1 = MyApp.store.find(MyApp.Bar,3);
    bar2 = MyApp.store.find(MyApp.Bar,4);
    barChild = MyApp.store.find(MyApp.BarChild, 6);
    baz  = MyApp.store.find(MyApp.Baz,5);
    
  },
  
  teardown: function() {
    MyApp = foo1 = foo2 = bar1 = bar2 = baz = barChild = q = null;
  }
});

// ..........................................................
// BASIC TESTS
// 

test("should only contain records matching recordType or recordTypes", function() {
  
  q = SC.Query.create({ recordType: MyApp.Foo });
  equals(q.contains(foo1), YES, 'q with recordType=Foo should contain record of type Foo');
  equals(q.contains(bar1), NO, 'q with recordType=Foo should NOT contain record of type Bar');
  equals(q.contains(barChild), NO, 'q with recordType=Foo should NOT contain record of type BarChild');
  
  equals(q.contains(baz),  NO, 'q with recordType=Foo should NOT contain record of type Baz');
  
  q = SC.Query.create({ recordTypes: [MyApp.Foo, MyApp.Bar] });
  equals(q.contains(foo1), YES, 'q with recordTypes=Foo,Bar should contain record of type Foo');
  equals(q.contains(bar1), YES, 'q with recordTypes=Foo,Bar should contain record of type Bar');
  equals((barChild instanceof  MyApp.Bar), YES, '(barChild instanceof  MyApp.Bar)');
  
  equals(q.contains(barChild), YES, 'q with recordTypes=Foo,Bar should contain record of type BarChild');

  equals(q.contains(baz),  NO, 'q with recordTypes=Foo,Bar should NOT contain record of type Baz');

  q = SC.Query.create();
  equals(q.contains(foo1), YES, 'no recordType should contain record of type Foo');
  equals(q.contains(bar1), YES, 'no recordType should contain record of type Foo');
  equals(q.contains(barChild), YES, 'no recordType should contain record of type BarChild');
  equals(q.contains(baz), YES, 'no recordType should contain record of type Foo');
  
});

test("should only contain records within parent scope, if one is defined", function() {
  
  q = SC.Query.create({ scope: SC.Set.create().add(foo1).add(bar1) });
  equals(q.contains(foo1), YES, 'scope=[foo1,bar1] should return YES for foo1');
  equals(q.contains(foo2), NO, 'scope=[foo1,bar1] should return NO for foo2');
  equals(q.contains(bar1), YES, 'scope=[bar1] should return YES for bar1');
  equals(q.contains(bar2), NO, 'scope=[foo1,bar1] should return NO for bar2');
});

test("should evaluate query against record", function() {
  q = SC.Query.create({ 
    conditions: "firstName = {firstName}", 
    parameters: { firstName: 'Bert' }
  });
  
  equals(q.contains(bar2), NO, 'q(firstName=Bert) should return NO for bar[firstName=Johnny]');
  equals(q.contains(baz), YES, 'q(firstName=Bert) should return YES for baz[firstName=Bert]');
  equals(q.contains(barChild), YES, 'q(firstName=Bert) should return YES for barChild[firstName=Bert]');

  var p  = { firstName: "Johnny" };
  equals(q.contains(bar2, p), YES, 'q(firstName=Johnny) should return YES for bar[firstName=Johnny]');
  equals(q.contains(baz, p), NO, 'q(firstName=Johnny) should return NO for baz[firstName=Bert]');
  equals(q.contains(barChild, p), NO, 'q(firstName=Johnny) should return NO for barChild[firstName=Bert]');
  
});

test("should consider recordType + query conditions", function() {
  q = SC.Query.create({
    conditions: "firstName = {firstName}",
    recordType: MyApp.Bar,
    parameters: { firstName: "Bert" }
  });
  
  equals(q.contains(bar1), NO, 'should not contain bar1 (wrong firstName)');
  equals(q.contains(bar2), NO, 'should not contain bar2 (wrong firstName)');
  equals(q.contains(barChild), YES, 'should contain barChild');
  equals(q.contains(baz), NO, 'should contain baz (wrong type)');
  
});


