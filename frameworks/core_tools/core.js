// ==========================================================================
// Project:   CoreTools
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*globals CoreTools */

/**

  This framework contains common code shared by the SproutCore developer tools
  including the test runner, doc viewer and welcome apps.  It is not generally
  intended for use in your own applications.

  @extends SC.Object
*/
CoreTools = SC.Object.create( /** @scope CoreTools.prototype */ {

  NAMESPACE: 'CoreTools',
  VERSION: '1.0.0',

  attachUrlPrefix: function(url) {
    if(url && SC.urlPrefix) {
      url = SC.urlPrefix + url;
    }
    return url;
  }
}) ;
