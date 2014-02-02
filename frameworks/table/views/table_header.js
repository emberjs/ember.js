// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/table');


SC.TableHeaderView = SC.View.extend({

  classNames: ['sc-table-header'],

  displayProperties: ['sortState', 'isInDragMode'],

  acceptsFirstResponder: YES,

  isInDragMode: NO,

  hasHorizontalScroller: NO,
  hasVerticalScroller: NO,

  childViews: ['dragModeView'],


  /**
    The view that is visible when the column is in drag mode.
  */
  dragModeView: SC.ListView.extend({
    isVisible: NO,

    layout: { left: 0, right: 0, bottom: 0 },

    init: function() {
      sc_super();

      var tableHeaderView = this.get('parentView');

      if (tableHeaderView) {
        tableHeaderView.addObserver('isInDragMode', this,
            '_scthv_dragModeDidChange');
      }

    },

    _scthv_dragModeDidChange: function() {
      // var isInDragMode = this.get('tableHeaderView').get('isInDragMode');
      // this.set('isVisible', isInDragMode);
    }
  }),

  /**
    The SC.TableColumn object this header cell is bound to.
  */
  column:  null,

  render: function(context, firstTime) {
    var column = this.get('column'), icon = column.get('icon'), html;
    var span = context.begin('span');
    if (icon) {
      html = '<img src="%@" class="icon" />'.fmt(icon);
      span.push(html);
    } else {
      span.push(this.get('label'));
    }
    span.end();
  },

  // ========================================================
  // = For the column we look after, set up some observers. =
  // ========================================================
  init: function() {
    sc_super();

    var column = this.get('column');
    column.addObserver('width',     this, '_scthv_layoutDidChange');
    column.addObserver('maxWidth',  this, '_scthv_layoutDidChange');
    column.addObserver('minWidth',  this, '_scthv_layoutDidChange');
    column.addObserver('sortState', this, '_scthv_sortStateDidChange');
    column.addObserver('tableContent', this, '_scthv_tableContentDidChange');

    // var tableContent = column.get('tableContent');
    // var columnContent = this._scthv_columnContentFromTableContent(tableContent);
    // this.set('content', columnContent);
  },

  /**
    The sortState of the header view's column.
  */
  sortState: function() {
    return this.get('column').get('sortState');
  }.property(),

  mouseDown: function(evt) {
    var tableView = this.get('tableView');
    return tableView ? tableView.mouseDownInTableHeaderView(evt, this) :
     sc_super();
  },

  mouseUp: function(evt) {
    var tableView = this.get('tableView');
    return tableView ? tableView.mouseUpInTableHeaderView(evt, this) :
     sc_super();
  },

  mouseDragged: function(evt) {
    var tableView = this.get('tableView');
    return tableView ? tableView.mouseDraggedInTableHeaderView(evt, this) :
     sc_super();
  },

  _scthv_dragViewForHeader: function() {
    var dragLayer = this.get('layer').cloneNode(true);
    var view = SC.View.create({ layer: dragLayer, parentView: this });

    // cleanup weird stuff that might make the drag look out of place
    SC.$(dragLayer).css('backgroundColor', 'transparent')
      .css('border', 'none')
      .css('top', 0).css('left', 0);

    return view;
  },

  _scthv_enterDragMode: function() {
    this.set('isInDragMode', YES);
  },

  _scthv_exitDragMode: function() {
    this.set('isInDragMode', NO);
  },

  // _scthv_hideViewInDragMode: function() {
  //   var shouldBeVisible = !this.get('isInDragMode'), layer = this.get('layer');
  //   console.log('should be visible: %@'.fmt(!this.get('isInDragMode')));
  //   SC.RunLoop.begin();
  //   SC.$(layer).css('display', shouldBeVisible ? 'block' : 'none');
  //   SC.RunLoop.end();
  // }.observes('isInDragMode'),

  // _scthv_setupDragMode: function() {
  //   var isInDragMode = this.get('isInDragMode');
  //   if (isInDragMode) {
  //     });
  //   } else {
  //     //
  //   }
  //
  //
  // }.observes('isInDragMode'),

  _scthv_dragModeViewDidChange: function() {
    var dragModeView = this.get('dragModeView');
    if (dragModeView && dragModeView.set) {
      dragModeView.set('tableHeadView', this);
      dragModeView.set('tableView', this.get('tableView'));
    }
  }.observes('dragModeView'),

  _scthv_layoutDidChange: function(sender, key, value, rev) {
    var pv = this.get('parentView');
    pv.invokeOnce(pv.layoutChildViews);

    // Tell the container view how tall the header is so that it can adjust
    // itself accordingly.
    var layout = this.get('layout');
    //this.get('dragModeView').adjust('top', layout.height);
  },

  // When our column's tableContent property changes, we need to go back and get our column content
  _scthv_tableContentDidChange: function() {
    var tableContent = this.get('column').get('tableContent');
    var columnContent = this.get('parentView')._scthv_columnContentFromTableContent(tableContent, this.get('columnIndex'));
    this.set('content', columnContent);
  },

  _scthv_sortStateDidChange: function() {
    SC.RunLoop.begin();
    var sortState  = this.get('column').get('sortState');
    var classNames = this.get('classNames');

    classNames.removeObject('sc-table-header-sort-asc');
    classNames.removeObject('sc-table-header-sort-desc');
    classNames.removeObject('sc-table-header-sort-active');

    if (sortState !== null) {
      classNames.push('sc-table-header-sort-active');
    }

    if (sortState === SC.SORT_ASCENDING) {
      classNames.push('sc-table-header-sort-asc');
    }

    if (sortState === SC.SORT_DESCENDING) {
      classNames.push('sc-table-header-sort-desc');
    }

    // TODO: Figure out why it's not enough to simply call
    // `displayDidChange` here.
    this.displayDidChange();
    this.invokeOnce('updateLayer');
    SC.RunLoop.end();
  }
});
