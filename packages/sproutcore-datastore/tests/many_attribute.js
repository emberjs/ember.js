// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

// test core array-mapping methods for ManyArray with ManyAttribute
var storeKeys, rec, rec2, rec3, rec4;
var foo1, foo2, foo3, bar1, bar2, bar3;

module("SC.ManyAttribute core methods", {
  setup: function() {
    SC.run.begin();
    MyApp = SC.Object.create({
      store: SC.Store.create()
    });
    
    MyApp.Foo = SC.Record.extend({
      
      // test simple reading of a pass-through prop
      firstName: SC.Record.attr(String),

      // test mapping to another internal key
      otherName: SC.Record.attr(String, { key: "firstName" }),
      
      // test mapping Date
      date: SC.Record.attr(Date),
      
      // used to test default value
      defaultValue: SC.Record.attr(String, {
        defaultValue: "default"
      }),
      
      // test toMany relationships
      fooMany: SC.Record.toMany('MyApp.Foo'),

      // test toMany relationships with different key
      fooManyKeyed: SC.Record.toMany('MyApp.Foo', {
        key: 'fooIds'
      }),

      // test many-to-many relationships with inverse
      barToMany: SC.Record.toMany('MyApp.Bar', {
        inverse: 'fooToMany', isMaster: YES, orderBy: 'name'
      }),
      
      // test many-to-one relationships with inverse
      barToOne: SC.Record.toMany('MyApp.Bar', {
        inverse: 'fooToOne', isMaster: NO
      })
      
    });
    
    MyApp.Bar = SC.Record.extend({
      
      // test many-to-many
      fooToMany: SC.Record.toMany('MyApp.Foo', {
        inverse: 'barToMany', isMaster: NO
      }),
      
      // test many-to-one
      fooToOne: SC.Record.toOne('MyApp.Foo', {
        inverse: 'barToOne', isMaster: YES
      })
    });
    
    storeKeys = MyApp.store.loadRecords(MyApp.Foo, [
      { guid: 1, 
        firstName: "John", 
        lastName: "Doe",
        barToMany: ['bar1'],
        barToOne:  ['bar1', 'bar2'] 
      },
      
      { guid: 2, 
        firstName: "Jane", 
        lastName: "Doe",
        barToMany: ['bar1', 'bar2'],
        barToOne:  [] 
      },
      
      { guid: 3, 
        firstName: "Emily", 
        lastName: "Parker", 
        fooMany: [1,2],
        barToMany: ['bar2'],
        barToOne: [] 
      },
      
      { guid: 4,
        firstName: "Johnny",
        lastName: "Cash",
        fooIds: [1,2]
      }
    ]);
    
    MyApp.store.loadRecords(MyApp.Bar, [
      { guid: "bar1", name: "A", fooToMany: [1,2], fooToOne: 1 },
      { guid: "bar2", name: "Z", fooToMany: [2,3], fooToOne: 1 },
      { guid: "bar3", name: "C" }
    ]);
    
    foo1 = rec = MyApp.store.find(MyApp.Foo, 1);
    foo2 = rec2 = MyApp.store.find(MyApp.Foo, 2);
    foo3 = rec3 = MyApp.store.find(MyApp.Foo, 3);
    rec4 = MyApp.store.find(MyApp.Foo, 4);
    equals(rec.storeKey, storeKeys[0], 'should find record');
    
    bar1 = MyApp.store.find(MyApp.Bar, "bar1");
    bar2 = MyApp.store.find(MyApp.Bar, 'bar2');
    bar3 = MyApp.store.find(MyApp.Bar, 'bar3');
    
    SC.run.end();
  },
  
  teardown: function() {
    MyApp = rec = rec2 = rec3 = 
    foo1 = foo2 = foo3 = bar1 = bar2 = null;
  }
});

// ..........................................................
// READING
// 

test("pass-through should return builtin value" ,function() {
  equals(get(rec, 'firstName'), 'John', 'reading prop should get attr value');
});

test("getting toMany relationship should map guid to real records", function() {
  var rec3 = MyApp.store.find(MyApp.Foo, 3);
  equals(get(rec3, 'id'), 3, 'precond - should find record 3');
  equals(get(rec3, 'fooMany').objectAt(0), rec, 'should get rec1 instance for rec3.fooMany');
  equals(get(rec3, 'fooMany').objectAt(1), rec2, 'should get rec2 instance for rec3.fooMany');
});

test("getting toMany relationship should map guid to real records when using different key", function() {
  var rec4 = MyApp.store.find(MyApp.Foo, 4);
  equals(get(rec4, 'id'), 4, 'precond - should find record 4');
  equals(get(rec4, 'fooManyKeyed').objectAt(0), rec, 'should get rec1 instance for rec4.fooManyKeyed');
  equals(get(rec4, 'fooManyKeyed').objectAt(1), rec2, 'should get rec2 instance for rec4.fooManyKeyed');
});
 
test("getting toMany relation should not change record state", function() {
  equals(get(rec3, 'status'), SC.Record.READY_CLEAN, 'precond - status should be READY_CLEAN');
  
  var recs = get(rec3, 'fooMany');
  ok(recs, 'get(rec3, fooMany) should return records');
  equals(get(rec3, 'status'), SC.Record.READY_CLEAN, 'getting toMany should not change state');
});

test("reading toMany in chained store", function() {
  var recs1, recs2, store, rec3a;
  
  recs1 = get(rec3, 'fooMany');
  store = MyApp.store.chain();
  
  rec3a = store.find(rec3);
  recs2 = get(rec3a, 'fooMany');
      
  same(recs2.getEach('storeKey'), recs1.getEach('storeKey'), 'returns arrays from chained and parent should be same');
  ok(recs2 !== recs1, 'returned arrays should not be same instance');
  
});

test("reading a null relation", function() {
  
  // note: rec1 hash has NO array
  equals(rec.readAttribute('fooMany'), null, 'rec1.fooMany attr should be null');
  
  var ret = get(rec, 'fooMany');
  equals(get(ret, 'length'), 0, 'get(rec1, fooMany).length should be 0'); 
  same(ret.getEach('storeKey'), [], 'get(rec1, fooMany) should return empty array');
});

// ..........................................................
// WRITING
// 

test("writing to a to-many relationship should update set guids", function() {
  var rec3 = MyApp.store.find(MyApp.Foo, 3);
  equals(get(rec3, 'id'), 3, 'precond - should find record 3');
  equals(get(rec3, 'fooMany').objectAt(0), rec, 'should get rec1 instance for rec3.fooMany');
  
  SC.run.begin();
  set(rec3, 'fooMany', [rec2, rec4]);
  SC.run.end();
  
  equals(get(rec3, 'fooMany').objectAt(0), rec2, 'should get rec2 instance for rec3.fooMany');
  equals(get(rec3, 'fooMany').objectAt(1), rec4, 'should get rec4 instance for rec3.fooMany');
});

test("writing to a to-many relationship should update set guids when using a different key", function() {
  var rec4 = MyApp.store.find(MyApp.Foo, 4);
  equals(get(rec4, 'id'), 4, 'precond - should find record 4');
  equals(get(rec4, 'fooManyKeyed').objectAt(0), rec, 'should get rec1 instance for rec4.fooManyKeyed');

  SC.run.begin();
  set(rec4, 'fooManyKeyed', [rec2, rec3]);
  SC.run.end();

  same(get(rec4, 'fooIds').toArray(), [2,3], 'should get array of guids (2, 3) for rec4.fooIds');
});

test("pushing an object to a to-many relationship attribute should update set guids", function() {
  var rec3 = MyApp.store.find(MyApp.Foo, 3);
  equals(get(rec3, 'id'), 3, 'precond - should find record 3');
  equals(get(get(rec3, 'fooMany'), 'length'), 2, 'should be 2 foo instances related');
  
  get(rec3, 'fooMany').pushObject(rec4);
  
  equals(get(get(rec3, 'fooMany'), 'length'), 3, 'should be 3 foo instances related');
  
  equals(get(rec3, 'fooMany').objectAt(0), rec, 'should get rec instance for rec3.fooMany');
  equals(get(rec3, 'fooMany').objectAt(1), rec2, 'should get rec2 instance for rec3.fooMany');
  equals(get(rec3, 'fooMany').objectAt(2), rec4, 'should get rec4 instance for rec3.fooMany');
});
 
test("modifying a toMany array should mark the record as changed", function() {
  var recs = get(rec3, 'fooMany');
  equals(get(rec3, 'status'), SC.Record.READY_CLEAN, 'precond - rec3.status should be READY_CLEAN');
  ok(!!rec4, 'precond - rec4 should be defined');
  
  SC.run.begin();
  recs.pushObject(rec4);
  SC.run.end();
  
  equals(get(rec3, 'status'), SC.Record.READY_DIRTY, 'record status should have changed to dirty');

});

test("Modifying a toMany array using replace", function() {
  var recs = get(rec, 'barToOne'),
      objectForRemoval = recs.objectAt(1);

  recs.replace(1, 1, null); // the object should be removed
  
  ok(objectForRemoval !== recs.objectAt(1), "record should not be present after a replace");
  equals(get(bar2, 'fooToOne'), null, "record should have notified attribute of change");
});


test("modifying a toMany array within a nested store", function() {

  var child = MyApp.store.chain() ; // get a chained store
  var parentFooMany = get(rec3, 'fooMany'); // base foo many
  
  var childRec3 = child.find(rec3); 
  var childFooMany = get(childRec3, 'fooMany'); // get the nested fooMany
  
  // save store keys before modifying for easy testing
  var expected = parentFooMany.getEach('storeKey');
  
  // now trying modifying...
  var childRec4 = child.find(rec4);
  equals(get(childFooMany, 'length'), 2, 'precond - childFooMany should be like parent');
  childFooMany.pushObject(childRec4);
  equals(get(childFooMany, 'length'), 3, 'childFooMany should have 1 more item');
  
  SC.run.end(); // allow notifications to process, if there were any...
  
  same(parentFooMany.getEach('storeKey'), expected, 'parent.fooMany should not have changed yet');
  equals(get(rec3, 'status'), SC.Record.READY_CLEAN, 'parent rec3 should still be READY_CLEAN');
  
  expected = childFooMany.getEach('storeKey'); // update for after commit

  SC.run.begin();
  child.commitChanges();
  SC.run.end();
  
  // NOTE: not getting fooMany from parent again also tests changing an array
  // underneath.  Does it clear caches, etc?
  equals(get(parentFooMany, 'length'), 3, 'parent.fooMany length should have changed');
  same(parentFooMany.getEach('storeKey'), expected, 'parent.fooMany should now have changed form child store');
  equals(get(rec3, 'status'), SC.Record.READY_DIRTY, 'parent rec3 should now be READY_DIRTY');
  
});

test("should be able to modify an initially empty record", function() {
  
  same(get(rec, 'fooMany').getEach('storeKey'), [], 'precond - fooMany should be empty');
  get(rec, 'fooMany').pushObject(rec4);
  same(get(rec, 'fooMany').getEach('storeKey'), [get(rec4, 'storeKey')], 'after edit should have new array');
});


// ..........................................................
// MANY-TO-MANY RELATIONSHIPS
// 

function checkAllClean() {
  Array.prototype.slice.call(arguments).forEach(function(r) {
    equals(get(r, 'status'), SC.Record.READY_CLEAN, 'PRECOND - %@.status should be READY_CLEAN'.fmt(get(r, 'id')));
  }, this);
}

test("removing a record from a many-to-many", function() {
  ok(get(foo1, 'barToMany').indexOf(bar1) >= 0, 'PRECOND - foo1.barToMany should contain bar1');
  ok(get(bar1, 'fooToMany').indexOf(foo1) >= 0, 'PRECOND - bar1.fooToMany should contain foo1');
  checkAllClean(foo1, bar1);
  
  get(foo1, 'barToMany').removeObject(bar1);

  ok(get(foo1, 'barToMany').indexOf(bar1) < 0, 'foo1.barToMany should NOT contain bar1');
  ok(get(bar1, 'fooToMany').indexOf(foo1) < 0, 'bar1.fooToMany should NOT contain foo1');

  equals(get(foo1, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar1, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  
});

test("removing a record from a many-to-many; other side", function() {
  ok(get(foo1, 'barToMany').indexOf(bar1) >= 0, 'PRECOND - foo1.barToMany should contain bar1');
  ok(get(bar1, 'fooToMany').indexOf(foo1) >= 0, 'PRECOND - bar1.fooToMany should contain foo1');
  checkAllClean(foo1, bar1);
  
  get(bar1, 'fooToMany').removeObject(foo1);

  ok(get(foo1, 'barToMany').indexOf(bar1) < 0, 'foo1.barToMany should NOT contain bar1');
  ok(get(bar1, 'fooToMany').indexOf(foo1) < 0, 'bar1.fooToMany should NOT contain foo1');

  equals(get(foo1, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar1, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
  
});

test("adding a record to a many-to-many; bar side", function() {
  ok(get(foo2, 'barToMany').indexOf(bar3) < 0, 'PRECOND - foo1.barToMany should NOT contain bar1');
  ok(get(bar3, 'fooToMany').indexOf(foo2) < 0, 'PRECOND - bar3.fooToMany should NOT contain foo1');
  checkAllClean(foo2, bar3);
  
  get(bar3, 'fooToMany').pushObject(foo2);

  // v-- since bar3 is added throught inverse, it should follow orderBy
  equals(get(foo2, 'barToMany').indexOf(bar3), 1, 'foo1.barToMany should contain bar1');
  ok(get(bar3, 'fooToMany').indexOf(foo2) >= 0, 'bar1.fooToMany should contain foo1');

  equals(get(foo2, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar1, 'status'), SC.Record.READY_CLEAN, 'bar1.status should be READY_CLEAN');
});


test("adding a record to a many-to-many; foo side", function() {
  ok(get(foo2, 'barToMany').indexOf(bar3) < 0, 'PRECOND - foo1.barToMany should NOT contain bar3');
  ok(get(bar3, 'fooToMany').indexOf(foo2) < 0, 'PRECOND - bar3.fooToMany should NOT contain foo1');
  checkAllClean(foo2, bar3);
  
  get(foo2, 'barToMany').pushObject(bar3);

  ok(get(foo2, 'barToMany').indexOf(bar3) >= 0, 'foo1.barToMany should contain bar3');
  ok(get(bar3, 'fooToMany').indexOf(foo2) >= 0, 'bar1.fooToMany should contain foo3');

  equals(get(foo2, 'status'), SC.Record.READY_DIRTY, 'foo1.status should be READY_DIRTY');
  equals(get(bar1, 'status'), SC.Record.READY_CLEAN, 'bar3.status should be READY_CLEAN');
});

// ..........................................................
// ONE-TO-MANY RELATIONSHIPS
// 

test("removing a record from a one-to-many", function() {
  ok(get(foo1, 'barToOne').indexOf(bar1) >= 0, 'PRECOND - foo1.barToOne should contain bar1');
  equals(get(bar1, 'fooToOne'), foo1, 'PRECOND - bar1.fooToOne should eq foo1');
  checkAllClean(foo1, bar1);
  
  get(foo1, 'barToOne').removeObject(bar1);

  ok(get(foo1, 'barToOne').indexOf(bar1) < 0, 'foo1.barToOne should NOT contain bar1');
  equals(get(bar1, 'fooToOne'), null, 'bar1.fooToOne should eq null');

  equals(get(foo1, 'status'), SC.Record.READY_CLEAN, 'foo1.status should be READY_CLEAN');
  equals(get(bar1, 'status'), SC.Record.READY_DIRTY, 'bar1.status should be READY_DIRTY');
  
});


test("removing a record from a one-to-many; other-side", function() {
  ok(get(foo1, 'barToOne').indexOf(bar1) >= 0, 'PRECOND - foo1.barToOne should contain bar1');
  equals(get(bar1, 'fooToOne'), foo1, 'PRECOND - bar1.fooToOne should eq foo1');
  checkAllClean(foo1, bar1);
  
  set(bar1, 'fooToOne', null);

  ok(get(foo1, 'barToOne').indexOf(bar1) < 0, 'foo1.barToOne should NOT contain bar1');
  equals(get(bar1, 'fooToOne'), null, 'bar1.fooToOne should eq null');

  equals(get(foo1, 'status'), SC.Record.READY_CLEAN, 'foo1.status should be READY_CLEAN');
  equals(get(bar1, 'status'), SC.Record.READY_DIRTY, 'bar1.status should be READY_DIRTY');
  
});


test("add a record to a one-to-many; many-side", function() {
  ok(get(foo1, 'barToOne').indexOf(bar3) < 0, 'PRECOND - foo1.barToOne should NOT contain bar3');
  equals(get(bar3, 'fooToOne'), null, 'PRECOND - bar3.fooToOne should eq null');
  checkAllClean(foo1, bar1);
  
  get(foo1, 'barToOne').pushObject(bar3);

  ok(get(foo1, 'barToOne').indexOf(bar3) >= 0, 'foo1.barToOne should contain bar3');
  equals(get(bar3, 'fooToOne'), foo1, 'bar3.fooToOne should eq foo1');

  equals(get(foo1, 'status'), SC.Record.READY_CLEAN, 'foo1.status should be READY_CLEAN');
  equals(get(bar3, 'status'), SC.Record.READY_DIRTY, 'bar3.status should be READY_DIRTY');
  
});


test("add a record to a one-to-many; one-side", function() {
  ok(get(foo1, 'barToOne').indexOf(bar3) < 0, 'PRECOND - foo1.barToOne should NOT contain bar3');
  equals(get(bar3, 'fooToOne'), null, 'PRECOND - bar3.fooToOne should eq null');
  checkAllClean(foo1, bar1);
  
  set(bar3, 'fooToOne', foo1);

  ok(get(foo1, 'barToOne').indexOf(bar3) >= 0, 'foo1.barToOne should contain bar3');
  equals(get(bar3, 'fooToOne'), foo1, 'bar3.fooToOne should eq foo1');

  equals(get(foo1, 'status'), SC.Record.READY_CLEAN, 'foo1.status should be READY_CLEAN');
  equals(get(bar3, 'status'), SC.Record.READY_DIRTY, 'bar3.status should be READY_DIRTY');
  
});
