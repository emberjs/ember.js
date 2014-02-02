// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var MyApp, dataSource;
module("SC.Record core methods", {
  setup: function() {
    dataSource = SC.DataSource.create({

      gotParams: NO,
      wasCommitted: NO,

      createRecord: function(store, storeKey, params) {
        this.wasCommitted = YES;
        this.gotParams = params && params['param1'] ? YES: NO;
      }});

    MyApp = SC.Object.create({
      store: SC.Store.create().from(dataSource)
    })  ;

    MyApp.Foo = SC.Record.extend({});
    MyApp.json = {
      foo: "bar",
      number: 123,
      bool: YES,
      array: [1,2,3],
      guid: 1
    };

    SC.RunLoop.begin();
    MyApp.foo = MyApp.store.createRecord(MyApp.Foo, MyApp.json);
    SC.RunLoop.end();

  }
});

test("statusString", function() {
  equals(MyApp.foo.statusString(), 'READY_NEW', 'status string should be READY_NEW');
});

test("Can commitRecord() specific SC.Record instance", function() {

  MyApp.foo.set('foo', 'foobar');

  // commit the new record
  MyApp.foo.commitRecord({ param1: 'value1' });

  equals(dataSource.wasCommitted, YES, 'Record was committed');
  equals(dataSource.gotParams, YES, 'Params were properly passed through commitRecord');

});

test("JSON encoding an SC.Record should encode the attributes", function(){
  var str = SC.json.encode(MyApp.foo);
  var result = SC.json.decode(str);

  same(MyApp.json, result, "original = encoded record");
});
