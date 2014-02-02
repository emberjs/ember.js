// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/table_delegate');
sc_require('views/table_head');

/** @class
  Deprecated.

  The default SC.TableView has several issues and therefore until a suitable
  replacement is developed, this class should be considered deprecated and
  should not be used.

  Please try [](https://github.com/jslewis/sctable) for a decent alternative.

  @extends SC.ListView
  @extends SC.TableDelegate
  @deprecated Version 1.10
  @since SproutCore 1.1
*/

SC.TableView = SC.ListView.extend(SC.TableDelegate, {
  /** @scope SC.TableView.prototype */

  // ..........................................................
  // PROPERTIES
  //

  classNames: ['sc-table-view'],

  childViews: "tableHeadView scrollView".w(),

  scrollView: SC.ScrollView.extend({
    isVisible: YES,
    layout: {
      left:   -1,
      right:  0,
      bottom: 0,
      top:    19
    },
    hasHorizontalScroller: NO,
    borderStyle: SC.BORDER_NONE,
    contentView: SC.View.extend({
    }),

    // FIXME: Hack.
    _sv_offsetDidChange: function() {
      this.get('parentView')._sctv_scrollOffsetDidChange();
    }.observes('verticalScrollOffset', 'horizontalScrollOffset')
  }),

  hasHorizontalScroller: NO,
  hasVerticalScroller: NO,

  selectOnMouseDown: NO,

  // FIXME: Charles originally had this as an outlet, but that doesn't work.
  // Figure out why.
  containerView: function() {
    var scrollView = this.get('scrollView');
    return (scrollView && scrollView.get) ? scrollView.get('contentView') : null;
    //return this.get('scrollView').get('contentView');
  }.property('scrollView'),

  layout: { left: 0, right: 0, top: 0, bottom: 0 },

  init: function() {
    sc_super();

    window.table = this; // DEBUG
    //this._sctv_columnsDidChange();
  },


  canReorderContent: NO,

  isInDragMode: NO,

  // ..........................................................
  // EVENT RESPONDERS
  //

  mouseDownInTableHeaderView: function(evt, header) {
    var column = header.get('column');

    if (!column.get('isReorderable') && !column.get('isSortable')) {
      return NO;
    }

    // Save the mouseDown event so we can use it for mouseUp/mouseDragged.
    this._mouseDownEvent = evt;
    // Set the timer for switching from a sort action to a reorder action.
    this._mouseDownTimer = SC.Timer.schedule({
      target: this,
      action: '_scthv_enterDragMode',
      interval: 300
    });

    return YES;
  },

  mouseUpInTableHeaderView: function(evt, header) {
    var isInDragMode = this.get('isInDragMode');
    // Only sort if we're not in drag mode (i.e., short clicks).
    if (!isInDragMode) {
      var column = header.get('column');
      // Change the sort state of the associated column.
      this.set('sortedColumn', column);

      var sortState = column.get('sortState');
      var newSortState = sortState === SC.SORT_ASCENDING ?
       SC.SORT_DESCENDING : SC.SORT_ASCENDING;

      column.set('sortState', newSortState);
    }

    // Exit drag mode (and cancel any scheduled drag modes).
    // this._scthv_exitDragMode();
    this._dragging = false;
    if (this._mouseDownTimer) {
      this._mouseDownTimer.invalidate();
    }

  },

  mouseDraggedInTableHeaderView: function(evt, header) {
    SC.RunLoop.begin();
    var isInDragMode = this.get('isInDragMode');
    if (!isInDragMode) return NO;

    if (!this._dragging) {
      SC.Drag.start({
        event:  this._mouseDownEvent,
        source: header,
        dragView: this._scthv_dragViewForHeader(),
        ghost: YES
        //anchorView: this.get('parentView')
      });
      this._dragging = true;
    }

    return sc_super();
    SC.RunLoop.end();
  },


  // ..........................................................
  // COLUMN PROPERTIES
  //

  /**
    A collection of `SC.TableColumn` objects. Modify the array to adjust the
    columns.

    @property
    @type Array
  */
  columns: [],

  /**
    Which column will alter its size so that the columns fill the available
    width of the table. If `null`, the last column will stretch.

    @property
    @type SC.TableColumn
  */
  flexibleColumn: null,

  /**
    Which column is currently the "active" column for sorting purposes.
    Doesn't say anything about sorting direction; for that, read the
    `sortState` property of the sorted column.

    @property
    @type SC.TableColumn
  */
  sortedColumn: null,

  // ..........................................................
  // HEAD PROPERTIES
  //

  /**
    if YES, the table view will generate a head row at the top of the table
    view.

    @property
    @type Boolean
  */
  hasTableHead: YES,

  /**
    The view that serves as the head view for the table (if any).

    @property
    @type SC.View
  */
  tableHeadView: SC.TableHeadView.extend({
    layout: { top: 0, left: 0, right: 0 }
  }),

  /**
    The height of the table head in pixels.

    @property
    @type Number
  */
  tableHeadHeight: 18,


  // ..........................................................
  // ROW PROPERTIES
  //

  /**
    Whether all rows in the table will have the same pixel height. If so, we
    can compute offsets very cheaply.

    @property
    @type Boolean
  */
  hasUniformRowHeights: YES,

  /**
    How high each row should be, in pixels.

    @property
    @type Number
  */
  rowHeight: 18,

  /**
    Which view to use for a table row.

    @property
    @type SC.View
  */
  exampleView: SC.TableRowView,

  // ..........................................................
  // DRAG-REORDER MODE
  //

  isInColumnDragMode: NO,



  // ..........................................................
  // OTHER PROPERTIES
  //

  filterKey: null,


  /**
    Returns the top offset for the specified content index.  This will take
    into account any custom row heights and group views.

    @param {Number} idx the content index
    @returns {Number} the row offset in pixels
  */

  rowOffsetForContentIndex: function(contentIndex) {
    var top = 0, idx;

    if (this.get('hasUniformRowHeights')) {
      return top + (this.get('rowHeight') * contentIndex);
    } else {
      for (idx = 0; idx < contentIndex; i++) {
        top += this.rowHeightForContentIndex(idx);
      }
      return top;
    }
  },

  /**
    Returns the row height for the specified content index.  This will take
    into account custom row heights and group rows.

    @param {Number} idx content index
    @returns {Number} the row height in pixels
  */
  rowHeightForContentIndex: function(contentIndex) {
    if (this.get('hasUniformRowHeights')) {
      return this.get('rowHeight');
    } else {
      // TODO
    }
  },


  /**
    Computes the layout for a specific content index by combining the current
    row heights.

    @param {Number} index content index
  */
  layoutForContentIndex: function(index) {
    return {
      top:    this.rowOffsetForContentIndex(index),
      height: this.rowHeightForContentIndex(index),
      left:   0,
      right:  0
    };
  },

  createItemView: function(exampleClass, idx, attrs) {
    // Add a `tableView` attribute to each created row so it has a way to
    // refer back to this view.
    attrs.tableView = this;
    return exampleClass.create(attrs);
  },

  clippingFrame: function() {
    var cv = this.get('containerView'),
        sv = this.get('scrollView'),
        f  = this.get('frame');

    if (!sv.get) {
      return f;
    }

    return {
      height: f.height,
      width:  f.width,
      x:      sv.get('horizontalScrollOffset'),
      y:      sv.get('verticalScrollOffset')
    };

  }.property('frame', 'content').cacheable(),

  _sctv_scrollOffsetDidChange: function() {
    this.notifyPropertyChange('clippingFrame');
  },


  // ..........................................................
  // SUBCLASS IMPLEMENTATIONS
  //


  computeLayout: function() {
    var layout = sc_super(),
        containerView = this.get('containerView'),
        frame = this.get('frame');

    var minHeight = layout.minHeight;
    delete layout.minHeight;


    // FIXME: In the middle of initialization, the TableView needs to be
    // reloaded in order to become aware of the proper display state of the
    // table rows. This is currently the best heuristic I can find to decide
    // when to do the reload. But the whole thing is a hack and should be
    // fixed as soon as possible.
    // var currentHeight = containerView.get('layout').height;
    // if (currentHeight !== height) {
    //   this.reload();
    // }

    containerView.adjust('minHeight', minHeight);
    containerView.layoutDidChange();

    // Set the calculatedHeight used by SC.ScrollView.
    this.set('calculatedHeight', minHeight);

    //containerView.adjust('height', height);
    //containerView.layoutDidChange();

    this.notifyPropertyChange('clippingFrame');
    return layout;
  },


  // ..........................................................
  // INTERNAL SUPPORT
  //

  // When the columns change, go through all the columns and set their tableContent to be this table's content
  // TODO: should these guys not just have a binding of this instead?
  _sctv_columnsDidChange: function() {

    var columns = this.get('columns'),
        content = this.get('content'),
        idx;

    for (idx = 0; idx < columns.get('length'); idx++) {
      columns.objectAt(idx).set('tableContent', content);
    }
    this.get('tableHeadView')._scthv_handleChildren();
    this.reload();

  }.observes('columns'),

  // Do stuff when our frame size changes.
  _sctv_adjustColumnWidthsOnResize: function() {

    var width   = this.get('frame').width;
    var content = this.get('content'),
        del = this.delegateFor('isTableDelegate', this.delegate, content);

    if (this.get('columns').length == 0) return;
    width = del.tableShouldResizeWidthTo(this, width);

    var columns = this.get('columns'), totalColumnWidth = 0, idx;

    for (var idx = 0; idx < columns.length; idx++) {
      totalColumnWidth += columns.objectAt(idx).get('width');
    }

    if (width === 0) width = totalColumnWidth;
    var flexibleColumn = this.get('flexibleColumn') ||
      this.get('columns').objectAt(this.get('columns').length - 1);
    var flexibleWidth = flexibleColumn.get('width') +
     (width - totalColumnWidth);

    flexibleColumn.set('width', flexibleWidth);
  }.observes('frame'),

  // =============================================================
  // = This is all terrible, but will have to do in the interim. =
  // =============================================================
  _sctv_sortContent: function() {
    var sortedColumn = this.get('sortedColumn');
    var sortKey = sortedColumn.get('key');
    this.set('orderBy', sortKey);
  },

  _sctv_sortedColumnDidChange: function() {
    var columns = this.get('columns'),
        sortedColumn = this.get('sortedColumn'),
        column, idx;

    for (idx = 0; idx < columns.get('length'); idx++) {
      column = columns.objectAt(idx);
      if (column !== sortedColumn) {
        column.set('sortState', null);
      }
    }

    this.invokeOnce('_sctv_sortContent');
  }.observes('sortedColumn')
});
