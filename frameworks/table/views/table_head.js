// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/table');
sc_require('views/table_header');


SC.TableHeadView = SC.View.extend({
/** @scope SC.TableHeadView.prototype */

  layout: { height: 18, left: 0, right: 0, top: 0 },

  classNames: ['sc-table-head'],

  cells: [],

  acceptsFirstResponder: YES,

  dragOrder: null,

  init: function() {
    sc_super();
    this._scthv_handleChildren();
  },

  columns: function() {
    return this.get('parentView').get('columns');
  }.property(),

  renderChildViews: function(context, firstTime) {
    var cells = this.get('cells'), cell, idx;
    for (idx = 0; idx < cells.get('length'); idx++) {
      cell = cells.objectAt(idx);
      context = context.begin(cell.get('tagName'));
      cell.render(context, firstTime);
      context = context.end();
    }
    return context;
  },

  layoutChildViews: function() {
    var cells = this.get('cells'), cell, idx;
    for (idx = 0; idx < cells.get('length'); idx++) {
      cell = cells.objectAt(idx);
      cell.adjust(this._scthv_layoutForHeaderAtColumnIndex(idx));
      cell.updateLayout();
    }
  },


  // ..........................................................
  // INTERNAL SUPPORT
  //

  _scthv_enterDragMode: function() {
    var order = [], columns = this.get('columns'), idx;

    for (idx = 0; idx < columns.get('length'); idx++) {
      order.push(columns.objectAt(idx).get('key'));
    }

    this.set('dragOrder', order);
  },

  _scthv_changeDragOrder: function(draggedColumnIndex, leftOfIndex) {
    var dragOrder = this.get('dragOrder'),
     draggedColumn = dragOrder.objectAt(draggedColumnIndex);

    dragOrder.removeAt(idx);
    dragOrder.insertAt(leftOfIndex, draggedColumn);
  },

  _scthv_reorderDragColumnViews: function() {

  }.observes('dragOrder'),


  _scthv_columnContentFromTableContent: function(tableContent, columnIndex) {
    var column = this.get('columns').objectAt(columnIndex),
        key = column.get('key'),
        ret = [],
        idx;

    if (!tableContent) return ret;

    var tableView = this.get('parentView'),
        length = tableContent.get('length');
        // visibleIndexes = tableView.contentIndexesInRect(
        //     tableView.get('frame')).toArray();

    for (idx = 0; idx < length; idx++) {
      //visibleIndex = visibleIndexes.objectAt(idx);
      ret.push(tableContent.objectAt(idx).get(key));
    }

    return ret;
  },

  _scthv_layoutForHeaderAtColumnIndex: function(index) {
    var columns = this.get('columns'),
        rowHeight = this.get('parentView').get('rowHeight'),
        layout = {},
        left = 0, idx;

    for (idx = 0; idx < index; idx++) {
      left += columns.objectAt(idx).get('width');
    }

    return {
      left:   left,
      width:  columns.objectAt(index).get('width'),
      height: rowHeight
    };
  },

  _scthv_handleChildren: function() {
    var columns = this.get('columns');
    var tableView = this.get('parentView');
    var tableContent = tableView.get('content');

    var column, key, label, content, cells = [], cell, idx;
    for (idx = 0; idx < columns.get('length'); idx++) {
      column = columns.objectAt(idx);
      key    = column.get('key');
      label  = column.get('label');
      content = this._scthv_columnContentFromTableContent(tableContent, idx);
      cell   = this._scthv_createTableHeader(column, label, content, idx);
      cells.push(cell);
    }
    this.set('cells', cells);
    if (cells.length > 0)
      this.replaceAllChildren(cells);
  },

  _scthv_createTableHeader: function(column, label, content, idx) {
    var tableView = this.get('parentView');
    var cell = SC.TableHeaderView.create({
      column:  column,
      label: label,
      content: content,
      tableView: tableView,
      columnIndex: idx
    });
    return cell;
  }
});

