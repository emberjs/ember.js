// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

/**
  Renders and updates the DOM representation of a slider.

  Parameters
  -------------------------
  Requires the following parameters:

   - `value` -- a value from 0 to 1.
   - `frame` -- containing the frame in which the slider is being drawn.
*/

SC.BaseTheme.sliderRenderDelegate = SC.RenderDelegate.create({

  className: 'slider',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var blankImage = SC.BLANK_IMAGE_URL,
        valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    context.setAttr('aria-valuemax', valueMax);
    context.setAttr('aria-valuemin', valueMin);
    context.setAttr('aria-valuenow', valueNow);
    if(valueMin !== 0 || valueMax !== 100) context.setAttr('aria-valuetext', valueNow);
    context.setAttr('aria-orientation', 'horizontal');

    context = context.begin('span').addClass('track');
    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    context.push(
      '<img src="' + blankImage +
      '" class="sc-handle" style="left: '+ dataSource.get('value') + '%" />'+
      '</span>'
    );

    context = context.end();



    dataSource.get('renderState')._cachedHandle = null;
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    jquery.attr('aria-valuemax', valueMax);
    jquery.attr('aria-valuemin', valueMin);
    jquery.attr('aria-valuenow', valueNow);
    if(valueMin !== 0 || valueMax !== 100) jquery.attr('aria-valuetext', valueNow);
    jquery.attr('aria-orientation', 'horizontal');

    if (dataSource.didChangeFor('sliderRenderDelegate', 'value')) {
      var handle = dataSource.get('renderState')._cachedHandle;
      if (!handle) {
        handle = dataSource.get('renderState')._cachedHandle = jquery.find('.sc-handle');
      }

      var frame = dataSource.get('frame'), value = dataSource.get('value');
      handle.css('left', value + "%");
    }
  }

});
