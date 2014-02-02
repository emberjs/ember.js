// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/list');
sc_require('views/source_list_group');

/** @class
  
  Displays a source list like the source list in iTunes.  SourceList views
  are very similar to ListView's but come preconfigured with the correct
  appearance and default behaviors of a source list.
  
  @extends SC.ListView
  @since SproutCore 1.0
*/
SC.SourceListView = SC.ListView.extend(
/** @scope SC.SourceListView.prototype */ {
  
  theme: 'source-list',

  /**
    @type Array
    @default ['sc-source-list']
    @see SC.View#classNames
  */
  classNames: ['sc-source-list'],
  
  /**
    Default row height for source list items is larger.
    
    @type Number
    @default 32
    @see SC.ListView#rowHeight
  */
  rowHeight: 32,

  /**
    By default source lists should not select on mouse down since you will
    often want to drag an item instead of selecting it.
    
    @type Boolean
    @default NO
    @see SC.ListView#selectOnMouseDown
  */
  selectOnMouseDown: NO,
  
  /**
    By default, SourceListView's trigger any action you set whenever the user
    clicks on an item.  This gives the SourceList a "menu" like behavior.
    
    @type Boolean
    @default YES
    @see SC.ListView#actOnSelect
  */
  actOnSelect: YES

});
