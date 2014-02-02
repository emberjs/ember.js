// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag') ;

/**
  @namespace

  This protocol implements a dynamic data source for a drag operation. You can
  return a set of allowed data types and then the method will be used to 
  actually get data in that format when requested.
*/
SC.DragDataSource = {

  /**
    Implement this property as an array of data types you want to support
    for drag operations.

    @type Array
    @default []
  */
  dragDataTypes: [],

  /**
    Implement this method to return the data in the format passed.  Return
    null if the requested data type cannot be generated.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Object} dataType The proposed dataType to return.  This will 
      always be one of the data types declared in dragDataTypes.
    
    @returns The data object for the specified type
  */
  dragDataForType: function(drag, dataType) {
    return null;
  }

};

