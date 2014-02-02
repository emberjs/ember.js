// ==========================================================================
// Project:   TestRunner.targetController
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global TestRunner */

/**

  The currently selected target.  Used by the testsController to get the
  tests of the target.  May be used by other parts of the app to control the
  selected target.

  @extends SC.ObjectController
*/
TestRunner.targetController = SC.ObjectController.create(
/** @scope TestRunner.targetController.prototype */ {

  contentBinding: SC.Binding.oneWay('TestRunner.targetsController.selection').single()

});
