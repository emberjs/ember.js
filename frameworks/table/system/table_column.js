// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.SORT_ASCENDING  = 'ascending';
SC.SORT_DESCENDING = 'descending';

/** @class

  An abstract object that manages the state of the columns behind a
  `SC.TableView`.
  
  @extends SC.Object
  @since SproutCore 1.1
*/

SC.TableColumn = SC.Object.extend({
/** @scope SC.TableColumn.prototype */
  
  /**
    The internal name of the column. `SC.TableRowView` objects expect their
    `content` to be an object with keys corresponding to the column's keys.
    
    @property
    @type String
  */
  key: null,
  
  /**
    The display name of the column. Will appear in the table header for this
    column.
    
    @property
    @type String
  */
  title: null,
  
  /**
    Width of the column.
    
    @property
    @type Number
  */
  width: 100,
  
  /**
    How narrow the column will allow itself to be.
    
    @property
    @type Number
  */
  minWidth: 16,
  
  /**
    How wide the column will allow itself to be.
    
    @property
    @type Number
  */
  maxWidth: 700,
  
  escapeHTML: NO,

  formatter: null,

  
  isVisible: YES,
  
  /**
    Whether the column gets wider or narrower based on the size of the
    table. Only one column in a TableView is allowed to be flexible.
    
    @property
    @type Boolean
  */
  isFlexible: NO,
  
  /**
    Whether the column can be drag-reordered.
    
    @property
    @type Boolean
  */
  isReorderable: YES,
  
  /**
    Whether the column can be sorted.
    
    @property
    @type Boolean
  */
  isSortable: YES,

  /**
    Reference to the URL for this column's icon. If `null`, there is no
    icon associated with the column.
    @property
  */
  icon: null,
  
  tableHeader: null,

  /**
    The sort state of this particular column. Can be one of
    SC.SORT_ASCENDING, SC.SORT_DESCENDING, or `null`. For instance, if
    SC.SORT_ASCENDING, means that the table is being sorted on this column
    in the ascending direction. If `null`, means that the table is sorted
    on another column.
    
    @property
  */
  sortState: null,
  
  /**
    The content property of the controlling SC.TableView. This is needed
    because the SC.TableHeader views use this class to find out how to
    render table content (when necessary).
  */
  tableContent: null
  
});
