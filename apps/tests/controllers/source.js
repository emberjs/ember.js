// ==========================================================================
// Project:   TestRunner.sourceController
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global TestRunner */

/**

  Exposed the flattened list of targets for the source list.  Computed from
  the root node generated on the targetsController.  Configure for display of
  the source list.

  @extends SC.TreeController
*/
TestRunner.sourceController = SC.TreeController.create(
/** @scope TestRunner.sourceController.prototype */ {

  contentBinding: SC.Binding.oneWay('TestRunner.targetsController.sourceRoot'),
  treeItemChildrenKey: "children",
  treeItemIsExpandedKey: "isExpanded",
  treeItemIsGrouped: true,

  allowsMultipleSelection: false,
  allowsEmptySelection: true,

  // used to set the thickness of the sidebar.  bound here.
  sidebarThickness: 200  // set default thickness in pixels

});
