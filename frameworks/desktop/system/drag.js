// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @static
*/
SC.DRAG_LINK = 0x0004;

/**
  @static
*/
SC.DRAG_COPY = 0x0001;

/**
  @static
*/
SC.DRAG_MOVE = 0x0002;

/**
  @static
*/
SC.DRAG_NONE = 0x0000;

/**
  @static
*/
SC.DRAG_ANY = 0x000F;

/**
  @static
*/
SC.DRAG_DATA = 0x0008; // includes SC.DRAG_REORDER

/**
  @static
*/
SC.DRAG_AUTOSCROLL_ZONE_THICKNESS = 20;

SC.View.reopen(
  /** @scope SC.View.prototype */ {

  /** @private */
  init: function (original) {
    original();

    // register for drags
    if (this.get('isDropTarget')) { SC.Drag.addDropTarget(this); }

    // register scroll views for autoscroll during drags
    if (this.get('isScrollable')) { SC.Drag.addScrollableView(this); }
  }.enhance(),

  /** @private */
  destroy: function (original) {
    // unregister for drags
    if (this.get('isDropTarget')) { SC.Drag.removeDropTarget(this); }

    // unregister for autoscroll during drags
    if (this.get('isScrollable')) { SC.Drag.removeScrollableView(this); }

    return original();
  }.enhance()
});

/**
  @class

  An instance of this object is created whenever a drag occurs.  The instance
  manages the mouse/touch events and coordinating with droppable targets until the
  user releases the mouse button.

  To initiate a drag, you should call `SC.Drag.start()` with the options below
  specified in a hash. Pass the ones you need to get the drag you want:

    - `event` -- *(req)* The mouse event/touch that triggered the drag.  This will be used
      to position the element.

    - `source` -- *(req)* The drag source object that should be consulted during
      the drag operations. This is usually the container view that initiated
      the drag.

    - `dragView` -- Optional view that will be used as the source image for the
      drag. The drag operation will clone the DOM elements for this view and
      parent them under the drag pane, which has the class name `sc-ghost-view`.
      The drag view is not moved from its original location during a drag.
      If the dragView is not provided, the source is used as dragView.

    - `ghost` -- `YES` | `NO`  If `NO`, the drag view image will show, but the source
      `dragView` will not be hidden.  Set to `YES` to make it appear that the
      `dragView` itself is being dragged around.

    - `slideBack` -- `YES` | `NO`  If `YES` and the drag operation is cancelled, the
      `dragView` will slide back to its source origin.

    - `origin` --  If passed, this will be used as the origin point for the
      ghostView when it slides back.  You normally do not need to pass this
      unless the ghost view does not appear in the main UI.

    - `data` -- Optional hash of data types and values.  You can use this to pass
      a static set of data instead of providing a dataSource.  If you provide
      a dataSource, it will be used instead.

    - `dataSource` --  Optional object that will provide the data for the drag to
      be consumed by the drop target.  If you do not pass this parameter or the
      data hash, then the source object will be used if it implements the
      SC.DragDataSource protocol.

    - `anchorView` -- if you pass this optional view, then the drag will only be
      allowed to happen within this view.  The ghostView will actually be added
      as a child of this view during the drag.  Normally the anchorView is the
      window.

  @extends SC.Object
*/
SC.Drag = SC.Object.extend(
/** @scope SC.Drag.prototype */ {

  /**
    The source object used to coordinate this drag.

    @readOnly
    @type SC.DragSource
  */
  source: null,

  /**
    The view actually dragged around the screen. This is created automatically
    from the dragView.

    @readOnly
    @type SC.View
  */
  ghostView: null,

  /**
    If `YES`, then the `ghostView` will acts like a cursor and attach directly
    to the mouse/touch location.

    @readOnly
    @type Boolean
  */
  ghostActsLikeCursor: NO,

  /**
    The view that was used as the source of the `ghostView`.

    The drag view is not moved from its original location during a drag.
    Instead, the DOM content of the view is cloned and managed by the
    ghostView.  If you want to visually indicate that the view is being
    moved, you should set ghost to `YES`.
    If dragView is not provided the source is used instead.

    @readOnly
    @type SC.View
  */
  dragView: null,

  /**
    If `YES`, the `dragView` is automatically hidden while dragging around the
    ghost.

    @readOnly
    @type Boolean
  */
  ghost: YES,

  /**
    If `NO`, the source will not be copied, clone, no ghost view will get created,
    and it won't be moved.

    @type Boolean
  */
  sourceIsDraggable: YES,

  /**
    If `YES`, then the `ghostView` will slide back to its original location if
    drag is cancelled.

    @type Boolean
  */
  slideBack: YES,

  /**
    The origin to slide back to in the coordinate of the `dragView`'s
    containerView.

    @type Point
  */
  ghostOffset: { x: 0, y: 0 },

  /**
    The current location of the mouse pointer in window coordinates. This is
    updated as long as the mouse button is pressed or touch is active. Drop targets are
    encouraged to update this property in their `dragUpdated()` method
    implementations.

    The ghostView will be positioned at this location.

    @type Point
  */
  location: {},

  // ..........................................
  // DRAG DATA
  //

  /**
    Data types supported by this drag operation.

    Returns an array of data types supported by the drag source.  This may be
    generated dynamically depending on the data source.

    If you are implementing a drag source, you will need to provide these data
    types so that drop targets can detect if they can accept your drag data.

    If you are implementing a drop target, you should inspect this property
    on your `dragEntered()` and `prepareForDragOperation()` methods to determine
    if you can handle any of the data types offered up by the drag source.

    @type Array
  */
  dataTypes: function () {
    // first try to use the data source.
    if (this.dataSource) return this.dataSource.get('dragDataTypes') || [];

    // if that fails, get the keys from the data hash.
    var hash = this.data;
    if (hash) {
      var ret = [];
      for (var key in hash) {
        if (hash.hasOwnProperty(key)) ret.push(key);
      }
      return ret;
    }

    // if that fails, then check to see if the source object is a dataSource.
    var source = this.get('source');
    if (source && source.dragDataTypes) return source.get('dragDataTypes') || [];

    // no data types found. :(
    return [];
  }.property().cacheable(),

  /**
    Checks for a named data type in the drag.

    @param {String} dataType the data type
    @returns {Boolean} YES if data type is present in dataTypes array.
  */
  hasDataType: function (dataType) {
    return (this.get('dataTypes').indexOf(dataType) >= 0);
  },

  /**
    Retrieve the data for the specified `dataType` from the drag source.

    Drop targets can use this method during their `performDragOperation()`
    method to retrieve the actual data provided by the drag data source.  This
    data may be generated dynamically depending on the data source.

    @param {Object} dataType data type you want to retrieve.  Should be one of
      the values returned in the dataTypes property
    @returns {Object} The generated data.
  */
  dataForType: function (dataType) {
    // first try to use the data Source.
    if (this.dataSource) {
      return this.dataSource.dragDataForType(this, dataType);

    // then try to use the data hash.
    } else if (this.data) {
      return this.data[dataType];

    // if all else fails, check to see if the source object is a data source.
    } else {
      var source = this.get('source');
      if (source && SC.typeOf(source.dragDataForType) === SC.T_FUNCTION) {
        return source.dragDataForType(this, dataType);

      // no data source found. :(
      } else return null;
    }
  },

  /**
    Optional object used to provide the data for the drag.

    Drag source can designate a `dataSource` object to generate the data for
    a drag dynamically.  The data source can and often is the drag source
    object itself.

    Data Source objects must comply with the `SC.DragDataSource` interface.  If
    you do not want to implement this interface, you can provide the data
    directly with the data property.

    If you are implementing a drop target, use the dataTypes property and
    `dataForTypes()` method to access data instead of working directly with
    these properties.

    @readOnly
    @type SC.DragDataSource
  */
  dataSource: null,

  /**
    Optional hash of data.  Used if no dataSource was provided.

    Drag sources can provide a hash of data when the drag begins instead of
    specifying an actual dataSource.  The data is stored in this property.
    If you are implementing a drop target, use the dataTypes property and
    `dataForTypes()` method to access data instead of working directly with
    these properties.

    @readOnly
    @type Hash
  */
  data: null,

  /**
    Returns the currently allowed `dragOperations` for the drag.  This will be
    set just before any callbacks are invoked on a drop target.  The drag
    source is given an opportunity to set these operations.

    @readOnly
    @type Number
  */
  allowedDragOperations: SC.DRAG_ANY,

  /** @private required by autoscroll */
  _dragInProgress: YES,

  /** @private
    Stores the initial visibility state of the dragView so it can be restored
    after the drag
  */
  _dragViewWasVisible: null,

  /** @private
    This will actually start the drag process. Called by SC.Drag.start().
  */
  startDrag: function () {
    if (this.get('sourceIsDraggable')) {
      // create the ghost view
      this._createGhostView();
    }

    var evt = this.event;

    // compute the ghost offset from the original start location

    var loc = { x: evt.pageX, y: evt.pageY };
    this.set('location', loc);

    if (this.get('sourceIsDraggable')) {
      var dv = this._getDragView();
      var pv = dv.get('parentView');

      // convert to global coordinates
      var origin = pv ? pv.convertFrameToView(dv.get('frame'), null) : dv.get('frame');

      if (this.get('ghost')) {
        // Hide the dragView
        this._dragViewWasVisible = dv.get('isVisible');
        dv.set('isVisible', NO);
      }

      if (this.ghostActsLikeCursor) this.ghostOffset = { x: 14, y: 14 };
      else this.ghostOffset = { x: (loc.x - origin.x), y: (loc.y - origin.y) };

      // position the ghost view
      if (!this._ghostViewHidden) this._positionGhostView(evt);

      if (evt.makeTouchResponder) {
        // Should use invokeLater if I can figure it out
        var self = this;
        SC.Timer.schedule({
          target: evt,
          action: function () {
            if (!evt.hasEnded) evt.makeTouchResponder(self, YES);
          },
          interval: 1
        });
      }
      else {
        // notify root responder that a drag is in process
        this.ghostView.rootResponder.dragDidStart(this, evt);
      }
    }

    var source = this.source;
    if (source && source.dragDidBegin) source.dragDidBegin(this, loc);

    // let all drop targets know that a drag has started
    var ary = this._dropTargets();

    for (var idx = 0, len = ary.length; idx < len; idx++) {
      ary[idx].tryToPerform('dragStarted', this, evt);
    }
  },

  /** @private
    Cancel the drag operation.

    This is called by RootResponder's keyup method when the user presses
    escape and a drag is in progress.

    @param {Event} evt the key event
    @see SC.Drag.endDrag
  */
  cancelDrag: function (evt) {
    var target = this._lastTarget,
        loc = this.get('location');

    if (target && target.dragExited) target.dragExited(this, this._lastMouseDraggedEvent);

    this.endDrag(evt, SC.DRAG_NONE);
  },

  /** @private
    End the drag operation.

    This notifies the data source that the drag ended and removes the
    ghost view, but does not notify the drop target of a drop.

    @param {Event} evt
    @param {DragOp} op The drag operation that was performed. One of
      SC.DRAG_COPY, SC.DRAG_MOVE, SC.DRAG_LINK, or SC.DRAG_NONE.
  */
  endDrag: function (evt, op) {
    var loc = this.get('location');

    // notify all drop targets that the drag ended
    var ary = this._dropTargets();
    for (var idx = 0, len = ary.length; idx < len; idx++) {
      try {
        ary[idx].tryToPerform('dragEnded', this, evt);
      } catch (ex2) {
        SC.Logger.error('Exception in SC.Drag.mouseUp(dragEnded on %@): %@'.fmt(ary[idx], ex2));
      }
    }

    // Trigger a slide-back if triggered and if the drag was unsuccessful.
    if (this.get('sourceIsDraggable') && this.get('slideBack') && op === SC.DRAG_NONE) {
      this._slideGhostViewBack();
    }
    // Otherwise, wrap up the drag right now.
    else {
      this._endDrag();
    }
    // notify the source that everything has completed
    var source = this.source;
    if (source && source.dragDidEnd) source.dragDidEnd(this, loc, op);
  },

  // ..........................................
  // PRIVATE PROPERTIES AND METHODS
  //

  /** @private */
  touchStart: function (evt) {
    return YES;
  },

  /** @private
    This method is called repeatedly during a mouse drag.  It updates the
    position of the ghost image, then it looks for a current drop target and
    notifies it.
  */
  mouseDragged: function (evt) {
    var scrolled = this._autoscroll(evt);
    var loc = this.get('location');
    if (!scrolled && (evt.pageX === loc.x) && (evt.pageY === loc.y)) {
      return; // quickly ignore duplicate calls
    }

    // save the new location to avoid duplicate mouseDragged event processing
    loc = { x: evt.pageX, y: evt.pageY };
    this.set('location', loc);
    this._lastMouseDraggedEvent = evt;

    // STEP 1: Determine the deepest drop target that allows an operation.
    // if the drop target selected the last time this method was called
    // differs from the deepest target found, then go up the chain until we
    // either hit the last one or find one that will allow a drag operation
    var source = this.source;
    var last = this._lastTarget;
    var target = this._findDropTarget(evt); // deepest drop target
    var op = SC.DRAG_NONE;

    while (target && (target !== last) && (op === SC.DRAG_NONE)) {
      // make sure the drag source will permit a drop operation on the named
      // target
      if (target && source && source.dragSourceOperationMaskFor) {
        op = source.dragSourceOperationMaskFor(this, target);
      } else op = SC.DRAG_ANY; // assume drops are allowed

      // now, let's see if the target will accept the drag
      if ((op !== SC.DRAG_NONE) && target && target.computeDragOperations) {
        op = op & target.computeDragOperations(this, evt, op);
      } else op = SC.DRAG_NONE; // assume drops AREN'T allowed

      this.allowedDragOperations = op;

      // if DRAG_NONE, then look for the next parent that is a drop zone
      if (op === SC.DRAG_NONE) target = this._findNextDropTarget(target);
    }

    // STEP 2: Refocus the drop target if needed
    if (target !== last) {
      if (last && last.dragExited) last.dragExited(this, evt);

      if (target) {
        if (target.dragEntered) target.dragEntered(this, evt);
        if (target.dragUpdated) target.dragUpdated(this, evt);
      }

      this._lastTarget = target;
    } else {
      if (target && target.dragUpdated) target.dragUpdated(this, evt);
    }

    // notify source that the drag moved
    if (source && source.dragDidMove) source.dragDidMove(this, loc);

    // reposition the ghostView
    if (this.get('sourceIsDraggable') && !this._ghostViewHidden) this._positionGhostView(evt);
  },

  touchesDragged: function (evt) {
    this.mouseDragged(evt);
  },

  /**
    @private

    Called when the mouse is released.  Performs any necessary cleanup and
    executes the drop target protocol to try to complete the drag operation.
  */
  mouseUp: function (evt) {
    var loc    = { x: evt.pageX, y: evt.pageY },
        target = this._lastTarget,
        op     = this.allowedDragOperations;

    this.set('location', loc);

    // try to have the drop target perform the drop...
    try {
      if (target && target.acceptDragOperation && target.acceptDragOperation(this, op)) {
        op = target.performDragOperation ? target.performDragOperation(this, op) : SC.DRAG_NONE;
      } else {
        op = SC.DRAG_NONE;
      }
    } catch (e) {
      SC.Logger.error('Exception in SC.Drag.mouseUp(acceptDragOperation|performDragOperation): %@'.fmt(e));
    }

    this.endDrag(evt, op);
  },

  /** @private */
  touchEnd: function (evt) {
    this.mouseUp(evt);
  },

  /** @private
    Returns the dragView. If it is not set, the source is returned.
  */
  _getDragView: function () {
    if (!this.dragView) {
      if (!this.source || !this.source.isView) throw new Error("Source can't be used as dragView, because it's not a view.");
      this.dragView = this.source;
    }
    return this.dragView;
  },

  /** @private
    This will create the ghostView and add it to the document.
  */
  _createGhostView: function () {
    var that  = this,
        dragView = this._getDragView(),
        frame = dragView.get('borderFrame'),
        layout = dragView.get('layout'),
        ghostLayout, view;

    // Create a fixed layout for the ghost view.
    ghostLayout = { top: frame.y, left: frame.x, width: frame.width, height: frame.height };

    view = this.ghostView = SC.Pane.create({
      classNames: ['sc-ghost-view'],
      layout: ghostLayout,
      owner: this,
      wantsAcceleratedLayer: dragView.get('wantsAcceleratedLayer'),

      didCreateLayer: function () {
        if (dragView) {
          var dragLayer = dragView.get('layer');
          if (dragLayer) {
            var layer = dragLayer.cloneNode(true);

            // Canvas elements need manual copying.
            var dragCanvasses = dragView.$().find('canvas');
            if (dragCanvasses.length) {
              var ghostCanvasses = $(layer).find('canvas'),
                  len = dragCanvasses.length,
                  i, dragCanvas, ghostCanvas;
              for (i = 0; i < len; i++) {
                dragCanvas = dragCanvasses[i];
                ghostCanvas = ghostCanvasses[i];
                ghostCanvas.width = dragCanvas.width;
                ghostCanvas.height = dragCanvas.height;
                ghostCanvas.getContext('2d').drawImage(dragCanvas, 0, 0);
              }
            }

            // Make sure the layer we put in the ghostView wrapper is not displaced.
            layer.style.top = "0px";
            layer.style.left = "0px";
            layer.style.bottom = "0px";
            layer.style.right = "0px";

            // Attach the cloned layer.
            this.get('layer').appendChild(layer);
          }
        }
      }
    });

    view.append();  // add to window
  },

  /** @private
    Positions the ghost view underneath the mouse/touch with the initial offset
    recorded by when the drag started.
  */
  _positionGhostView: function (evt) {
    var ghostView = this.ghostView,
      loc;

    if (ghostView) {
      loc = this.get('location');

      loc.x -= this.ghostOffset.x;
      loc.y -= this.ghostOffset.y;
      ghostView.adjust({ top: loc.y, left: loc.x });
    }
  },

  /** @private
    YES if the ghostView has been manually hidden.

    @type Boolean
    @default NO
  */
  _ghostViewHidden: NO,

  /**
    Hide the ghostView.
  */
  hideGhostView: function () {
    if (this.ghostView && !this._ghostViewHidden) {
      this.ghostView.remove();
      this._ghostViewHidden = YES;
    }
  },

  /**
    Unhide the ghostView.
  */
  unhideGhostView: function () {
    if (this._ghostViewHidden) {
      this._ghostViewHidden = NO;
      this._createGhostView();
    }
  },

  /** @private Called instead of _destroyGhostView if slideBack is YES. */
  _slideGhostViewBack: function() {
    if (this.ghostView) {
      var dragView = this._getDragView(),
          frame = dragView.get('borderFrame'),
          dragParentView = dragView.get('parentView'),
          globalOrigin = dragParentView ? dragParentView.convertFrameToView(frame, null) : dragView.get('frame'),
          slidebackLayout;

      // Create a fixed layout for the ghost view.
      slidebackLayout = { top: globalOrigin.y, left: globalOrigin.x };

      // Animate the ghost view back to its original position; destroy after.
      this.ghostView.animate(slidebackLayout, 0.5, this, function() { this.invokeNext(this._endDrag) });

    }
    else {
      this._endDrag();
    }
  },

  /** @private */
  _destroyGhostView: function () {
    if (this.ghostView) {
      this.ghostView.remove();
      this.ghostView = null; // this will allow the GC to collect it.
      this._ghostViewHidden = NO;
    }
  },

  /** @private */
  _endDrag: function() {
    if (this.get('sourceIsDraggable')) {
      this._destroyGhostView();
      if (this.get('ghost')) {
        // Show the dragView if it was hidden.
        if (this._dragViewWasVisible) this._getDragView().set('isVisible', YES);
        this._dragViewWasVisible = null;
      }
    }

    this._cleanUpDrag();
  },

  /** @private */
  _cleanUpDrag: function() {
    this._lastTarget = null;
    this._dragInProgress = NO;
    this._cachedDropTargets = null;
  },
  
  /** @private
    Return an array of drop targets, sorted with any nested drop targets
    at the top of the array.  The first time this method is called during
    a drag, it will reconstruct this array using the current set of
    drop targets.  Afterwards it uses the cached set until the drop
    completes.

    This means that if you change the view hierarchy of your drop targets
    during a drag, it will probably be wrong.
  */
  _dropTargets: function () {
    if (this._cachedDropTargets) return this._cachedDropTargets;

    // build array of drop targets
    var ret = [];
    var hash = SC.Drag._dropTargets;
    for (var key in hash) {
      if (hash.hasOwnProperty(key)) ret.push(hash[key]);
    }

    // views must be sorted so that drop targets with the deepest nesting
    // levels appear first in the array.  The getDepthFor().
    var depth = {};
    var dropTargets = SC.Drag._dropTargets;
    var getDepthFor = function (x) {
      if (!x) return 0;
      var guid = SC.guidFor(x);
      var ret = depth[guid];
      if (!ret) {
        ret = 1;
        while (x = x.get('parentView')) {
          if (dropTargets[SC.guidFor(x)] !== undefined) ret = ret + 1;
          if (x.isPane && x.isMainPane) ret = ret + 10000; // Arbitrary value always have the main pain on top
        }
        depth[guid] = ret;
      }
      return ret;
    };

    // sort array of drop targets
    ret.sort(function (a, b) {
      if (a === b) return 0;
      a = getDepthFor(a);
      b = getDepthFor(b);
      return (a > b) ? -1 : 1;
    });

    this._cachedDropTargets = ret;
    return ret;
  },

  /** @private
    This will search through the drop targets, looking for one in the target
    area.
  */
  _findDropTarget: function (evt) {
    var loc = { x: evt.pageX, y: evt.pageY };

    var target, frame;
    var ary = this._dropTargets();
    for (var idx = 0, len = ary.length; idx < len; idx++) {
      target = ary[idx];

      // If the target is not visible, it is not valid.
      if (!target.get('isVisibleInWindow')) continue;

      // get clippingFrame, converted to the pane.
      frame = target.convertFrameToView(target.get('clippingFrame'), null);

      // check to see if loc is inside.  If so, then make this the drop target
      // unless there is a drop target and the current one is not deeper.
      if (SC.pointInRect(loc, frame)) return target;
    }
    return null;
  },

  /** @private
    Search the parent nodes of the target to find another view matching the
    drop target.  Returns null if no matching target is found.
  */
  _findNextDropTarget: function (target) {
    var dropTargets = SC.Drag._dropTargets;
    while (target = target.get('parentView')) {
      if (dropTargets[SC.guidFor(target)]) return target;
    }
    return null;
  },

  // ............................................
  // AUTOSCROLLING
  //

  /** @private
    Performs auto-scrolling for the drag.  This will only do anything if
    the user keeps the mouse/touch within a few pixels of one location for a little
    while.

    Returns YES if a scroll was performed.
  */
  _autoscroll: function (evt) {
    if (!evt) evt = this._lastAutoscrollEvent;

    // If drag has ended, exit
    if (!this._dragInProgress) return NO;

    // STEP 1: Find the first view that we can actually scroll.  This view
    // must be:
    // - scrollable
    // - the mouse pointer or touch must be within a scrolling hot zone
    // - there must be room left to scroll in that direction.

    // NOTE: an event is passed only when called from mouseDragged
    var loc  = evt ? { x: evt.pageX, y: evt.pageY } : this.get('location'),
        view = this._findScrollableView(loc),
        scrollableView = null, // become final view when found
        vscroll, hscroll, min, max, edge, container, f;

    // hscroll and vscroll will become either 1 or -1 to indicate scroll
    // direction or 0 for no scroll.

    while (view && !scrollableView) {

      // quick check...can we scroll this view right now?
      vscroll = view.get('canScrollVertical') ? 1 : 0;
      hscroll = view.get('canScrollHorizontal') ? 1 : 0;

      // at least one direction might be scrollable.  Collect frame info
      if (vscroll || hscroll) {
        container = view.get('containerView');
        if (container) {
          f = view.convertFrameToView(container.get('frame'), null);
        } else {
          vscroll = hscroll = 0; // can't autoscroll this mother
        }
      }

      // handle vertical direction
      if (vscroll) {

        // bottom hotzone?
        max = SC.maxY(f);
        min = max - SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
        if (loc.y >= min && loc.y <= max) vscroll = 1;
        else {
          // how about top
          min = SC.minY(f);
          max = min + SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
          if (loc.y >= min && loc.y <= max) vscroll = -1;
          else vscroll = 0; // can't scroll vertical
        }
      }

      // handle horizontal direction
      if (hscroll) {

        // bottom hotzone?
        max = SC.maxX(f);
        min = max - SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
        if (loc.x >= min && loc.x <= max) hscroll = 1;
        else {
          // how about top
          min = SC.minX(f);
          max = min + SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
          if (loc.x >= min && loc.x <= max) hscroll = -1;
          else hscroll = 0; // can't scroll vertical
        }
      }

      // if we can scroll, then set this.
      if (vscroll || hscroll) scrollableView = view;
      else view = this._findNextScrollableView(view);
    }

    // STEP 2: Only scroll if the user remains within the hot-zone for a
    // period of time
    if (scrollableView && (this._lastScrollableView === scrollableView)) {
      if ((Date.now() - this._hotzoneStartTime) > 100) {
        this._horizontalScrollAmount *= 1.05;
        this._verticalScrollAmount *= 1.05; // accelerate scroll
      }

    // otherwise, reset everything and disallow scroll
    } else {
      this._lastScrollableView = scrollableView;
      this._horizontalScrollAmount = 15;
      this._verticalScrollAmount = 15;
      this._hotzoneStartTime = (scrollableView) ? Date.now() : null;
      hscroll = vscroll = 0;
    }

    // STEP 3: Scroll!
    if (scrollableView && (hscroll || vscroll)) {
      var scroll = {
        x: hscroll * this._horizontalScrollAmount,
        y: vscroll * this._verticalScrollAmount
      };
      scrollableView.scrollBy(scroll);
    }

    // If a scrollable view was found, then check later
    if (scrollableView) {
      if (evt) {
        this._lastAutoscrollEvent = { pageX: evt.pageX, pageY: evt.pageY };
      }
      this.invokeLater(this._autoscroll, 100, null);
      return YES;
    } else {
      this._lastAutoscrollEvent = null;
      return NO;
    }
  },

  /** @private
    Returns an array of scrollable views, sorted with nested scrollable views
    at the top of the array.  The first time this method is called during a
    drag, it will reconstruct this array using the current state of scrollable
    views.  Afterwards it uses the cached set until the drop completes.
  */
  _scrollableViews: function () {
    if (this._cachedScrollableView) return this._cachedScrollableView;

    // build array of scrollable views
    var ret = [];
    var hash = SC.Drag._scrollableViews;
    for (var key in hash) {
      if (hash.hasOwnProperty(key)) ret.push(hash[key]);
    }

    // now resort.  This custom function will sort nested scrollable views
    // at the start of the list.
    ret = ret.sort(function (a, b) {
      var view = a;
      while (view = view.get('parentView')) {
        if (b === view) return -1;
      }
      return 1;
    });

    this._cachedScrollableView = ret;
    return ret;
  },

  /** @private
    This will search through the scrollable views, looking for one in the
    target area.
  */
  _findScrollableView: function (loc) {
    var ary = this._scrollableViews(),
        len = ary ? ary.length : 0,
        target, frame, idx;

    for (idx = 0; idx < len; idx++) {
      target = ary[idx];

      if (!target.get('isVisibleInWindow')) continue;

      // get clippingFrame, converted to the pane
      frame = target.convertFrameToView(target.get('clippingFrame'), null);

      // check to see if loc is inside
      if (SC.pointInRect(loc, frame)) return target;
    }
    return null;
  },

  /** @private
    Search the parent nodes of the target to find another scrollable view.
    return null if none is found.
  */
  _findNextScrollableView: function (view) {
    var scrollableViews = SC.Drag._scrollableViews;
    while (view = view.get('parentView')) {
      if (scrollableViews[SC.guidFor(view)]) return view;
    }
    return null;
  }

});

SC.Drag.mixin(
/** @scope SC.Drag */ {

  /**
   This is the method you use to initiate a new drag.  See class documentation
   for more info on the options taken by this method.

   @params {Hash} ops a hash of options.  See documentation above.
  */
  start: function (ops) {
    var ret = this.create(ops);
    ret.startDrag();
    return ret;
  },

  /** @private */
  _dropTargets: {},

  /** @private */
  _scrollableViews: {},

  /**
    Register the view object as a drop target.

    This method is called automatically whenever a view is created with the
    isDropTarget property set to `YES`.  You generally will not need to call it
    yourself.

    @param {SC.View} target a view implementing the SC.DropTarget protocol
  */
  addDropTarget: function (target) {
    this._dropTargets[SC.guidFor(target)] = target;
  },

  /**
    Unregister the view object as a drop target.

    This method is called automatically whenever a view is removed from the
    hierarchy.  You generally will not need to call it yourself.

    @param {SC.View} target A previously registered drop target
  */
  removeDropTarget: function (target) {
    delete this._dropTargets[SC.guidFor(target)];
  },

  /**
    Register the view object as a scrollable view.  These views will
    auto-scroll during a drag.

    @param {SC.View} target The view that should be auto-scrolled
  */
  addScrollableView: function (target) {
    this._scrollableViews[SC.guidFor(target)] = target;
  },

  /**
    Remove the view object as a scrollable view.  These views will auto-scroll
    during a drag.

    @param {SC.View} target A previously registered scrollable view
  */
  removeScrollableView: function (target) {
    delete this._scrollableViews[SC.guidFor(target)];
  }

});
