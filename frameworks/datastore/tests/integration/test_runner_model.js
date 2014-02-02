// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module test ok equals same */

var TestRunner;
module("Sample Model from TestRunner Application", { 
  setup: function() {

    // namespace
    TestRunner = SC.Object.create({
      store: SC.Store.create()
    });

    // describes a single target.  has target name, target type, and url to 
    // load tests.
    TestRunner.Target = SC.Record.extend({

      /** test name */
      name: SC.Record.attr(String),
      
      /** test type - one of 'app', 'framework', 'sproutcore' */
      type: SC.Record.attr(String, { only: 'single group all'.w() }),

      /** Fetches list of tests dynamically */
      tests: SC.Record.fetch('TestRunner.Test')

    });

    /* JSON:
    
     { 
       link_test:  "url to laod test",
        },
    */ 
    TestRunner.Test = SC.Record.extend({
      
      // testName
      testUrl: SC.Record.attr({
        key: 'link_test'
      }),
      
      target: SC.Record.attr('TestRunner.Target', {
        inverse: 'tests',
        isMaster: YES,
        isEditable: NO
      })
      
    });

  }
});

