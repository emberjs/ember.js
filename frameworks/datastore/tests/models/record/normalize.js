// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

// test normalize method for SC.Record
var storeKeys, rec, rec2, rec3, rec4;
module("SC.Record normalize method", {
  setup: function() {

    SC.RunLoop.begin();
 
    MyApp = SC.Object.create({
      store: SC.Store.create()
    });
    
    MyApp.Foo = SC.Record.extend({
      
      guid: SC.Record.attr(String, { defaultValue: function() {
        var i, rnum, chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
          strLen = 8, ret = '';
    		for (i=0; i<strLen; i++) {
    			rnum = Math.floor(Math.random() * chars.length);
    			ret += chars.substring(rnum,rnum+1);
    		}
    		return ret;
      } }),
      
      // test simple reading of a pass-through prop
      firstName: SC.Record.attr(String),

      // test Array
      anArray: SC.Record.attr(Array),
      
      // used to test default value
      defaultValue: SC.Record.attr(String, {
        defaultValue: "default"
      }),
      
      // test toOne relationships
      relatedTo: SC.Record.toOne('MyApp.Foo', { defaultValue: '1' }),
      
      // test toOne relationship computed default
      relatedToComputed: SC.Record.toOne('MyApp.Foo', { 
        defaultValue: function() {
          var num = Math.floor(Math.random()*2+1);
          return 'foo' + num;
        }
      }),
      
      // test toMany relationships
      relatedToMany: SC.Record.toMany('MyApp.Foo')
 
    });

    // A parent record
    MyApp.FooParent = SC.Record.extend({
      nestedRecordNamespace: MyApp,
      myChild: SC.ChildAttribute.attr('MyApp.FooChild')
    });

    // A child record
    MyApp.FooChild = SC.Record.extend({
    });
    
    MyApp.Bar = SC.Record.extend({
      // test toOne relationships
      relatedTo: SC.Record.toOne('MyApp.Bar', { defaultValue: '1' })
    });
    
    MyApp.OneBar = SC.Record.extend({
      manyFoos: SC.Record.toMany('MyApp.ManyFoo', {
        key: 'many_foos',
        inverse: 'oneBar'
      })
    });
    
    MyApp.ManyFoo = SC.Record.extend({
      oneBar: SC.Record.toOne('MyApp.OneBar', {
        key: 'bar_id',
        inverse: 'manyFoos'
      })
    });
    
    storeKeys = MyApp.store.loadRecords(MyApp.Foo, [
      { 
        guid: 'foo1', 
        firstName: 123, 
        anArray: ['one', 'two', 'three']
      },
      
      { 
        guid: 'foo2', 
        firstName: "Jane",
        relatedTo: 'foo1'
      },
      
      {
        guid: 'foo3'
      }
      
    ]);
    
    rec = MyApp.store.find(MyApp.Foo, 'foo1');
    rec2 = MyApp.store.find(MyApp.Foo, 'foo2');
    rec3 = MyApp.store.find(MyApp.Foo, 'foo3');
    
    equals(rec.storeKey, storeKeys[0], 'should find record');
    
  },
  
  teardown: function() {
    SC.RunLoop.end();
  }
  
});

// ..........................................................
// NORMALIZING
// 

test("normalizing a pre-populated record" ,function() {
  
  equals(rec.attributes()['firstName'], 123, 'hash value of firstName is 123');
  equals(rec.get('firstName'), '123', 'get value of firstName is 123 string');
  
  rec.normalize();
  
  var sameValue = rec.attributes()['firstName'] === '123';
  var relatedTo = rec.attributes()['relatedTo'] === '1';
  var relatedToComputed = rec.attributes()['relatedToComputed'];
  
  var computedValues = ['foo1', 'foo2', 'foo3'];
  
  ok(sameValue, 'hash value of firstName after normalizing is 123 string');
  ok(sameValue, 'hash value of relatedTo should be 1');
  ok(computedValues.indexOf(relatedToComputed)!==-1, 'hash value of relatedToComputed should be either foo1, foo2 or foo3');
  
  equals(rec.get('firstName'), '123', 'get value of firstName after normalizing is 123 string');
  
});

test("normalizing an empty record" ,function() {
  
  equals(rec3.attributes()['defaultValue'], undefined, 'hash value of defaultValue is undefined');
  equals(rec3.get('defaultValue'), 'default', 'get value of defaultValue is default');
  
  rec3.normalize();
  
  equals(rec3.attributes()['defaultValue'], 'default', 'hash value of defaultValue after normalizing is default');
  equals(rec3.get('defaultValue'), 'default', 'get value of defaultValue after normalizing is default');
  
});

test("normalizing with includeNull flag" ,function() {
  
  equals(rec3.attributes()['firstName'], undefined, 'hash value of firstName is undefined');
  equals(rec3.get('firstName'), null, 'get value of firstName is null');
  
  rec3.normalize(YES);
  
  equals(rec3.attributes()['firstName'], null, 'hash value of firstName after normalizing is null');
  equals(rec3.get('firstName'), null, 'get value of firstName after normalizing is null');
  
});

test("normalizing a new record with toOne should reflect id in data hash" ,function() {

  var recHash = { 
    guid: 'foo4', 
    firstName: "Jack",
    relatedTo: 'foo1'
  };

  var newRecord = MyApp.store.createRecord(MyApp.Foo, recHash);
  MyApp.store.commitRecords();
  
  equals(newRecord.attributes()['relatedTo'], 'foo1', 'hash value of relatedTo is foo1');
  equals(newRecord.get('relatedTo'), rec, 'get value of relatedTo is foo1');

  newRecord.normalize();
  
  equals(newRecord.attributes()['relatedTo'], 'foo1', 'hash value of relatedTo after normalizing is still foo1');
  equals(newRecord.get('relatedTo'), rec, 'get value of relatedTo after normalizing remains foo1');
  
});

test("normalizing a new record with toMany should reflect id in data hash" ,function() {

  var recHash = { 
    guid: 'foo5', 
    firstName: "Andrew",
    relatedToMany: ['foo1', 'foo2']
  };

  var newRecord = MyApp.store.createRecord(MyApp.Foo, recHash);
  MyApp.store.commitRecords();
  
  ok(SC.typeOf(newRecord.attributes()['relatedToMany'])===SC.T_ARRAY, 'should be a hash');
  equals(newRecord.get('relatedToMany').get('length'), 2, 'number of relatedToMany is 2');
  
  newRecord.normalize();
  
  ok(SC.typeOf(newRecord.attributes()['relatedToMany'])===SC.T_ARRAY, 'should still be a hash after normalizing');
  equals(newRecord.get('relatedToMany').get('length'), 2, 'number of relatedToMany is still 2');
  
});

test("normalizing a new record with toOne that has broken relationship" ,function() {

  var recHash = { 
    guid: 'foo5', 
    firstName: "Andrew",
    relatedTo: 'foo10' // does not exist
  };

  var newRecord = MyApp.store.createRecord(MyApp.Foo, recHash);
  MyApp.store.commitRecords();
  
  equals(newRecord.attributes()['relatedTo'], 'foo10', 'should be foo10');
  
  newRecord.normalize();
  
  equals(newRecord.attributes()['relatedTo'], 'foo10', 'should remain foo10');
  
});

test("normalizing a new record with toOne with relationship to wrong recordType" ,function() {

  var recHash = { 
    guid: 'bar1', 
    firstName: "Andrew",
    relatedTo: 'foo1' // does exist but wrong recordType
  };

  var newRecord = MyApp.store.createRecord(MyApp.Bar, recHash);
  MyApp.store.commitRecords();
  
  equals(newRecord.attributes()['relatedTo'], 'foo1', 'should be foo1');
  
  newRecord.normalize();
  
  equals(newRecord.attributes()['relatedTo'], 'foo1', 'should remain foo1');
  
});

test("normalizing a new record with no guid should work with defaultValue" ,function() {
  
  var recHash = { 
    firstName: "Andrew",
    relatedTo: 'foo1' // does exist but wrong recordType
  };
  
  var newRecord = MyApp.store.createRecord(MyApp.Foo, recHash);
  MyApp.store.commitRecords();
  
  var firstGuid = newRecord.get('guid');
  
  equals(newRecord.get('firstName'), 'Andrew', 'firstName should be Andrew');
  
  newRecord.normalize();
  
  var findRecord = MyApp.store.find(MyApp.Foo, firstGuid);
  
  equals(findRecord.get('guid'), firstGuid, 'guid should be the same as first');
  
});

test("normalizing a new record with a null child reference", function() {
  var recHash = {
    guid: 'testId1'
  };

  // Create a parent record with an ChildAttribute property referring to no child.
  // Make sure normalize() can handle that.
  var newRecord = MyApp.store.createRecord(MyApp.FooParent, recHash);
  var newRecordId, findRecord;
  
  MyApp.store.commitRecords();
  newRecordId = newRecord.get('id');
  newRecord.normalize();

  findRecord = MyApp.store.find(MyApp.FooParent, newRecordId);
  equals(findRecord.get('id'), newRecordId, 'id should be the same as the first');
});

test("normalizing a new record with toOne without defaultValue" ,function() {
  
  var oneBarHash = {
    guid: 1,
    many_foos: [1]
  }
  
  var oneBarRecord = MyApp.store.createRecord(MyApp.OneBar, oneBarHash);

  var fooHash = {
    guid: 1,
    bar_id: 1
  };

  var fooRecord = MyApp.store.createRecord(MyApp.ManyFoo, fooHash);
  MyApp.store.commitRecords();
    
  equals(fooRecord.attributes()['bar_id'], 1, 'hash value of oneBar is 1');
  equals(fooRecord.get('oneBar'), oneBarRecord, 'get value of oneBar is 1');

  fooRecord.normalize();
  
  equals(fooRecord.attributes()['bar_id'], 1, 'hash value of oneBar after normalizing is still 1');
  equals(fooRecord.get('oneBar'), oneBarRecord, 'get value of oneBar after normalizing remains 1');
  
});


test("normalizing an undefined Date value", function () {
  var Message = SC.Record.extend({
    to: SC.Record.attr(String),
    from: SC.Record.attr(String),
    timestamp: SC.Record.attr(Date),
    text: SC.Record.attr(String)
  });

  var message = MyApp.store.createRecord(Message, {
    guid: 'chocolate-moose',
    to: 'swedish.chef@muppets.com',
    from: 'moose@muppets.com',
    text: 'Bork bork bork!'
  });

  message.normalize();

  equals(message.get('timestamp'), null, "normalizes to null");
});

