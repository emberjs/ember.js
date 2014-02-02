// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.THREE_SLICE = ['left', 'middle', 'right'];

SC.NINE_SLICE = [
  'top-left', 'top', 'top-right', 
  'left', 'middle', 'right', 
  'bottom-left', 'bottom', 'bottom-right'
];

SC.RenderDelegate.reopen({
  /*@scope SC.RenderDelegate.prototype*/
  
  /**
    Use this to render slices that you can match in CSS. This matches with the
    Chance @include slices directive, so that you can automatically do 
    multi-slice images for controls.

    @param {SC.Object} dataSource The data source for rendering information.
    @param {SC.RenderContext} context the render context instance
    @param {Slice Configuration} slices Instructions on how to slice. Can be a constant
    like SC.THREE_SLICE or SC.NINE_SLICE, or an array of slice names.
  */
  includeSlices: function(dataSource, context, slices) {
    for (var idx = 0, len = slices.length; idx < len; idx++) {
      context.push('<div class="' + slices[idx] + '"></div>');
    }
  }
});
