// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================
sc_require("theme");
/**
  Renders and updates the DOM representation of a slider.

  Parameters
  -------------------------
  Requires the following parameters:

  - value: a value from 0 to 1.
  - frame: containing the frame in which the slider is being drawn.
*/

SC.LegacyTheme.sliderRenderDelegate = SC.RenderDelegate.create({

  className: 'slider',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var blankImage  = SC.BLANK_IMAGE_URL,
        valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    context.setAttr('aria-valuemax', valueMax);
    context.setAttr('aria-valuemin', valueMin);
    context.setAttr('aria-valuenow', valueNow);
    context.setAttr('aria-valuetext', valueNow);
    context.setAttr('aria-orientation', 'horizontal');

    context.push('<span class="sc-inner">',
                  '<span class="sc-leftcap"></span>',
                  '<span class="sc-rightcap"></span>',
                  '<img src="', blankImage,
                  '" class="sc-handle" style="left: ', dataSource.get('value'), '%" />',
                  '</span>');
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var blankImage  = SC.BLANK_IMAGE_URL,
        valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    jquery.attr('aria-valuemax', valueMax);
    jquery.attr('aria-valuemin', valueMin);
    jquery.attr('aria-valuenow', valueNow);
    jquery.attr('aria-valuetext', valueNow);
    jquery.attr('aria-orientation', 'horizontal');

    if (dataSource.didChangeFor('sliderRenderDelegate', 'value')) {
      jquery.find(".sc-handle").css('left', dataSource.get('value') + "%");
    }

  }

});
