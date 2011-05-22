// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test parsing of query string
var store, storeKey, rec1, rec2, rec3, rec4, rec5, MyApp, q;

var same = function(a, b, msg) {
  ok(a.isEqual(b), msg);
};

module("SC.Query#containsRecordTypes", {
  setup: function() {
    MyApp = SC.Object.create();

    MyApp.Contact  = SC.Record.extend();
    MyApp.Person   = MyApp.Contact.extend(); // person is a type of contact
    MyApp.Group    = SC.Record.extend() ; // NOT a subclass
    MyApp.Foo      = SC.Record.extend();

  },

  teardown: function() {
    MyApp = null ;
    SC.Record.subclasses = SC.Set.create(); // reset subclasses
  }
});

test("single recordType with no subclasses", function() {
  var q = SC.Query.local(MyApp.Foo),
      expected = SC.Set.create().add(MyApp.Foo);

  same(get(q, 'expandedRecordTypes'), expected, 'should have only MyApp.Foo');
});

test("multiple recordTypes with no subclasses", function() {
  var q = SC.Query.local([MyApp.Foo, MyApp.Group]),
      expected = SC.Set.create().add(MyApp.Foo).add(MyApp.Group);

  same(get(q, 'expandedRecordTypes'), expected, 'should have MyApp.Foo, MyApp.Group');
});

test("base SC.Record", function() {
  var q = SC.Query.local(),
      expected = SC.Set.create().addEach([SC.Record, MyApp.Foo, MyApp.Group, MyApp.Contact, MyApp.Person]);

  same(get(q, 'expandedRecordTypes'), expected, 'should have all defined types');
});

test("type with subclass", function() {
  var q = SC.Query.local(MyApp.Contact),
      expected = SC.Set.create().addEach([MyApp.Contact, MyApp.Person]);

  same(get(q, 'expandedRecordTypes'), expected, 'should have all Contact and Person');
});

test("adding new type should invalidate property", function() {
  var q = SC.Query.local(MyApp.Contact),
      expected = SC.Set.create().addEach([MyApp.Contact, MyApp.Person]);
  same(get(q, 'expandedRecordTypes'), expected, 'precond - should have all Contact and Person');

  var Bar = MyApp.Person.extend(); // add a new record
  expected.add(Bar);
  same(get(q, 'expandedRecordTypes'), expected, 'should have all Contact, Person, and Bar');
});
