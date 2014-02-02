// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2010-2011 Strobe Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

/**
  @class
  Renders and updates DOM representations of an image.

  Parameters
  --------------------------
  Expects these properties on the data source:

  - image: An Image object which has completed loading

  If any of these are not present in the data source, the render delegate
  will throw an error.

  Optional Parameters:
  ---------------------------
  If present, these properties will be used.

  - imageValue: A String which represents the src or CSS class of the image
  - displayToolTip: A String which is rendered as a toolTip on the element
  - type: The type of image being rendered. One of:
              - SC.IMAGE_TYPE_NONE
              - SC.IMAGE_TYPE_URL
              - SC.IMAGE_TYPE_CSS_CLASS
          If not provided, SC.IMAGE_TYPE_URL is the default
*/

SC.BaseTheme.imageRenderDelegate = SC.RenderDelegate.create({
  className: 'image',

  render: function (dataSource, context) {
    var image = dataSource.get('image'),
      value = dataSource.get('value'),
      type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
      toolTip = dataSource.get('toolTip');

    // Place the img within a div, so that we may scale & offset the img
    context = context.begin('img');
    context.setAttr('src', image.src);

    // Support for CSS sprites (TODO: Remove this)
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      context.addClass(value);
      dataSource.renderState._last_class = value;
    }

    if (toolTip) {
      context.setAttr('title', toolTip);
      context.setAttr('alt', toolTip);
    }

    // Adjust the layout of the img
    context.addStyle(this.imageStyles(dataSource));

    context = context.end();
  },

  update: function (dataSource, jquery) {
    var image = dataSource.get('image'),
      lastClass = dataSource.renderState._last_class,
      value = dataSource.get('value'),
      type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
      toolTip = dataSource.get('toolTip');

    jquery = jquery.find('img');

    jquery.attr('src', image.src);

    // Support for CSS sprites (TODO: Remove this)
    if (lastClass) jquery.removeClass(lastClass);
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      jquery.addClass(value);
      dataSource.renderState._last_class = value;
    }

    if (toolTip) {
      jquery.attr('title', toolTip);
      jquery.attr('alt', toolTip);
    }

    // Adjust the layout of the img
    jquery.css(this.imageStyles(dataSource));
  },

  imageStyles: function (dataSource) {
    var innerFrame = dataSource.get('innerFrame');
    return {
      'position': 'absolute',
      'left': Math.round(innerFrame.x),
      'top': Math.round(innerFrame.y),
      'width': Math.round(innerFrame.width),
      'height': Math.round(innerFrame.height)
    };
  }

});
