// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** 
  @namespace
  
  `CollectionRowDelegate`s are consulted by `SC.ListView` and `SC.TableView` to
  control the height of rows, including specifying custom heights for
  specific rows.
  
  You can implement a custom row height in one of two ways.
*/
SC.CollectionRowDelegate = {

  /**
    Walk like a duck.
  
    @type Boolean
    @default YES
  */
  isCollectionRowDelegate: YES,
  
  /**
    Size of an item without spacing or padding.
    Unless you implement some custom row height
    support, this row height will be used for all items.
    
    @type Number
    @default 18
  */
  itemHeight: 24,
  
  /**
    This inserts empty space between rows that you can use for borders.
    
    @type Number
    @default 0
  */
  rowSpacing: 0,
  
  /**
    This is useful if you are using a custom item view that needs to be padded.
    This value is added to the top and bottom of the `itemHeight`.
    
    @type Number
    @default 0
  */
  rowPadding: 0,
  
  /**
    Total row height used for calculation. Equal to `itemHeight + (2 * rowPadding)`.
    
    @type Number
  */
  rowHeight: function(key, value) {
    var rowPadding = this.get('rowPadding');
    var itemHeight = this.get('itemHeight');

    if (value !== undefined) {
      this.set('itemHeight', value-rowPadding*2);
      return value;
    }

    return itemHeight + rowPadding * 2;
  }.property('itemHeight', 'rowPadding'),

  /**
    Index set of rows that should have a custom row height. If you need
    certain rows to have a custom row height, then set this property to a
    non-null value.  Otherwise leave it blank to disable custom row heights.
    
    @type SC.IndexSet
  */
  customRowHeightIndexes: null,
  
  /**
    Called for each index in the `customRowHeightIndexes` set to get the
    actual row height for the index.  This method should return the default
    rowHeight if you don't want the row to have a custom height.
    
    The default implementation just returns the default rowHeight.
    
    @param {SC.CollectionView} view the calling view
    @param {Object} content the content array
    @param {Number} contentIndex the index 
    @returns {Number} row height
  */
  contentIndexRowHeight: function(view, content, contentIndex) {
    return this.get('rowHeight');
  }

};
