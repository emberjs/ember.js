// ==========================================================================
// Project:   TestRunner
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global TestRunner */

/**

  The currently selected test in detail view.

  @extends SC.ObjectController
*/
TestRunner.testController = SC.ObjectController.create(
/** @scope TestRunner.testController.prototype */ {

  contentBinding: SC.Binding.oneWay('TestRunner.testsController.selection').single(),

  /**
    Adds a random number onto the end of the URL to force the iframe to reload.
  */
  uncachedUrl: function () {
    var url = this.get('url');

    return url ? [url, Date.now()].join('?') : url;
  }.property('url')

});
