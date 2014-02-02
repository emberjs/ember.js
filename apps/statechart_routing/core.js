// ==========================================================================
// Project:   Test
// Copyright: @2011 My Company, Inc.
// ==========================================================================
/*globals Test */

/**

  My cool new app.  Describe your application.

  @extends SC.Object
*/
Test = SC.Application.create(
  /** @scope Test.prototype */ {

  NAMESPACE: 'Test',
  VERSION: '0.1.0',

  store: SC.Store.create().from(SC.Record.fixtures),

  MODE_FOO: 0,

  MODE_BAR: 1

}) ;
