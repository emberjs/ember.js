// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var set = SC.set, get = SC.get;

var store, Application;
module("SC.RecordArray Error Methods", {
  setup: function() {

    Application = {};
    Application.Thing = SC.Record.extend({
      name: SC.Record.attr(String)
    });

    SC.run.begin();
    store = SC.Store.create();

    var records = [
      { guid: 1, name: 'Thing One' },
      { guid: 2, name: 'Thing Two' }
    ];

    var types = [ Application.Thing, Application.Thing ];

    store.loadRecords(types, records);
    SC.run.end();
  },

  teardown: function() {
    store = null;
    Application = null;
  }
});

test("Verify error methods behave correctly", function() {
  var q = SC.Query.local(Application.Thing);
  var things = store.find(q);

  SC.run.begin();
  set(things, 'status', SC.Record.BUSY_LOADING);
  store.dataSourceDidErrorQuery(q, SC.Record.GENERIC_ERROR);
  SC.run.end();

  ok(get(things, 'isError'), "isError on things array should be YES");

  equals(get(things, 'errorObject'), SC.Record.GENERIC_ERROR,
    "get('errorObject') on things array should return the correct error object");
});
