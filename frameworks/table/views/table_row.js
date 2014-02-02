// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================



SC.TableRowView = SC.View.extend({
/** @scope SC.TableRowView.prototype */

  //layout: { height: 18, left: 0, right: 0, top: 0 },

  // ..........................................................
  // PROPERTIES
  //

  classNames: ['sc-table-row'],

  cells: [],

  acceptsFirstResponder: YES,

  /**
    A reference to the row's encompassing TableView.

    @property
    @type SC.TableView
  */
  tableView: null,

  // ..........................................................
  // METHODS
  //

  init: function() {
    sc_super();
    this._sctrv_handleChildren();
  },

  /**
    A collection of `SC.TableColumn` objects.

    @property
    @type Array
  */
  columns: function() {
    return this.get('tableView').get('columns');
  }.property(),

  render: function(context, firstTime) {
    sc_super();
    context.setClass('sel', this.get('isSelected'));
  },

  render: function(context, firstTime) {
    var classArray = [];

    classArray.push((this.get('contentIndex')%2 === 0) ? 'even' : 'odd');
    context.addClass(classArray);

    sc_super();
  },

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
    var cells = this.get('cells'), columns = this.get('columns'),
        cell, column, idx;
    var left = 0, width, rowHeight = this.get('tableView').get('rowHeight');

    for (idx = 0; idx < cells.get('length'); idx++) {
      cell = cells.objectAt(idx);
      column = columns.objectAt(idx);
      width = column.get('width');

      cell.adjust({
        left: left,
        width: width,
        height: rowHeight
      });

      left += width;
      cell.updateLayout();
    }
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  _sctrv_layoutForChildAtColumnIndex: function(index) {
    var columns = this.get('columns'),
        rowHeight = this.get('tableView').get('rowHeight'),
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

  _sctrv_createTableCell: function(column, value) {
    var cell = SC.TableCellView.create({
      column:  column,
      content: value
    });
    return cell;
  },

  // The row needs to redraw when the selection state changes.
  _sctrv_handleSelection: function() {
    this.displayDidChange();
  }.observes('isSelected'),

  _sctrv_handleChildren: function() {
    var content = this.get('content'), columns = this.get('columns');

    this.removeAllChildren();
    var column, key, value, cells = [], cell, idx;
    for (idx = 0; idx < columns.get('length'); idx++) {
      column = columns.objectAt(idx);
      key    = column.get('key');
      value  = content ? content.getPath(key) : "";
      cell   = this._sctrv_createTableCell(column, value);
      cells.push(cell);
      this.appendChild(cell);
    }

    this.set('cells', cells);
  }
});

