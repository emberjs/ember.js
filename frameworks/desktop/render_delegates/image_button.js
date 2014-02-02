// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.imageButtonRenderDelegate = SC.RenderDelegate.create({
  className: 'image-button',

  render: function (dataSource, context) {
    var image = dataSource.get('image'),
      toolTip = dataSource.get('toolTip');

    // render controlSize
    this.addSizeClassName(dataSource, context);

    if (toolTip) {
      context.setAttr('title', toolTip);
      context.setAttr('alt', toolTip);
    }

    if (image) {
      context.addClass(image);

      // Track the image class used so that we can remove it when it changes.
      dataSource.renderState._cachedImage = image;
    }
  },

  update: function (dataSource, jqElement) {
    var image, toolTip;

    this.updateSizeClassName(dataSource, jqElement);

    if (dataSource.didChangeFor('imageButtonRenderDelegate', 'toolTip')) {
      toolTip = dataSource.get('toolTip');

      jqElement.attr('title', toolTip);
      jqElement.attr('alt', toolTip);
    }

    if (dataSource.didChangeFor('imageButtonRenderDelegate', 'image')) {
      image = dataSource.get('image');

      // Remove the last image class
      if (dataSource.renderState._cachedImage) {
        jqElement.removeClass(dataSource.renderState._cachedImage);
      }

      if (image) {
        jqElement.addClass(image);

        // Track the image class used so that we can remove it when it changes.
        dataSource.renderState._cachedImage = image;
      }
    }
  }
});
