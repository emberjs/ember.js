// ==========================================================================
// Project:   TestRunner.OffsetCheckboxView
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*globals TestRunner */

/**

  This special view class will automatically adjusts its left offset based
  on an "offset" value, which is will be bound to the width of the split view.

  This way when you resize the split view, the checkbox view will move also.

  @extends SC.CheckboxView
*/
TestRunner.OffsetCheckboxView = SC.CheckboxView.extend(
/** @scope TestRunner.OffsetCheckboxView.prototype */ {

  /** bind to thickness of splitview (though a controller) */
  offset: 0,

  offsetDidChange: function() {
    this.adjust('left', this.get('offset')+6);
  }.observes('offset')

});
