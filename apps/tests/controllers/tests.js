// ==========================================================================
// Project:   TestRunner.testsController
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global TestRunner */

/**

  Manages the list of tests for the currently focused target.

  @extends SC.ArrayController
*/
TestRunner.testsController = SC.ArrayController.create(
/** @scope TestRunner.testsController.prototype */ {

  contentBinding: SC.Binding.oneWay('TestRunner.targetController.tests'),

  /**
    Enables/disables continuous integration mode.
  */
  useContinuousIntegration: NO,

  statusDidChange: function () {
    if (this.get('status') === SC.Record.READY_CLEAN) {
      TestRunner.statechart.resumeGotoState();
    }
  }.observes('status')

});
