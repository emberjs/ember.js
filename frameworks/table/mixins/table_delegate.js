// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  A delegate for table resize operations.
*/
SC.TableDelegate = {
  /**
    Walk like a duck.
  */
  isTableDelegate: YES,
  
  /**
    Called just before a table resizes a column to a proposed width.  You
    can use this method to constrain the allowed width.  The default 
    implementation uses the minWidth and maxWidth of the column object.
  */
  tableShouldResizeColumnTo: function(table, column, proposedWidth) {
    var min = column.get('minWidth') || 0,
        max = column.get('maxWidth') || proposedWidth;
    
    proposedWidth = Math.max(min, proposedWidth);
    proposedWidth = Math.min(max, proposedWidth);
    
    return proposedWidth;
  },
  
  tableShouldResizeWidthTo: function(table, proposedWidth) {
    var min = table.get('minWidth') || 0,
        max = table.get('maxWidth') || proposedWidth;
        
    proposedWidth = Math.max(min, proposedWidth);
    proposedWidth = Math.min(max, proposedWidth);
    
    return proposedWidth;
  }
};
