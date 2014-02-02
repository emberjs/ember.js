// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  Displays a horizontal or vertical separator line.  Simply create one of 
  these views and configure the layout direction and layout frame.
  
  @extends SC.View
  @since SproutCore 1.0
*/
SC.SeparatorView = SC.View.extend(
/** @scope SC.SeparatorView.prototype */ {

  /**
    @type Array
    @default ['sc-separator-view']
    @see SC.View#classNames
  */
  classNames: ['sc-separator-view'],
  
  /**
    @type String
    @default 'span'
    @see SC.View#tagName
  */
  tagName: 'span',

  /** 
    Select the direction of the separator line. Possible values:
    
      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL
    
    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /** @private */
  render: function(context, firstTime) {
    if(firstTime) context.push('<span></span>');
    context.addClass(this.get('layoutDirection'));
  }

});
