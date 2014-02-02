// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @private
  SC.SplitChild and SC.SplitThumb both share this code, but we don't want it
  included twice if the view mixes in both SC.SplitChild and SC.SplitThumb.
*/
SC.NeedsSplitParent = {

  /**
   * The SplitView that contains the child views to be adjusted.
   *
   * This is computed to be the first SplitView found in a search
   * up the view hierarchy. You can substitute your own SplitView
   *
   * @property SC.SplitView
  */
  splitView: function () {
    var view = this.get('parentView');
    while (view && !view.isSplitView) view = view.get('parentView');
    return view;
  }.property('parentView').cacheable(),

  /**
   * The layoutDirection of the SplitView. This is observed so that we
   * can update positioning if the layoutDirection changes but the position
   * and size properties do not.
   *
   * @type {LayoutDirection}
  */
  // NOTE: While an edge case, this is implemented because it makes it _much_
  // easier to write the sample in the Test Controls app.
  splitViewLayoutDirection: null,
  splitViewLayoutDirectionBinding: SC.Binding.oneWay('*splitView.layoutDirection')

};


/**
  @namespace
  Child views of SplitViews should use this mixin to get their positioning
  logic and default settings.

  By default, SplitView merely sets the position and size properties on its
  child views. This mixin observes the position and size properties and
  calls adjust().
*/
SC.SplitChild =
  /** @scope SC.SplitChild.prototype */{
  /**
   * Set to YES if your Split Child is a divider view.
   *
   * @type Boolean
  */
  isSplitDivider: NO,

  /**
   * The minimum size for the SC.SplitView child. This view will
   * be unable to be resized smaller than this size.
   *
   * @default 100
   *
   * @type {Number}
  */
  minimumSize: 100,

  /**
   * The maximum size for the SC.SplitView child. This view will
   * be unable to be resized to a size larger than this value.
   *
   * If undefined, there is no limit.
   *
   * @default 100
   *
   * @type {Number}
  */
  maximumSize: undefined,

  /**
   * The current size of the SC.SplitView child. Use this to set the default
   * size.
   *
   * If you specify a size, autoResizeStyle will default to SC.RESIZE_MANUAL;
   * if you don't, SplitView will assume you want it to fill the available space
   * and use SC.RESIZE_AUTOMATIC.
   *
   * @default undefined
   *
   * @type Number
  */
  size: undefined,

  /**
   * [RO] The current position of the SC.SplitView. This is read-only, and is set
   * by the SplitView as it positions the views.
   *
   * @type Number
  */
  position: 0,

  /**
   * An amount to add to the position when adjusting layout.
   *
   * For example, if SC.SplitView positions this view at 100, and
   * positionOffset is -5, the view's layout will will have a position of 95.
   *
   * This can be used in conjunction with sizeOffset to make dividers
   * overlap the other views in the SplitView to have a larger grab area.
   *
   * TODO: Get this value from theme.
   *
   * @type Number
  */
  positionOffset: SC.propertyFromRenderDelegate('splitPositionOffset', 0),

  /**
   * An amount to add to the assigned size when adjusting layout.
   *
   * For example, if SC.SplitView gives this view a size of 1, but the
   * sizeOffset is 10, the view's layout will be given a width or height of 11.
   *
   * This can be used in conjunction with positionOffset to make dividers
   * overlap the other views in the SplitView to have a larger grab area.
   *
   * TODO: Get this value from theme.
   *
   * @type Number
  */
  sizeOffset: SC.propertyFromRenderDelegate('splitSizeOffset', 0),

  /**
   * If YES, the SC.SplitView can collapse this view when the user
   * double-clicks an adjacent divider, or when the view is resized
   * to a size smaller than the collapseAtSize.
   *
   * @type {Boolean}
  */
  canCollapse: NO,

  /**
   * If the user attempts to resize the view to a size below this number,
   * the view will collapse.
   *
   * If undefined, the view cannot be collapsed due to a resize.
   *
   * @type {Number}
  */
  collapseAtSize: undefined,

  /**
   * When (and if) the view should automatically resize due to the SplitView changing size.
   *
   * - SC.RESIZE_AUTOMATIC: always resize when the SplitView changes size.
   * - SC.RESIZE_MANUAL: resize only when the user moves a divider, or all
   *   SC.RESIZE_AUTOMATIC views have already been resized as much as possible.
   * - SC.FIXED_SIZE: Never resize.
   *
   * If you specify an autoResizeStyle, it will be used. If you leave it at `undefined`,
   * it will look at `size`: if a `size` is supplied, it will use `SC.RESIZE_MANUAL`; otherwise
   * it will use `SC.RESIZE_AUTOMATIC`.
   *
   * @default based on size
   * @type {AutoResizeStyle}
  */
  autoResizeStyle: undefined,

  /**
   * If NO, moving the divider before this view will not resize the view, but
   * instead, move it—causing further views to move as well. Most SplitView
   * children will want this set to YES.
   *
   * @type Boolean
  */
  compensatesForMovement: YES,

  /**
   * When NO, the view can only be adjusted when the user drags a divider
   * immediately adjacent to it. If YES, the view can be adjusted indirectly
   * from earlier dividers as well.
   *
   * For example, assume you have a 3-pane setup. Increasing the size of left pane will
   * resize the middle one until its minimum size is reached. SplitView will then
   * try to adjust the right pane. If the right pane has allowsIndirectAdjustments
   * set to YES, SplitView will shrink the right pane to make way. If NO, the
   * left pane will be unable to resize further.
   *
   * Default: YES.
   *
   * @type {Boolean}
  */
  allowsIndirectAdjustments: YES,

  /** @private Include SC.NeedsSplitParent if it hasn't already been included. */
  initMixin: function () {
    if (!this.splitView) {
      this.mixin(SC.NeedsSplitParent);
    }
  },

  //
  // Positioning logic
  //
  _scsvc_positionOrSizeDidChange: function() {
    this.invokeOnce('splitChildLayoutDidChange');
  }.observes('position', 'size'),

  /**
   * Called when either the position or size of the child has changed, and layout
   * needs to be updated accordingly. You may override this method to take into
   * account any custom layout. The default handles the position- and sizeOffset
   * properties by adding them to the position and size, respectively.
   *
   * For instance, while the default implementation changes left/right/width/height
   * to fill in one direction and fit in the allocated position in the other, you could
   * make it only set left/width or top/height.
   *
  */
  splitChildLayoutDidChange: function() {
    var split = this.get('splitView');
    if (!split) return;

    var position = this.get('position') + this.get('positionOffset'),
        size = this.get('size') + this.get('sizeOffset');


    if (split.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
      this.set('layout', {
        left: position,
        width: size,
        top: 0, bottom: 0
      });
    } else {
      this.set('layout', {
        top: position,
        height: size,
        right: 0, left: 0
      });
    }
  },

  splitViewLayoutDirectionDidChange: function() {
    this.invokeOnce('splitChildLayoutDidChange');
  }.observes('splitViewLayoutDirection')
};
