// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals CoreTools */

/**
  This DataSource connects to the SproutCore sc-server to retrieve targets
  and tests.  Currently this DataSource is read only.
*/
CoreTools.DataSource = SC.DataSource.extend({

  /**
    Fetch a group of records from the data source.  Knows how to fetch
    a list of targets and tests.
  */
  fetch: function(store, query) {
    var ret = NO;
    switch(query.get('recordType')) {
      case CoreTools.Target:
        ret = this.fetchTargets(store, query);
        break;
      case CoreTools.Test:
        ret = this.fetchTests(store, query);
        break;
    }

    return ret;
  },

  // ..........................................................
  // FETCHING TARGETS
  //

  /**
    Fetch the actual targets.  Only understands how to handle a remote query.
  */
  fetchTargets: function(store, query) {

    if (!query.get('isRemote')) return NO ;

    SC.Request.getUrl(CoreTools.attachUrlPrefix('/sc/targets.json'))
      .set('isJSON', YES)
      .notify(this, 'fetchTargetsDidComplete', { query: query, store: store })
      .send();
    return YES ;
  },

  fetchTargetsDidComplete: function(request, opts) {
    var response = request.get('response'),
        query    = opts.query,
        store    = opts.store,
        storeKeys;

    if (!SC.$ok(response)) {
      console.error("TODO: Add handler when fetching targets fails");
    } else {
      storeKeys = store.loadRecords(CoreTools.Target, response);
      store.dataSourceDidFetchQuery(query, storeKeys);
    }
  },

  // ..........................................................
  // FETCHING TESTS
  //

  /**
    Load tests for a particular URL.  Only understands local querys with a
    URL.
  */
  fetchTests: function(store, query) {
    var url = query.get('url') ;

    if (!query.get('isRemote') || !url) return NO ; // not handled

    SC.Request.getUrl(url)
      .set('isJSON', YES)
      .notify(this, 'fetchTestsDidComplete', { query: query, store: store })
      .send();
    return YES ;
  },

  fetchTestsDidComplete: function(request, opts) {
    var response = request.get('response'),
        store    = opts.store,
        query    = opts.query,
        storeKeys;

    if (!SC.$ok(response)) {
      console.error("TODO: Add handler when fetching tests fails");
    } else {
      storeKeys = store.loadRecords(CoreTools.Test, response);
      store.dataSourceDidFetchQuery(query, storeKeys); // notify query loaded
    }
  }

});
