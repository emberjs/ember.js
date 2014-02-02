// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.panelRenderDelegate = SC.RenderDelegate.create({
  className: 'panel',

  render: function(dataSource, context) {
    context = context.begin('div').addClass('panel-background');
    this.includeSlices(dataSource, context, SC.NINE_SLICE);
    context = context.end();

    var ariaLabel = dataSource.get('ariaLabel'),
        ariaLabelledBy = dataSource.get('ariaLabelledBy'),
        ariaDescribedBy = dataSource.get('ariaDescribedBy');

    if (ariaLabel) context.setAttr('aria-label', ariaLabel);
    if (ariaLabelledBy) context.setAttr('aria-labelledby', ariaLabelledBy);
    if (ariaDescribedBy) context.setAttr('aria-describedby', ariaDescribedBy);
  },

  update: function(dataSource, jQuery) {
    // the label for the panel could change...
    var ariaLabel = dataSource.get('ariaLabel'),
        ariaLabelledBy = dataSource.get('ariaLabelledBy'),
        ariaDescribedBy = dataSource.get('ariaDescribedBy');

    if(ariaLabel) jQuery.attr('aria-label', ariaLabel);
    if(ariaLabelledBy) jQuery.attr('aria-labelledby', ariaLabelledBy);
    if(ariaDescribedBy) jQuery.attr('aria-describedby', ariaDescribedBy);
  }
});
