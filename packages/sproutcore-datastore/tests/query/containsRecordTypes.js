// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */
 
// test parsing of query string
var store, storeKey, rec1, rec2, rec3, rec4, rec5, MyApp, q;

module("SC.Query#containsRecordTypes", {
  setup: function() {
    MyApp = SC.Object.create();
    
    MyApp.Contact  = SC.Record.extend();
    MyApp.Person   = MyApp.Contact.extend(); // person is a type of contact
    MyApp.Group    = SC.Record.extend() ; // NOT a subclass
    MyApp.Foo      = SC.Record.extend();
    
  },
  
  teardown: function() { MyApp = null ; }
});

test("comparing a single record type", function() {
  var set, q;
  
  q = SC.Query.create({ recordType: MyApp.Contact });
  set = SC.Set.create().add(MyApp.Contact);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set includes recordType');
  
  set = SC.Set.create().add(MyApp.Person);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set include subclass of recordType');
  
  set = SC.Set.create().add(MyApp.Group);
  equals(q.containsRecordTypes(set), NO, 'should return NO when set include unrelated of recordType');

  set = SC.Set.create().add(MyApp.Group).add(MyApp.Contact);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set includes  recordType along with others');
  
});

test("comparing a multiple record type", function() {
  var set, q;
  
  q = SC.Query.create({ recordTypes: [MyApp.Contact, MyApp.Group] });

  set = SC.Set.create().add(MyApp.Contact);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set includes one of recordTypes');

  set = SC.Set.create().add(MyApp.Group);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set includes one of recordTypes');
  
  set = SC.Set.create().add(MyApp.Person);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set include subclass of recordTypes'); 
  
  set = SC.Set.create().add(MyApp.Group).add(MyApp.Foo);
  equals(q.containsRecordTypes(set), YES, 'should return YES when set includes  recordType along with others');
  
});


test("comparing with no recordType set", function() {
  var set, q;
  
  // NOTE: no recordType or recordTypes
  q = SC.Query.create({  });

  set = SC.Set.create().add(MyApp.Contact);
  equals(q.containsRecordTypes(set), YES, 'should always return YES');

  set = SC.Set.create().add(MyApp.Group);
  equals(q.containsRecordTypes(set), YES, 'should always return YES');
  
  set = SC.Set.create().add(MyApp.Person);
  equals(q.containsRecordTypes(set), YES, 'should always return YES');
  
  set = SC.Set.create().add(MyApp.Group).add(MyApp.Foo);
  equals(q.containsRecordTypes(set), YES, 'should always return YES');
  
});
