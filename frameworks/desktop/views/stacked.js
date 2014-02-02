// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/collection');

/**
  @class

  A StackedView is a CollectionView that expects its content to use static
  layout to stack vertically.  This type of collection view is not designed
  for use with large size collections, but it can be very useful for
  collections with complex displays and variable heights such as comments or
  small notification queues.

  ## Static Layout

  This view makes no attempt to size or position your child views.  It assumes
  you are using StaticLayout for your child views.  If you don't enable static
  layout your views will probably overlay on top of each other and will look
  incorrect.

  Note also that the default layout for this view set's the height to "auto".
  This is usually the behavior you will want.

  @extends SC.CollectionView
  @since SproutCore 0.9
*/
SC.StackedView = SC.CollectionView.extend(
/** @scope SC.StackedView.prototype */ {

  /**
    @type Array
    @default ['sc-stacked-view']
    @see SC.View#classNames
  */
  classNames: ['sc-stacked-view'],

  /**
    Default layout for a stacked view will fill the parent view but auto-
    adjust the height of the view.

    @type Hash
    @default `{ top: 0, left: 0, right: 0, height: 1 }`
    @see SC.View#layout
  */
  layout: { top: 0, left: 0, right: 0, height: 1 },

  /**
    Return full range of its indexes for nowShowing

    @param {Rect} rect
    @returns {SC.IndexSet} full range of indexes
  */
  computeNowShowing: function () {
    return this.get('allContentIndexes');
  },

  /**
    Updates the height of the stacked view to reflect the current content of
    the view.  This is called automatically whenever an item view is reloaded.
    You can also call this method directly if the height of one of your views
    has changed.

    The height will be recomputed based on the actual location and dimensions
    of the last child view.

    Note that normally this method will defer actually updating the height
    of the view until the end of the run loop.  You can force an immediate
    update by passing YES to the "immediately" parameter.

    @param {Boolean} immediately YES to update immediately
    @returns {SC.StackedView} receiver
  */
  updateHeight: function (immediately) {
    if (immediately) this._updateHeight();
    else this.invokeLast(this._updateHeight);
    // ^ use invokeLast() here because we need to wait until all rendering has
    //   completed.

    return this;
  },

  /** @private */
  _updateHeight: function () {

    var childViews = this.get('childViews'),
        len        = childViews.get('length'),
        view, layer, height;

    if (len === 0) {
      height = 1;
    } else {
      view = childViews.objectAt(len - 1);
      layer = view ? view.get('layer') : null;
      height = layer ? (layer.offsetTop + layer.offsetHeight) : 1;
      layer = null; // avoid memory leaks
    }
    this.adjust('minHeight', height);
    this.set('calculatedHeight', height);
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Whenever the collection view reloads some views, reset the cache on the
    frame as well so that it will recalculate.
  */
  reloadIfNeeded: function () {
    sc_super();

    return this.updateHeight();
  },

  /** @private
    When layer is first created, make sure we update the height using the
    newly calculated value.
  */
  didCreateLayer: function () { return this.updateHeight(); }

});
