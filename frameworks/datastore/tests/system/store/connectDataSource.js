// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("connecting DataSource to a store");

test("data source passed as string should be available as after running _getDataSource", function() {
  window.MyTestDataSource = SC.DataSource.extend({
    foo: 'bar'
  });

  var store = SC.Store.create().from("MyTestDataSource");
  same(store.get("dataSource"), "MyTestDataSource");

  var dataSource = store._getDataSource();
  same(dataSource.foo, 'bar');

  same(store.get('dataSource').foo, 'bar');
});

test("data source is required, if it can't be found, error should be thrown", function() {
  expect(1);

  try {
    SC.Store.create().from("SC.YourTestDataSource")._getDataSource();
  } catch (x) {
    same(x, 'SC.YourTestDataSource could not be found');
  }
});
