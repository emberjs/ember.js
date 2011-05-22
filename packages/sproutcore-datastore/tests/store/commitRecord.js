// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

var store, storeKey1, storeKey2, storeKey3, storeKey4, storeKey5, storeKey6;
var storeKey7, json, json1, json2, json3, json4, json5, json6, json7;
var ds ;

module("SC.Store#commitRecord", {
  setup: function() {

    ds = SC.DataSource.create({
      
      callCount: 0,
      
      commitRecords: function(store, toCreate, toUpdate, toDestroy, params) {
        this.toCreate = toCreate;
        this.toUpdate = toUpdate;
        this.toDestroy = toDestroy;
        this.params = params;
        this.callCount++;
      },
      
      reset: function() {
        this.toCreate = this.toUpdate = this.toDestroy = this.params = null;
        this.callCount = 0 ;
      },
      
      expect: function(callCount, toCreate, toUpdate, toDestroy, params) {
        if (callCount !== undefined) {
          equals(this.callCount, callCount, 'expect datasource.commitRecords to be called X times');
        }
        
        if (toCreate !== undefined) {
          same(this.toCreate, toCreate, 'expect toCreate to have items');
        }

        if (toUpdate !== undefined) {
          same(this.toUpdate, toUpdate, 'expect toUpdate to have items');
        }
        
        if (toDestroy !== undefined) {
          same(this.toDestroy, toDestroy, 'expect toDestroy to have items');
        }

        if (params !== undefined) {
          same(this.params, params, 'expect params to have items');
        }
      }
      
    });
    
    store = SC.Store.create().from(ds);
    
    json1 = {
      guid: "commitGUID1",
      string: "string",
      number: 23,
      bool:   YES
    };
    json2 = {
      guid: "commitGUID2",
      string: "string",
      number: 23,
      bool:   YES
    };
    json3 = {
      guid: "commitGUID3",
      string: "string",
      number: 23,
      bool:   YES
    };
    json4 = {
      guid: "commitGUID4",
      string: "string",
      number: 23,
      bool:   YES
    };
    json5 = {
      guid: "commitGUID5",
      string: "string",
      number: 23,
      bool:   YES
    };
    json6 = {
      guid: "commitGUID6",
      string: "string",
      number: 23,
      bool:   YES
    };
    json7 = {
      guid: "commitGUID7",
      string: "string",
      number: 23,
      bool:   YES
    };
    
    SC.run.begin();
    storeKey1 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey1, json1, SC.Record.READY_CLEAN);
    storeKey2 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey2, json2, SC.Record.READY_NEW);
    storeKey3 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey3, json3, SC.Record.READY_DIRTY);
    storeKey4 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey4, json4, SC.Record.DESTROYED_DIRTY);
    storeKey5 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey5, json5, SC.Record.READY_EMPTY);
    storeKey6 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey6, json6, SC.Record.READY_ERROR);
    storeKey7 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey7, json7, SC.Record.READY_DESTROYED_CLEAN);
    SC.run.end();
  }
});

test("Confirm that all the states are switched as expected after running commitRecord", function() {
  var throwError=false, msg, status;

  store.commitRecord(undefined, undefined, storeKey1);
  status = store.readStatus( storeKey1);
  equals(status, SC.Record.READY_CLEAN, "the status shouldn't have changed. It should be READY_CLEAN ");
  
  store.commitRecord(undefined, undefined, storeKey2);
  status = store.readStatus( storeKey2);
  equals(status, SC.Record.BUSY_CREATING, "the status should be SC.Record.BUSY_CREATING");

  store.commitRecord(undefined, undefined, storeKey3);
  status = store.readStatus( storeKey3);
  equals(status, SC.Record.BUSY_COMMITTING, "the status should be SC.Record.BUSY_COMMITTING");
  
  store.dataSourceDidComplete(storeKey3);
  status = store.readStatus( storeKey3);
  equals(status, SC.Record.READY_CLEAN, "the status should be SC.Record.READY_CLEAN");
  
  store.commitRecord(undefined, undefined, storeKey4);
  status = store.readStatus( storeKey4);
  equals(status, SC.Record.BUSY_DESTROYING, "the status should be SC.Record.BUSY_DESTROYING");
  
  try {
    store.commitRecord(undefined, undefined, storeKey5);
    throwError=false;
    msg='';
  }catch(error1){
    throwError=true;
    msg=error1.message;
  }
  equals(msg, SC.Record.NOT_FOUND_ERROR.message, "commitRecord should throw the following error");
  
  try{
    store.commitRecord(undefined, undefined, storeKey6);
    throwError=false;
    msg='';
  }catch(error2){
    throwError=true;
    msg=error2.message;
  }
  equals(msg, SC.Record.NOT_FOUND_ERROR.message, "commitRecord should throw the following error");
  
  try{
    store.commitRecord(undefined, undefined, storeKey7);
    throwError=false;
    msg='';
  }catch(error3){
    throwError=true;
    msg=error3.message;
  }
  equals(msg, SC.Record.NOT_FOUND_ERROR.message, "commitRecord should throw the following error");
  
});

test("calling commitRecords() without explicit storeKeys", function() {
  var st;
  store.changelog = [storeKey1, storeKey2, storeKey3, storeKey4];
  store.commitRecords();

  st = store.readStatus( storeKey1);
  equals(st, SC.Record.READY_CLEAN, "storeKey1 - the status shouldn't have changed. It should be READY_CLEAN ");
  
  st = store.readStatus( storeKey2);
  equals(st, SC.Record.BUSY_CREATING, "storeKey2 - the status should be SC.Record.BUSY_CREATING");

  st = store.readStatus( storeKey3);
  equals(st, SC.Record.BUSY_COMMITTING, "storeKey3 - the status should be SC.Record.BUSY_COMMITTING");
  
  st = store.readStatus( storeKey4);
  equals(st, SC.Record.BUSY_DESTROYING, "storeKey4 - the status should be SC.Record.BUSY_DESTROYING");
  
  ds.expect(1, [storeKey2], [storeKey3], [storeKey4]);
});

test("calling commitRecords() with params", function() {
  var p = { foo: "bar" };
  store.commitRecord(null, null, storeKey2, p);
  ds.expect(1, [storeKey2], [], [], p);
  ds.reset();

  // calling commit records with no storeKeys should still invoke if params
  store.commitRecords(null,null,null,p);
  ds.expect(1, [], [], [], p);
  ds.reset();
  
  // call commit records with no storeKeys and no params should not invoke ds
  store.commitRecords(null,null,null,null);
  ds.expect(0);
});

test("calling commitRecords() with callbacks", function() {
  var wasCalled = NO;
  var cb = function(){wasCalled = YES;};
  
  store.commitRecord(null, null, storeKey2, {}, cb);
  ok(store._callback_queue[storeKey2], "should have a callback in the queue");
  ok(!wasCalled, "wasn't called yet");
  store.dataSourceDidComplete(storeKey2);
  ok(wasCalled, "callback fired!");
});

