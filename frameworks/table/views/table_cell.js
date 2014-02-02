// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple, Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/table_row');

SC.TableCellView = SC.View.extend({
  
  classNames: ['sc-table-cell'],
  
  column: null,
  escapeHTMLBinding: SC.Binding.oneWay('.column.escapeHTML'),
  formatter: SC.Binding.oneWay('.column.formatter'),
  
  displayValue: function() {
    var value = this.get('content') ;
    
    // 1. apply the formatter
    var formatter = this.get('column').get('formatter');
    if (formatter) {
      var formattedValue = (SC.typeOf(formatter) === SC.T_FUNCTION) ? formatter(value, this) : formatter.fieldValueForObject(value, this) ;
      if (!SC.none(formattedValue)) value = formattedValue ;
    }
    
    if (SC.typeOf(value) === SC.T_ARRAY) {
      var ary = [];
      for(var idx=0;idx<value.get('length');idx++) {
        var x = value.objectAt(idx) ;
        if (!SC.none(x) && x.toString) x = x.toString() ;
        ary.push(x) ;
      }
      value = ary.join(',') ;
    }
    
    if (!SC.none(value) && value.toString) value = value.toString() ;
    
    if (this.get('escapeHTML')) value = SC.RenderContext.escapeHTML(value);
    
    return value ;
  }.property('content', 'escapeHTML', 'formatter').cacheable(),
  
  render: function(context, firstTime) {
    context.push(this.get('displayValue'));
  },
  
  init: function() {
    sc_super();

    var column = this.get('column');
    
    column.addObserver('width',    this, '_sctcv_layoutDidChange');
    column.addObserver('maxWidth', this, '_sctcv_layoutDidChange');
    column.addObserver('minWidth', this, '_sctcv_layoutDidChange');
  },
    
  _sctcv_layoutDidChange: function(sender, key, value, rev) {
    var pv = this.get('parentView');
    SC.run( function() { pv.layoutChildViews(); });
  }
});
