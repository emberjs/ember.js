// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2013 7x7 Software, Inc.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global TestRunner */

/**
  The TestRunner app.

  @extends SC.Application
*/
TestRunner = SC.Application.create(
  /** @scope TestRunner.prototype */ {

  NAMESPACE: 'TestRunner',

  VERSION: '0.1.0',

  store: SC.Store.create().from('CoreTools.DataSource'),

  userDefaults: SC.UserDefaults.create({
    userDomain: 'anonymous',
    appDomain:  'SC.TestRunner'
  })

});
