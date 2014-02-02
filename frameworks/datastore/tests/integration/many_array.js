// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var MyDataSource = SC.DataSource.extend({
  retrieveRecordsArguments: [],

  retrieveRecords: function(store, storeKeys) {
    this.get('retrieveRecordsArguments').push(storeKeys);
    sc_super();
  }
});

var MyApp = {};

MyApp.Todo = SC.Record.extend({
  title: SC.Record.attr(String),
  project: SC.Record.toOne("MyApp.Project", {
    inverse: "todos", isMaster: NO
  })
});

MyApp.Project = SC.Record.extend({
  name: SC.Record.attr(String),
  todos: SC.Record.toMany("MyApp.Todo", {
    inverse: "project", isMaster: YES
  })
});

module("SC.Record.toMany array with data source", {
  setup: function() {
    window.MyApp = MyApp;
    window.MyDataSource = MyDataSource;
  },
  teardown: function() {
    window.MyApp = null;
    window.MyDataSource = null;
  }
});

test("when retrieving records with toMany association, it should call retrieveRecords once instead of calling retrieveRecord multiple times");
/** WON'T FIX AT THIS TIME.

Yes, iterating a toMany attribute will call retrieveRecord for each individual index, but we cannot change this. If we tried to buffer all calls to retrieveRecord then we will break the existing contract that retrieveRecord and retrieveRecords will return immediately with storeKeys if the data source is going to handle it. Plus there are alternatives. The custom datasource could use invokeOnce and a temporary cache to buffer all calls to retrieveRecord in order to build a single request out of multiple ids. This is the most feasible, because it's highly dependent on the datasource/backend configuration. The other alternative is that the backend should return the related records when the main record is requested in a single request (again, highly dependent on the datasource/backend configuration).

To do it within SproutCore itself would mean a big change along the lines of how every app works with the store and so it will certainly have to wait until a major version.

, function() {
  var store = SC.Store.create().from("MyDataSource");
  SC.RunLoop.begin();
  store.loadRecords(MyApp.Project, [
    {
      guid: 1,
      name: 'SproutCore',
      todos: [1, 2, 3]
    }
  ]);
  SC.RunLoop.end();

  SC.RunLoop.begin();
  var todos = store.find(MyApp.Project, 1).get('todos').toArray();
  SC.RunLoop.end();

  same(todos.length, 3);
  // retrieveRecords should be called only once
  same(store.get('dataSource').get('retrieveRecordsArguments').length, 1);
});
*/
