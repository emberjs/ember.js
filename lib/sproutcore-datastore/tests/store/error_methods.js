// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, Application;

module("SC.Store Error Methods", {
  setup: function() {

    Application = {};
    Application.Thing = SC.Record.extend({
      name: SC.Record.attr(String)
    });

    SC.RunLoop.begin();
    store = SC.Store.create();

    var records = [
      { guid: 1, name: 'Thing One' },
      { guid: 2, name: 'Thing Two' }
    ];

    var types = [ Application.Thing, Application.Thing ];

    store.loadRecords(types, records);
    SC.RunLoop.end();
  },

  teardown: function() {
    store = null;
    Application = null;
  }
});

test("Verify readError() returns correct errors", function() {
  var thing1 = store.find(Application.Thing, 1);
  var storeKey = thing1.get('storeKey');

  SC.RunLoop.begin();
  store.writeStatus(storeKey, SC.Record.BUSY_LOADING);
  store.dataSourceDidError(storeKey, SC.Record.GENERIC_ERROR);
  SC.RunLoop.end();

  equals(store.readError(storeKey), SC.Record.GENERIC_ERROR,
    "store.readError(storeKey) should return the correct error object");
});

test("Verify readQueryError() returns correct errors", function() {
  var q = SC.Query.local(Application.Thing);
  var things = store.find(q);

  SC.RunLoop.begin();
  things.set('status', SC.Record.BUSY_LOADING);
  store.dataSourceDidErrorQuery(q, SC.Record.GENERIC_ERROR);
  SC.RunLoop.end();

  equals(store.readQueryError(q), SC.Record.GENERIC_ERROR,
    "store.readQueryError(q) should return the correct error object");
});
