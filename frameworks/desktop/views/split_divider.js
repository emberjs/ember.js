// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/split_child');
sc_require('mixins/split_thumb');

/**
  @class

  A SplitDividerView sits between any two other views in a SplitView.
  The SplitDivider mixes in SC.SplitThumb to allow the user to drag
  it around. The dragging process will cause SC.SplitView to adjust
  other children as needed.

  @extends SC.View
  @author Alex Iskander
*/
SC.SplitDividerView = SC.View.extend(SC.SplitChild, SC.SplitThumb,
{
  /** @scope SC.SplitDividerView.prototype */
  classNames: ['sc-split-divider-view'],
  
  // set to prevent SC.SplitView from automatically creating dividers
  // to sit between this divider and another view.
  isSplitDivider: YES,

  // NOTE: 'sc-fixed-size' is only hard-coded because SC.SplitView requires
  // this file, and SC.FIXED_SIZE is defined inside SC.SplitView.
  autoResizeStyle: 'sc-fixed-size',
  
  movesSibling: SC.MOVES_CHILD,
  
  size: SC.propertyFromRenderDelegate('dividerSize', 10),

  renderDelegateName: 'splitDividerRenderDelegate'
});
