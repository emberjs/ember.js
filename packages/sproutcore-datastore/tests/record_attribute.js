// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test core array-mapping methods for RecordArray with RecordAttribute
var storeKeys, rec, rec2, rec3, bar, MyApp;

module("SC.RecordAttribute core methods", {
  setup: function() {

    MyApp = SC.Object.create({
      store: SC.Store.create()
    });
    
    // stick it to the window object so that objectForPropertyPath works
    window.MyApp = MyApp;
    
    MyApp.Foo = SC.Record.extend({
      
      // test simple reading of a pass-through prop
      firstName: SC.Record.attr(String),

      // test mapping to another internal key
      otherName: SC.Record.attr(String, { key: "firstName" }),
      
      // test mapping Date
      date: SC.Record.attr(Date),
      nonIsoDate: SC.Record.attr(Date, { useIsoDate: false }),

      // test SC.DateTimes
      dateTime: SC.Record.attr(SC.DateTime),
      
      // test Array
      anArray: SC.Record.attr(Array),
      
      // test Object
      anObject: SC.Record.attr(Object),
                                 
      // test Number
      aNumber: SC.Record.attr(Number),
      
      // used to test default value
      defaultValue: SC.Record.attr(String, {
        defaultValue: "default"
      }),
      
      // used to test default value
      defaultComputedValue: SC.Record.attr(Number, {
        defaultValue: function() {
          return Math.floor(Math.random()*3+1);
        }
      }),
      
      // test toOne relationships
      relatedTo: SC.Record.toOne('MyApp.Foo'),
      
      // test toOne relationship with computed type
      relatedToComputed: SC.Record.toOne(function() {
        // not using get() to avoid another transform which will 
        // trigger an infinite loop
        return (this.readAttribute('relatedToComputed').indexOf("foo")===0) ? MyApp.Foo : MyApp.Bar;
      }),
      
      // test readONly
      readOnly: SC.Record.attr(String, { isEditable: NO })
      
    });

    MyApp.Bar = SC.Record.extend({
      parent: SC.Record.toOne('MyApp.Foo', { aggregate: YES }),
      relatedMany: SC.Record.toMany('MyApp.Foo', { aggregate: YES })
    });

    SC.run.begin();
    storeKeys = MyApp.store.loadRecords(MyApp.Foo, [
      { 
        guid: 'foo1', 
        firstName: "John", 
        lastName: "Doe", 
        date: "2009-03-01T20:30-08:00",
        dateTime: new Date(1235939425000),
        anArray: ['one', 'two', 'three'],
        anObject: { 'key1': 'value1', 'key2': 'value2' },
        aNumber: '123',
        readOnly: 'foo1'
      },
      
      { 
        guid: 'foo2', 
        firstName: "Jane", 
        lastName: "Doe", 
        relatedTo: 'foo1',
        relatedToAggregate: 'bar1',
        dateTime: "2009-03-01T20:30:25Z",
        anArray: 'notAnArray',
        anObject: 'notAnObject',
        aNumber: '123',
        nonIsoDate: "2009/06/10 8:55:50 +0000"
      },
      
      { 
        guid: 'foo3', 
        firstName: "Alex", 
        lastName: "Doe", 
        relatedToComputed: 'bar1',
        dateTime: SC.DateTime.create(1235939425000),
        anArray: ['one', 'two', 'three'],
        anObject: { 'key1': 'value1', 'key2': 'value2' },
        aNumber: '123'
      }
      
    ]);
    
    MyApp.store.loadRecords(MyApp.Bar, [
      { guid: 'bar1', city: "Chicago", parent: 'foo2', relatedMany: ['foo1', 'foo2'] }
    ]);
    
    SC.run.end();
    
    rec = MyApp.store.find(MyApp.Foo, 'foo1');
    rec2 = MyApp.store.find(MyApp.Foo, 'foo2');
    rec3 = MyApp.store.find(MyApp.Foo, 'foo3');
    
    bar = MyApp.store.find(MyApp.Bar, 'bar1');
    equals(rec.storeKey, storeKeys[0], 'should find record');
    
  },

  teardown: function() {
    window.MyApp = MyApp = undefined;
  }
});

// ..........................................................
// READING
// 

test("pass-through should return builtin value" ,function() {
  equals(get(rec, 'firstName'), 'John', 'reading prop should get attr value');
});

test("returns default value if underyling value is empty", function() {
  equals(get(rec, 'defaultValue'), 'default', 'reading prop should return default value');
});

test("naming a key should read alternate attribute", function() {
  equals(get(rec, 'otherName'), 'John', 'reading prop otherName should get attr from firstName');
});

test("getting a number", function() {
  equals((typeof get(rec, 'aNumber')), 'number', 'reading prop aNumber should get attr as number');
});

test("getting an array and object", function() {
  equals(get(rec, 'anArray').length, 3, 'reading prop anArray should get attr as array');
  equals((typeof get(rec, 'anObject')), 'object', 'reading prop anObject should get attr as object');
});

test("getting an array and object attributes where underlying value is not", function() {
  equals(get(rec2, 'anArray').length, 0, 'reading prop anArray should return empty array');
  equals((typeof get(rec2, 'anObject')), 'object', 'reading prop anObject should return empty object');
});

test("reading date should parse ISO date", function() {
  var d = new Date(1235968200000); // should be proper date
  equals(get(rec, 'date').toString(), d.toString(), 'should have matched date');
});

test("reading dateTime should parse ISO date", function() {
  var ms = 1235939425000;
  equals(SC.getPath(rec, 'dateTime.milliseconds'), ms, 'should have parsed Date properly');
  equals(SC.getPath(rec2, 'dateTime.milliseconds'), ms, 'should have parsed String properly');
  equals(SC.getPath(rec3, 'dateTime.milliseconds'), ms, 'should have parsed SC.DateTime properly');
});

test("reading date should parse non-ISO date", function() {
  var d = new Date(1244624150000);
  equals(get(rec2, 'nonIsoDate').toString(), d.toString(), 'should have matched date');
});

test("reading no date should produce null", function() {
  var d = new Date(1235968200000); // should be proper date
  equals(get(rec2, 'date'), null, 'should have yielded null');
});

test("reading computed default value", function() {
  var value = get(rec, 'defaultComputedValue');
  var validValues = [1,2,3,4];
  ok(validValues.indexOf(value)!==-1, 'should have a value from 1 through 4');
});

// ..........................................................
// WRITING
// 

test("writing pass-through should simply set value", function() {
  set(rec, "firstName", "Foo");
  equals(rec.readAttribute("firstName"), "Foo", "should write string");

  set(rec, "firstName", 23);
  equals(rec.readAttribute("firstName"), 23, "should write number");

  set(rec, "firstName", YES);
  equals(rec.readAttribute("firstName"), YES, "should write bool");
  
});

test("writing when isEditable is NO should ignore", function() {
  var v = get(rec, 'readOnly');
  set(rec, 'readOnly', 'NEW VALUE');
  equals(get(rec, 'readOnly'), v, 'read only value should not change');
});

test("writing a value should override default value", function() {
  equals(get(rec, 'defaultValue'), 'default', 'precond - returns default');
  set(rec, 'defaultValue', 'not-default');
  equals(get(rec, 'defaultValue'), 'not-default', 'newly written value should replace default value');
});

test("writing a string to a number attribute should store a number" ,function() {
     equals(set(rec, 'aNumber', "456"), "456", 'returns reciever');
     equals(get(rec, 'aNumber'), 456, 'should have new value');
     equals(typeof get(rec, 'aNumber'), 'number', 'new value should be a number');
});

test("writing a date should generate an ISO date" ,function() {
  var date = new Date(1238650083966);

  // Work with timezones
  var utcDate = new Date(Number(date) + (date.getTimezoneOffset() * 60000)); // Adjust for timezone offset
  utcDate.getTimezoneOffset = function(){ return 0; }; // Hack the offset to respond 0

  equals(set(rec, 'date', utcDate), utcDate, 'returns reciever');
  equals(rec.readAttribute('date'), '2009-04-02T05:28:03Z', 'should have time in ISO format');
});

test("writing an attribute should make relationship aggregate dirty" ,function() {
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, "precond - bar should be READY_CLEAN");
  equals(get(rec2, 'status'), SC.Record.READY_CLEAN, "precond - rec2 should be READY_CLEAN");
  
  set(bar, 'city', 'Oslo');
  get(bar, 'store').flush();
  
  equals(get(rec2, 'status'), SC.Record.READY_DIRTY, "foo2 should be READY_DIRTY");
});

test("writing an attribute should make many relationship aggregate dirty" ,function() {
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, "precond - bar should be READY_CLEAN");
  equals(get(rec2, 'status'), SC.Record.READY_CLEAN, "precond - rec2 should be READY_CLEAN");

  set(bar, 'city', 'Oslo');
  get(bar, 'store').flush();
  
  equals(get(rec, 'status'), SC.Record.READY_DIRTY, "foo1 should be READY_DIRTY");
  equals(get(rec2, 'status'), SC.Record.READY_DIRTY, "foo2 should be READY_DIRTY");
});

test("writing an attribute should make many relationship aggregate dirty and add the aggregate to the store" ,function() {
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, "precond - bar should be READY_CLEAN");
  equals(get(rec2, 'status'), SC.Record.READY_CLEAN, "precond - rec2 should be READY_CLEAN");
  
  set(bar, 'city', 'Oslo');

  var store = get(bar, 'store');
  ok(store.changelog.contains(get(rec, 'storeKey')), "foo1 should be in the store's changelog");
  ok(store.changelog.contains(get(rec2, 'storeKey')), "foo2 should be in the store's changelog");
});
