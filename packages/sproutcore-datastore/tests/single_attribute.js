// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test core array-mapping methods for RecordArray with RecordAttribute
var storeKeys, rec, rec2, bar, bar2 ;

module("SC.RecordAttribute core methods", {
  setup: function() {

    MyApp = SC.Object.create({
      store: SC.Store.create()
    });
    
    MyApp.Foo = SC.Record.extend({
      
      // test toOne relationships
      relatedTo: SC.Record.toOne('MyApp.Foo'),

      // test non-isEditable toOne relationships
      readOnlyRelatedTo: SC.Record.toOne('MyApp.Bar', {
        isEditable: NO
      }),
      
      // test toOne relationship with computed type
      relatedToComputed: SC.Record.toOne(function() {
        // not using get() to avoid another transform which will 
        // trigger an infinite loop
        return (this.readAttribute('relatedToComputed').indexOf("foo")===0) ? MyApp.Foo : MyApp.Bar;
      }),
      
      bar: SC.Record.toOne('MyApp.Bar', { inverse: 'foo' }),
      
      barKeyed: SC.Record.toOne('MyApp.Bar', { key: 'barId' })
      
    });
    
    MyApp.Bar = SC.Record.extend({
      foo: SC.Record.toOne('MyApp.Foo', { inverse: 'bar', isMaster: NO })
    });
    
    SC.run.begin();
    storeKeys = MyApp.store.loadRecords(MyApp.Foo, [
      { 
        guid: 'foo1', 
        firstName: "John", 
        lastName: "Doe", 
        date: "2009-03-01T20:30-08:00",
        anArray: ['one', 'two', 'three'],
        anObject: { 'key1': 'value1', 'key2': 'value2' },
        bar: "bar1"
      },
      
      { 
        guid: 'foo2', 
        firstName: "Jane", 
        lastName: "Doe", 
        relatedTo: 'foo1',
        anArray: 'notAnArray',
        anObject: 'notAnObject',
        nonIsoDate: "2009/06/10 8:55:50 +0000"
      },
      
      { 
        guid: 'foo3', 
        firstName: "Alex", 
        lastName: "Doe", 
        relatedToComputed: 'bar1',
        anArray: ['one', 'two', 'three'],
        anObject: { 'key1': 'value1', 'key2': 'value2' },
        bar: "bar2"
      },
      
      {
        guid: 'foo4',
        firstName: 'Joe',
        lastName:  'Schmo',
        barId: 'bar1'
      },
      
      { 
        guid: 'foo5', 
        firstName: "Jane", 
        lastName: "Doe", 
        readOnlyRelatedTo: 'bar1'
      }
      
    ]);
    
    MyApp.store.loadRecords(MyApp.Bar, [
      { guid: 'bar1', city: "Chicago", foo: "foo1" },
      { guid: "bar2", city: "New York", foo: 'foo3' }
    ]);
    
    SC.run.end();
    
    rec = MyApp.store.find(MyApp.Foo, 'foo1');
    rec2 = MyApp.store.find(MyApp.Foo, 'foo2');
    
    bar = MyApp.store.find(MyApp.Bar, 'bar1');
    bar2 = MyApp.store.find(MyApp.Bar, 'bar2');
    
    equals(rec.storeKey, storeKeys[0], 'should find record');
    
  },

  teardown: function() {
    MyApp = undefined;
  }
});

// ..........................................................
// READING
// 

test("getting toOne relationship should map guid to a real record", function() {
  var rec2 = MyApp.store.find(MyApp.Foo, 'foo2');
  equals(get(rec2, 'id'), 'foo2', 'precond - should find record 2');
  equals(get(rec2, 'relatedTo'), rec, 'should get rec1 instance for rec2.relatedTo');
});

test("getting toOne relationship from computed attribute should map guid to a real record", function() {
  var rec3 = MyApp.store.find(MyApp.Foo, 'foo3');
  equals(get(rec3, 'id'), 'foo3', 'precond - should find record 3');
  equals(get(rec3, 'relatedToComputed'), bar, 'should get bar1 instance for rec3.relatedToComputed');
});

test("reading an inverse relationship", function() {
  equals(get(rec, 'bar'), bar, 'foo1.bar should == bar');
  equals(get(bar, 'foo'), rec, 'bar.foo should == foo1');  
});

test("reading a keyed relationship", function(){
  var rec4 = MyApp.store.find(MyApp.Foo, 'foo4');
  equals(get(rec4, 'barKeyed'), bar, 'foo4.barKeyed should == bar');
});

// ..........................................................
// WRITING
// 

test("writing to a to-one relationship should update set guid", function() {
  var rec2 = MyApp.store.find(MyApp.Foo, 'foo2');
  equals(get(rec2, 'id'), 'foo2', 'precond - should find record 2');

  equals(get(rec2, 'relatedTo'), rec, 'precond - should get rec1 instance for rec2.relatedTo');

  set(rec2, 'relatedTo', rec2);

  equals(rec2.readAttribute('relatedTo'), 'foo2', 'should write ID for set record to relatedTo attribute');
  
  equals(get(rec2, 'relatedTo'), rec2, 'should get foo record that was just set');

});

test("writing to a to-one computed relationship should update set guid", function() {
  var rec3 = MyApp.store.find(MyApp.Foo, 'foo3');
  equals(get(rec3, 'id'), 'foo3', 'precond - should find record 2');
  equals(get(rec3, 'relatedToComputed'), bar, 'precond - should get bar1 instance for rec3.relatedToComputed');
  
  set(rec3, 'relatedToComputed', rec);
  equals(rec3.readAttribute('relatedToComputed'), 'foo1', 'should write ID for set record to relatedTo attribute');
});

test("clearing a toOne relationship", function() {
  ok(get(rec2, 'relatedTo') !== null, 'precond - rec.relatedTo should have a value');
  
  set(rec2, 'relatedTo', null);
  equals(get(rec2, 'relatedTo'), null, 'rec.relatedTo should be null');
  equals(rec2.readAttribute('relatedTo'), null, 'rec.relatedTo attribute should be null');
});

test("clearing a toOne relationship with an inverse - foo isMaster", function() {
  equals(get(rec, 'bar'), bar, 'precond - foo1.bar should eq bar');
  equals(get(bar, 'foo'), rec, 'precond - bar.foo should eq foo1');

  equals(get(rec, 'status'), SC.Record.READY_CLEAN, 'precond - foo1.status should be READY_CLEAN');
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, 'precond - bar1.status should be READY_CLEAN');
  
  set(rec, 'bar', null);
  
  equals(get(rec, 'bar'), null, 'foo1.bar should be null after change');
  equals(get(bar, 'foo'), null, 'bar.foo should also be null after change');
  
  equals(get(rec, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  
});

test("modifying a toOne relationship with an inverse from null", function() {
  equals(get(rec, 'bar'), bar, 'precond - foo1.bar should eq bar');
  equals(get(bar, 'foo'), rec, 'precond - bar.foo should eq foo1');
  equals(get(rec2, 'bar'), null, 'precond - foo2.bar should eq null');
  
  [rec, rec2, bar].forEach(function(r) {
    equals(get(r, 'status'), SC.Record.READY_CLEAN, 'precond - %@.status should be READY_CLEAN'.fmt(get(r, 'id')));
  }, this);
  
  set(bar, 'foo', rec2);
  
  equals(get(rec, 'bar'), null, 'foo1.bar should be null after change');
  equals(get(bar, 'foo'), rec2, 'bar.foo should eq foo2 after change');
  equals(get(rec2, 'bar'), bar, 'foo2.bar should eq bar after change');
  
  equals(get(rec, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(rec2, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  
});

test("modifying a toOne relationship with an inverse from other", function() {
  
  var foo1 = rec, 
      foo3 = MyApp.store.find(MyApp.Foo, 'foo3'),
      bar1 = bar;
  
  equals(get(foo1, 'bar'), bar1, 'precond - foo1.bar should eq bar1');
  equals(get(bar1, 'foo'), foo1, 'precond - bar.foo should eq foo1');
  
  equals(get(foo3, 'bar'), bar2, 'precond - foo3.bar should eq null');
  equals(get(bar2, 'foo'), foo3, 'precond - bar2.foo should eq foo3');
  
  
  [foo1, foo3, bar1, bar2].forEach(function(r) {
    equals(get(r, 'status'), SC.Record.READY_CLEAN, 'precond - %@.status should be READY_CLEAN'.fmt(get(r, 'id')));
  }, this);
  
  set(bar1, 'foo', foo3);
  
  equals(get(foo1, 'bar'), null, 'foo1.bar should be null after change');
  equals(get(bar1, 'foo'), foo3, 'bar.foo should eq foo3 after change');

  equals(get(foo3, 'bar'), bar1, 'foo3.bar should be bar after change');
  equals(get(bar2, 'foo'), null, 'bar2.foo should eq null after change');
  
  equals(get(foo1, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(foo1, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');

  equals(get(bar1, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  equals(get(bar2, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  
});

test("modifying a keyed toOne relationship", function(){
  var rec4 = MyApp.store.find(MyApp.Foo, 'foo4');

  set(rec4, 'barKeyed', bar2);

  equals(get(rec4, 'barId'), 'bar2', 'foo4.barId should == bar2');
});

test("isEditable NO should not allow editing", function() {
  var bar1 = MyApp.store.find(MyApp.Bar, 'bar1');
  var bar2 = MyApp.store.find(MyApp.Bar, 'bar2');
  var rec5 = MyApp.store.find(MyApp.Foo, 'foo5');

  equals(get(rec5, 'readOnlyRelatedTo'), bar1, 'precond - should find bar1');
  equals(get(rec5, 'status'), SC.Record.READY_CLEAN, 'precond - foo5 should be READY_CLEAN');
  
  set(rec5, 'readOnlyRelatedTo', bar2);
  
  equals(get(rec5, 'readOnlyRelatedTo'), bar1, 'should still find bar1 after setting');
  equals(get(rec5, 'status'), SC.Record.READY_CLEAN, 'foo5 status is still READY_CLEAN');
});

