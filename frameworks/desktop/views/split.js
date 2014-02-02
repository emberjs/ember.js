// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/split_divider');

/**
  Prevents the view from getting resized when the SplitView is resized,
  or the user resizes or moves an adjacent child view.
*/
SC.FIXED_SIZE = 'sc-fixed-size';

/**
  Prevents the view from getting resized when the SplitView is resized
  (unless the SplitView has resized all other views), but allows it to
  be resized when the user resizes or moves an adjacent child view.
*/
SC.RESIZE_MANUAL = 'sc-manual-size';

/**
  Allows the view to be resized when the SplitView is resized or due to
  the user resizing or moving an adjacent child view.
*/
SC.RESIZE_AUTOMATIC = 'sc-automatic-resize';


/**
  @class

  SC.SplitView arranges multiple views side-by-side or on top of each
  other.

  By default, SC.SplitView sets `size` and `position` properties on the
  child views, leaving it up to the child view to adjust itself. For good
  default behavior, mix SC.SplitChild into your child views.

  SplitView can resize its children to fit (the default behavior),
  or resize itself to fit its children--allowing you to build column-
  based file browsers and the like. As one child (a divider, most likely)
  is moved, SplitView can move additional children to get them out of the way.

  Setting Up SplitViews
  =======================================
  You can set up a split view like any other view in SproutCore:

      SplitView.design({
        childViews: ['leftPanel', 'rightPanel'],

        leftPanel: SC.View.design(SC.SplitChild, {
          minimumSize: 200
        }),

        rightPanel: SC.View.design(SC.SplitChild, {
          // it is usually the right panel you want to resize
          // as the SplitView resizes:
          autoResizeStyle: SC.RESIZE_AUTOMATIC
        })
      })

  Dividers
  ------------------------------------------
  Dividers are automatically added between every child view.

  You can specify what dividers to create in two ways:

  - Set splitDividerView to change the default divider view class to use.

  - Override splitDividerViewBetween(splitView, view1, view2), either in
    your subclass of SC.SplitView or in a delegate, and return the divider
    view instance that should go between the two views.

  As far as SplitView is concerned, dividers are actually just ordinary
  child views. They usually have an autoResizeStyle of SC.FIXED_SIZE, and
  usually mixin SC.SplitThumb to relay mouse and touch events to the SplitView.
  To prevent adding dividers between dividers and views or dividers and dividers,
  SC.SplitView marks all dividers with an isSplitDivider property.

  If you do not want to use split dividers at all, or wish to set them up
  manually in your childViews array, set splitDividerView to null.

  @extends SC.View
  @author Alex Iskander
*/
SC.SplitView = SC.View.extend({
  /**@scope SC.SplitView.prototype*/

  classNames: ['sc-split-view'],

  childViews: ['topLeftView', 'bottomRightView'],

  // used by the splitView computed property to find the nearest SplitView.
  isSplitView: YES,

  /**
   * The type of view to create for the divider views. SC.SplitDividerView by default.
   *
   * Should be a class, not an instance.
   *
   * @type {SC.View}
  */
  splitDividerView: SC.SplitDividerView,

  /**
   * Determines whether the SplitView should lay out its children
   * horizontally or vertically.
   *
   * Possible values:
   *
   * - SC.LAYOUT_HORIZONTAL: side-by-side
   * - SC.LAYOUT_VERTICAL: on top of each other
   *
   * @type LayoutDirection
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /**
   * Determines whether the SplitView should attempt to resize its
   * child views to fit within the SplitView's own frame (the default).
   *
   * If NO, the SplitView will decide its own size based on its children.
   *
   * @type Boolean
   * @default YES
  */
  shouldResizeChildrenToFit: YES,

  /**
   * The cursor of the child view currently being dragged (if any).
   * This allows the cursor to be used even if the user drags "too far",
   * past the child's own boundaries.
   *
   * @type {String}
  */
  splitChildCursorStyle: null,

  /**
    @private
    Only occurs during drag, which only happens after render, so we
    update directly.
  */
  _scsv_splitChildCursorDidChange: function() {
    this.get('cursor').set('cursorStyle', this.get('splitChildCursorStyle'));
  }.observes('splitChildCursorStyle'),


  // set up the SC.Cursor instance that this view and all the subviews
  // will share.
  init: function() {
    this.cursor = SC.Cursor.create();
    sc_super();
  },

  //
  // RENDERING
  // Things like layoutDirection must be rendered as class names.
  // We delegate to a render delegate.
  //
  displayProperties: ['layoutDirection'],
  renderDelegateName: 'splitRenderDelegate',

  //
  // UTILITIES
  //
  /**
   * @private
   * Returns either the width or the height of the SplitView's frame,
   * depending on the value of layoutDirection. If layoutDirection is
   * SC.LAYOUT_HORIZONTAL, this will return the SplitView's width; otherwise,
   * the SplitView's height.
   *
   * @property
   * @type {Number}
  */
  _frameSize: function(){
    if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
      return this.get('frame').width;
    } else {
      return this.get('frame').height;
    }
  }.property('frame', 'layoutDirection').cacheable(),

  viewDidResize: function () {
    this.scheduleTiling();

    sc_super();
  },

  layoutDirectionDidChange: function() {
    this.scheduleTiling();
  }.observes('layoutDirection'),

  //
  // PUBLIC CHILD VIEW ADJUSTMENT API
  //
  /**
   * Attempts to adjust the position of a child view, such as a divider.
   *
   * The implementation for this may be overridden in the delegate method
   * splitViewAdjustPositionForChild.
   *
   * You may use this method to automatically collapse the view by setting
   * the view's position to the position of the next or previous view (accessible
   * via the child's nextView and previousView properties and the
   * getPositionForChild method).
   *
   * @param {SC.View} child The child to move.
   * @param {Number} position The position to move the child to.
   * @returns {Number} The position to which the child was actually moved.
  */
  adjustPositionForChild: function(child, position){
    return this.invokeDelegateMethod(this.get('delegate'), 'splitViewAdjustPositionForChild', this, child, position);
  },

  /**
   * Returns the position within the split view for a child view,
   * such as a divider. This position is not necessarily identical
   * to the view's actual layout 'left' or 'right'; that position could
   * be offset--for instance, to give a larger grab area to the divider.
   *
   * The implementation for this is in the delegate method
   * splitViewGetPositionForChild.
   *
   * @param {SC.View} child The child whose position to find.
   * @returns {Number} The position.
  */
  getPositionForChild: function(child){
    return this.invokeDelegateMethod(this.get('delegate'), 'splitViewGetPositionForChild', this, child);
  },

  //
  // CHILD VIEW MANAGEMENT
  //

  // When children are added and removed, we must re-run the setup process that
  // sets the SplitView child properties such as nextView, previousView, etc.,
  // and which adds dividers.
  didAddChild: function() {
    // we have to add a guard because _scsv_setupChildViews may add or remove
    // dividers, causing this method to be called again uselessly.
    // this is purely for performance. The guard goes here, rather than in
    // setupChildViews, because of the invokeOnce.
    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  didRemoveChild: function() {
    // we have to add a guard because _scsv_setupChildViews may add or remove
    // dividers, causing this method to be called again uselessly.
    // this is purely for performance. The guard goes here, rather than in
    // setupChildViews, because of the invokeOnce.
    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  createChildViews: function() {
    sc_super();

    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  /**
   * @private
   * During initialization and whenever the child views change, SplitView needs
   * to set some helper properties on the children and create any needed dividers.
   *
   * Note: If dividers are added, childViews changes, causing this to be called again;
   * this is proper, because this updates the nextView, etc. properties appropriately.
   *
   * The helper properties are: previousView, nextView, viewIndex.
  */
  _scsv_setupChildViews: function() {
    var del = this.get('delegate'),

        children = this.get('childViews').copy(), len = children.length, idx,
        child, lastChild, lastNonDividerChild,

        oldDividers = this._scsv_dividers || {}, newDividers = {}, divider, dividerId;

    // loop through all children, keeping track of the previous child
    // as we loop using the lastChild variable.
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      // do initial setup of things like autoResizeStyle:
      if (!child.get('autoResizeStyle')) {
        if (child.get('size') !== undefined) {
          child.set('autoResizeStyle', SC.RESIZE_MANUAL);
        } else {
          child.set('autoResizeStyle', SC.RESIZE_AUTOMATIC);
        }
      }

      // we initialize the size first thing in case the size is empty (fill)
      // if it is empty, the way we position the views would lead to inconsistent
      // sizes. In addition, we will constrain all initial sizes so they'll be valid
      // when/if we auto-resize them.
      var size = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);
      size = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);
      this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, child, size);

      child.previousView = lastChild;
      child.nextView = undefined;
      child.viewIndex = idx;

      if (lastChild) {
        lastChild.nextView = child;
      }

      if (lastNonDividerChild && !child.isSplitDivider) {
        dividerId = SC.guidFor(lastNonDividerChild) + "-" + SC.guidFor(child);

        divider = oldDividers[dividerId];

        // if the previous view is a divider, but is not in our set of dividers,
        // then it is manually created. If it is manually created, we should not
        // create a new one.
        if (!divider && !lastChild.isSplitDivider) {
          divider = this.invokeDelegateMethod(del, 'splitViewDividerBetween', this, lastNonDividerChild, child);
        }

        if (divider) {
          divider.isSplitDivider = YES;
          newDividers[dividerId] = divider;

          if (oldDividers[dividerId]) {
            delete oldDividers[dividerId];
          } else {
            this.insertBefore(divider, child);
          }
        }
      }


      lastChild = child;
      if (!child.isSplitDivider) lastNonDividerChild = child;
    }

    // finally, remove all dividers that we didn't keep
    for (dividerId in oldDividers) {
      oldDividers[dividerId].destroy();
    }

    this._scsv_dividers = newDividers;

    // retile immediately.
    this._scsv_tile();
  },

  //
  // BASIC LAYOUT CODE
  //

  /**
    Whether the SplitView needs to be re-laid out. You can change this by
    calling scheduleTiling.
  */
  needsTiling: YES,

  /**
    Schedules a retile of the SplitView.
  */
  scheduleTiling: function() {
    this.set('needsTiling', YES);
    this.invokeOnce('_scsv_tile');
  },

  tileIfNeeded: function() {
    if (!this.get('needsTiling')) return;
    this._scsv_tile();
  },

  /**
   * @private
   * Tiling is the simpler of two layout paths. Tiling lays out all of the
   * children according to their size, and, if shouldResizeChildrenToFit is
   * YES, attempts to resize the children to fit in the SplitView.
   *
   * It is called when the child views are initializing or have changed, and
   * when the SplitView is resized.
   *
  */
  _scsv_tile: function() {
    var del = this.get('delegate');

    // LOGIC:
    //
    // - Call splitViewLayoutChildren delegate method to position views and
    //   find total size.
    //
    // - If meant to automatically resize children to fit, run the
    //   splitViewResizeChildrenToFit delegate method.
    //
    // - Call splitViewLayoutChildren again if splitViewResizeChildrenToFit was called.
    //
    // - If not meant to automatically resize children to fit, change the SplitView
    //   size to match the total size of all children.

    var size, frameSize = this.get('_frameSize');

    size = this.invokeDelegateMethod(del, 'splitViewLayoutChildren', this);

    if (this.get('shouldResizeChildrenToFit') && size !== frameSize) {
      this.invokeDelegateMethod(del, 'splitViewResizeChildrenToFit', this, size);
      size = this.invokeDelegateMethod(del, 'splitViewLayoutChildren', this);
    }

    if (!this.get('shouldResizeChildrenToFit')) {
      if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
        this.adjust('width', size);
      } else {
        this.adjust('height', size);
      }
    }

    this.set('needsTiling', NO);
  },

  /**
   * Lays out the children one next to each other or one on top of the other,
   * based on their sizes. It returns the total size.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView whose children need layout.
   * @returns {Number} The total size of all the SplitView's children.
  */
  splitViewLayoutChildren: function(splitView) {
    var del = this.get('delegate');

    var children = this.get('childViews'), len = children.length, idx,
        child, pos = 0;

    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      this.invokeDelegateMethod(del, 'splitViewSetPositionForChild', this, children[idx], pos);
      pos += this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, children[idx]);
    }

    return pos;
  },

  /**
   * Attempts to resize the child views of the split view to fit in the SplitView's
   * frame. So it may proportionally adjust the child views, the current size of the
   * SplitView's content is passed.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SC.SplitView whose children should be resized.
   * @param {Number} contentSize The current not-yet-resized size of the SplitView's content.
  */
  splitViewResizeChildrenToFit: function(splitView, contentSize) {
    var del = this.get('delegate');

    // LOGIC:
    //
    //   - 1) Size auto-resizable children in proportion to their existing sizes to attempt
    //     to fit within the target size— auto-resizable views have autoResizeStyle set
    //     to SC.RESIZE_AUTOMATIC.
    //
    //   - 2) Size non-auto-resizable children in proportion to their existing sizes—these
    //     views will _not_ have an autoResizeStyle of SC.RESIZE_AUTOMATIC.
    //

    var frameSize = this.get('_frameSize');
    var children = this.get('childViews'), len = children.length, idx,
        child, resizableSize = 0, nonResizableSize = 0, childSize;

    // To do this sizing while keeping things proportionate, the total size of resizable
    // views and the total size of non-auto-resizable views must be calculated independently.
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      childSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);

      if (this.invokeDelegateMethod(del, 'splitViewShouldResizeChildToFit', this, child)) {
        resizableSize += childSize;
      } else {
        nonResizableSize += childSize;
      }
    }

    var runningSize = contentSize;

    // we run through each twice: non-aggressively, then aggressively. This is controlled by providing
    // a -1 for the outOfSize. This tells the resizing to not bother with proportions and just resize
    // whatever it can.
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, YES, resizableSize);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, YES, -1);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, NO, nonResizableSize);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, NO, -1);
  },

  /**
   * @private
   * Utility method used by splitViewResizeChildrenToFit to do the proportionate
   * sizing of child views.
   *
   * @returns {Number} The new runningSize.
  */
  _resizeChildrenForSize: function(runningSize, targetSize, useResizable, outOfSize) {
    var del = this.get('delegate');

    var children = this.get('childViews'), idx, len = children.length, child;

    var diff = targetSize - runningSize;
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      var originalChildSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child),
          size = originalChildSize;

      var isResizable = this.invokeDelegateMethod(del, 'splitViewShouldResizeChildToFit', this, child);
      if (isResizable === useResizable) {
        // if outOfSize === -1 then we are aggressively resizing (not resizing proportionally)
        if (outOfSize === -1) size += diff
        else size += (size / outOfSize) * diff;

        size = Math.round(size);

        size = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);
        this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, child, size);


        // we remove the original child size—but we don't add it back.
        // we don't add it back because the load is no longer shared.
        if (outOfSize !== -1) outOfSize -= originalChildSize;
      }

      // We modify the old size to account for our changes so we can keep a running diff
      runningSize -= originalChildSize;
      runningSize += size;
      diff = targetSize - runningSize;
    }

    return runningSize;
  },

  /**
   * Determines whether the SplitView should attempt to resize the specified
   * child view when the SplitView's size changes.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView that owns the child.
   * @param {SC.View} child The child view.
   * @returns {Boolean}
  */
  splitViewShouldResizeChildToFit: function(splitView, child) {
    return (
      this.get('shouldResizeChildrenToFit')  &&
      child.get('autoResizeStyle') === SC.RESIZE_AUTOMATIC
    );
  },

  /**
   * Attempts to move a single child from its current position to
   * a desired position.
   *
   * You may override the behavior on a delegate.
   *
   * @param {SC.SplitView} splitView The splitView whose child should be moved.
   * @param {SC.View} child The child which should be moved.
   * @param {Number} position The position to attempt to move the child to.
   * @returns {Number} The final position of the child.
  */
  splitViewAdjustPositionForChild: function(splitView, child, position) {
    var del = this.get('delegate');
    // Unlike tiling, the process of moving a child view is much more sophisticated.
    //
    // The basic sequence of events is simple:
    //
    //  - resize previous child
    //  - resize the child itself to compensate for its movement if
    //    child.compensatesForMovement is YES.
    //  - adjust position of next child.
    //
    // As the process is recursive in both directions (resizing a child may attempt
    // to move it if it cannot be resized further), adjusting one child view could
    // affect many _if not all_ of the SplitView's children.
    //
    // For safety, sanity, and stability, the recursive chain-reactions only travel
    // in one direction; for instance, resizing the previous view may attempt to adjust
    // its position, but that adjustment will not propagate to views after it.
    //
    // This process, while powerful, has one complication: if you change a bunch of views
    // before a view, and then _fail_ to move views after it, the views before must be
    // moved back to their starting points. But if their positions were changed directly,
    // this would be impossible.
    //
    // As such, the positions are not changed directly. Rather, the changes are written
    // to a _plan_, and changes only committed once everything is finalized.
    //
    // splitViewAdjustPositionForChild is the entry point, and as such is responsible
    // for triggering the creation of the plan, the needed modifications, and the
    // finalizing of it.
    var plan = this._scsv_createPlan();
    var finalPosition = this._scsv_adjustPositionForChildInPlan(plan, child, position, child);
    this._scsv_commitPlan(plan);

    return finalPosition;
  },

  /**
   * @private
   * Creates a plan in which to prepare changes to the SplitView's children.
   *
   * A plan is an array with the same number of elements as the SplitView has children.
   * Each element is a hash containing these properties:
   *
   * - child: the view the hash represents
   * - originalPosition: the position before the planning process
   * - position: the planned new position.
   * - originalSize: the size before the planning process
   * - size: the planned new size.
   *
   * The repositioning and resizing logic can, at any time, reset part of the plan
   * to its original state, allowing layout processes to be run non-destructively.
   * In addition, storing the original positions and sizes is more performant
   * than looking them up each time.
   *
   * @returns {Plan}
  */
  _scsv_createPlan: function() {
    var del = this.get('delegate'),
        plan = [], children = this.get('childViews'), idx, len = children.length,
        child, childPosition, childSize;

    for (idx = 0; idx < len; idx++) {
      child = children[idx];
      childPosition = this.invokeDelegateMethod(del, 'splitViewGetPositionForChild', this, child);
      childSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);

      plan[idx] = {
        child: child,
        originalPosition: childPosition,
        position: childPosition,
        originalSize: childSize,
        size: childSize
      };
    }

    return plan;
  },

  /**
    * @private
    * Resets a range of the plan to its original settings.
    *
    * @param {Plan} plan The plan.
    * @param {Number} first The first item in the range.
    * @param {Number} last The last item in the range.
   */
   _scsv_resetPlanRange: function(plan, first, last) {
     for (var idx = first; idx <= last; idx++) {
       plan[idx].position = plan[idx].originalPosition;
       plan[idx].size = plan[idx].originalSize;
     }
   },

  /**
   * @private
   * Commits the changes specified in the plan to the child views.
   *
   * @param {Plan} plan The plan with the changes.
  */
  _scsv_commitPlan: function(plan) {
    var del = this.get('delegate'), len = plan.length, idx, item, end = 0;

    for (idx = 0; idx < len; idx++) {
      item = plan[idx];
      if (item.size !== item.originalSize) {
        this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, item.child, item.size);
      }

      if (item.position !== item.originalPosition) {
        this.invokeDelegateMethod(del, 'splitViewSetPositionForChild', this, item.child, item.position);
      }

      end = item.position + item.size;
    }


    if (!this.get('shouldResizeChildrenToFit')) {
      if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
        this.adjust('width', end);
      } else {
        this.adjust('height', end);
      }
    }
  },

  /**
   * Moves the specified child view as close as it can to the specified
   * position, saving all changes this causes into the plan.
   *
   * The "directness" of the action also comes into play. An action is direct if:
   *
   * - The child being modified is the originating child (the one being dragged, most likely)
   * - The child is being _positioned_ as is immediately _after_ the originating child.
   * - The child is being _sized_ and is immediately _before_ the originating child.
   *
   * This means that direct actions modify the originating child or the border between
   * it and a sibling. Some child views don't like to accept indirect actions, as the
   * indirect actions may confuse or annoy users in some cases.
   *
   * @param {Plan} plan The plan write changes to (and get some data from).
   * @param {SC.View} child The child to move.
   * @param {Number} position The position to attempt to move the child to.
   * @param {Boolean} source The child from which the attempt to adjust originated—used
   * to determine directness.
   *
   * @returns {Number} The final position of the child.
  */
  _scsv_adjustPositionForChildInPlan: function(plan, child, position, source) {
    var del = this.get('delegate');

    if (
      !child.get('allowsIndirectAdjustments') &&
      source !== child && source !== child.previousView
    ) {
      return plan[child.viewIndex].position;
    }

    // since the process is recursive, we need to prevent the processing from
    // coming back in this direction.
    if (child._splitViewIsAdjusting) {
      return plan[child.viewIndex].position;
    }

    child._splitViewIsAdjusting = YES;

    //
    // STEP 1: attept to resize the previous child.
    //
    var previousChild = child.previousView, nextChild = child.nextView,
        previousChildPosition, previousChildSize,
        nextChildPosition, nextChildSize,
        size = plan[child.viewIndex].size;

    if (previousChild && !previousChild._splitViewIsAdjusting) {
      // we determine the size we would like it to be by subtracting its position
      // from the position _we_ would like to have.
      previousChildPosition = plan[previousChild.viewIndex].position;
      previousChildSize = position - previousChildPosition;

      previousChildSize = this._scsv_adjustSizeForChildInPlan(
        plan, previousChild, previousChildSize, source
      );

      // the child may not have resized/moved itself all the way, so we will
      // recalculate the target position based on how much it _was_ able to.
      position = previousChildPosition + previousChildSize;
    } else if (!previousChild) {
      // if there is no previous child view, then this is the first view and
      // as such _must_ be at 0.
      position = 0;
    }

    // further steps deal with children _after_ this one; these steps should
    // not be performed if those children are already being taken care of.
    if (nextChild && nextChild._splitViewIsAdjusting) {
      child._splitViewIsAdjusting = NO;
      plan[child.viewIndex].position = position;
      return position;
    }


    //
    // STEP 2: attempt to resize this view to avoid moving the next one.
    // Only occurs if the view's settings tell it to compensate _and_ there is a
    // next view to compensate for, or we are resizing to fit and there _is no_ next child.
    //
    if (child.get('compensatesForMovement') && nextChild) {
      nextChildPosition = plan[nextChild.viewIndex].position;
      size = this._scsv_adjustSizeForChildInPlan(plan, child, nextChildPosition - position);
    } else if (!nextChild && this.get('shouldResizeChildrenToFit')) {
      nextChildPosition = this.get('_frameSize');
      size = this._scsv_adjustSizeForChildInPlan(plan, child, nextChildPosition - position);
      position = nextChildPosition - size;
    }

    // STEP 3: attempt to move the next child to account for movement of this one.
    if (nextChild) {
      nextChildPosition = position + size;
      nextChildPosition = this._scsv_adjustPositionForChildInPlan(plan, nextChild, nextChildPosition, source);
    }

    // if we were unable to position the next child, or there is no next
    // child but we need to resize children to fit, we have to undo some
    // of our previous work.
    if (nextChildPosition && position !== nextChildPosition - size) {
      position = nextChildPosition - size;

      // then, for whatever is left, we again resize the previous view, after throwing
      // away the previous calculations.
      if (previousChild && !previousChild._splitViewIsAdjusting) {
        this._scsv_resetPlanRange(plan, 0, previousChild.viewIndex);
        previousChildSize = position - plan[previousChild.viewIndex].position;
        this._scsv_adjustSizeForChildInPlan(plan, previousChild, previousChildSize, child);
      }

    }


    plan[child.viewIndex].position = position;
    child._splitViewIsAdjusting = NO;
    return position;
  },

  _scsv_adjustSizeForChildInPlan: function(plan, child, size, source) {
    var del = this.get('delegate');

    if (
      source &&
      !child.get('allowsIndirectAdjustments') &&
      source !== child && source !== child.nextView && source !== child.previousView
    ) {
      return plan[child.viewIndex].size;
    }

    // First, see if resizing alone will do the job.
    var actualSize = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);

    plan[child.viewIndex].size = actualSize;

    if (size === actualSize) return size;

    // if not, attempt to move the view.
    var currentPosition = plan[child.viewIndex].position,
        targetPosition = currentPosition + size - actualSize;

    var position = this._scsv_adjustPositionForChildInPlan(plan, child, targetPosition, source);

    // the result is the new right edge minus the old left edge—that is,
    // the size we can pretend we are for the caller, now that we have
    // resized some other views.
    return position + actualSize - currentPosition;
  },

  /**
   * Returns a view instance to be used as a divider between two other views,
   * or null if no divider should be used.
   *
   * The value of the 'splitDividerView' property will be instantiated. The default
   * value of this property is 'SC.SplitDividerView'. If the value is null or undefined,
   * null will be returned, and the SplitView will not automatically create dividers.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The split view that is hte parent of the
   * two views.
   * @param {SC.View} view1 The first view.
   * @param {SC.View} view2 The second view.
   * @returns {SC.View} The view instance to use as a divider.
  */
  splitViewDividerBetween: function(splitView, view1, view2){
    if (!this.get('splitDividerView')) return null;

    return this.get('splitDividerView').create();
  },

  /**
   * Returns the current position for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @returns Number
  */
  splitViewGetPositionForChild: function(splitView, child) {
    return child.get('position');
  },

  /**
   * Sets the position for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The position to move the child to.
  */
  splitViewSetPositionForChild: function(splitView, child, position) {
    child.set('position', position);
  },

  /**
   * Returns the current size for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @returns Number
  */
  splitViewGetSizeForChild: function(splitView, child) {
    var size = child.get('size');
    if (SC.none(size)) return 100;

    return size;
  },

  /**
   * Sets the size for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The size to give the child.
  */
  splitViewSetSizeForChild: function(splitView, child, size) {
    child.set('size', size);
  },

  /**
   * Returns the nearest valid size to a proposed size for a child view.
   * By default, constrains the size to the range specified by the child's
   * minimumSize and maximumSize properties, and returns 0 if the child
   * has canCollapse set and the size is less than the child's collapseAtSize.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The proposed size for the child.
   * @returns Number
  */
  splitViewConstrainSizeForChild: function(splitView, child, size) {
    if (child.get('autoResizeStyle') === SC.FIXED_SIZE) {
      return this.invokeDelegateMethod(this.get('delegate'), 'splitViewGetSizeForChild', this, child);
    }

    if (child.get('canCollapse')) {
      var collapseAtSize = child.get('collapseAtSize');
      if (collapseAtSize && size < collapseAtSize) return 0;
    }

    var minSize = child.get('minimumSize') || 0;
    if (minSize !== undefined && minSize !== null) size = Math.max(minSize, size);

    var maxSize = child.get('maximumSize');
    if (maxSize !== undefined && maxSize !== null) size = Math.min(maxSize, size);

    return size;
  }
});
