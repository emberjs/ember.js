// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @type String
  @constant
*/
SC.SCALE_NONE = "none";

/**
  Stretch/shrink the shape to fill the frame

  @type String
  @constant
*/
SC.FILL = "fill";

/**
  Stretch/shrink the shape to fill the frame while maintaining aspect ratio, such
  that the shortest dimension will just fit within the frame and the longest dimension will
  overflow and be cropped.

  @type String
  @constant
*/
SC.FILL_PROPORTIONALLY = SC.BEST_FILL = "best-fill";

/**
  Stretch/shrink the shape to fit the frame while maintaining aspect ratio, such that the
  longest dimension will just fit within the frame

  @type String
  @constant
*/
SC.BEST_FIT = "best-fit";

/**
  Shrink the shape to fit the frame while maintaining aspect ratio, such that
  the longest dimension will just fit within the frame.  Do not stretch the shape if the shape's
  width is less than the frame's width.

  @type String
  @constant
*/
SC.BEST_FIT_DOWN_ONLY = "best-fit-down";

/**
  @namespace

  InnerFrame provides the innerFrameForSize function, which will return a frame for the given size adjusted
  to fit within the given outer size, according to the align and scale properties.

  View's that render images will find this mixin particularly useful for fitting their images.
 */
SC.InnerFrame = {

  /**
    Align the shape within its frame. Possible values:

      - SC.ALIGN_TOP_LEFT
      - SC.ALIGN_TOP
      - SC.ALIGN_TOP_RIGHT
      - SC.ALIGN_LEFT
      - SC.ALIGN_CENTER
      - SC.ALIGN_RIGHT
      - SC.ALIGN_BOTTOM_LEFT
      - SC.ALIGN_BOTTOM
      - SC.ALIGN_BOTTOM_RIGHT

    @type String
    @default SC.ALIGN_CENTER
  */
  align: SC.ALIGN_CENTER,

  /**
    Returns a frame (x, y, width, height) fitting the source size (sourceWidth & sourceHeight) within the
    destination size (destWidth & destHeight) according to the align and scale properties.  This is essential to
    positioning child views or elements within parent views or elements in elegant ways.

    @param {Number} sourceWidth
    @param {Number} sourceHeight
    @param {Number} destWidth
    @param {Number} destHeight
    @returns {Object} the inner frame with properties: {x: value, y: value, width: value, height: value }
  */
  innerFrameForSize: function(sourceWidth, sourceHeight, destWidth, destHeight) {
    var align = this.get('align'),
        scale = this.get('scale'),
        scaleX,
        scaleY,
        result;

    // Fast path
    result = { x: 0, y: 0, width: destWidth, height: destHeight };
    if (scale === SC.FILL) return result;

    // Determine the appropriate scale
    scaleX = destWidth / sourceWidth;
    scaleY = destHeight / sourceHeight;

    switch (scale) {
      case SC.BEST_FILL:
        scale = scaleX > scaleY ? scaleX : scaleY;
        break;
      case SC.BEST_FIT:
        scale = scaleX < scaleY ? scaleX : scaleY;
        break;
      case SC.BEST_FIT_DOWN_ONLY:
        if ((sourceWidth > destWidth) || (sourceHeight > destHeight)) {
          scale = scaleX < scaleY ? scaleX : scaleY;
        } else {
          scale = 1.0;
        }
        break;
      case SC.SCALE_NONE:
        scale = 1.0;
        break;
      default: // Number
        if (isNaN(window.parseFloat(scale)) || (window.parseFloat(scale) <= 0)) {
          SC.Logger.warn("SC.InnerFrame: The scale '%@' was not understood.  Scale must be one of SC.FILL, SC.BEST_FILL, SC.BEST_FIT, SC.BEST_FIT_DOWN_ONLY or a positive number greater than 0.00.".fmt(scale));

          // Don't attempt to scale or offset the image
          return result;
        }
    }

    sourceWidth *= scale;
    sourceHeight *= scale;
    result.width = Math.round(sourceWidth);
    result.height = Math.round(sourceHeight);

    // Align the image within its frame
    switch (align) {
      case SC.ALIGN_LEFT:
        result.x = 0;
        result.y = (destHeight / 2) - (sourceHeight / 2);
        break;
      case SC.ALIGN_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = (destHeight / 2) - (sourceHeight / 2);
        break;
      case SC.ALIGN_TOP:
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = 0;
        break;
      case SC.ALIGN_BOTTOM:
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = destHeight - sourceHeight;
        break;
      case SC.ALIGN_TOP_LEFT:
        result.x = 0;
        result.y = 0;
        break;
      case SC.ALIGN_TOP_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = 0;
        break;
      case SC.ALIGN_BOTTOM_LEFT:
        result.x = 0;
        result.y = destHeight - sourceHeight;
        break;
      case SC.ALIGN_BOTTOM_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = destHeight - sourceHeight;
        break;
      default: // SC.ALIGN_CENTER || SC.ALIGN_MIDDLE
        //@if(debug)
        if (align !== SC.ALIGN_CENTER && align !== SC.ALIGN_MIDDLE) {
          SC.Logger.warn("SC.InnerFrame: The align '%@' was not understood.  Align must be one of SC.ALIGN_CENTER/SC.ALIGN_MIDDLE, SC.ALIGN_LEFT, SC.ALIGN_RIGHT, SC.ALIGN_TOP, SC.ALIGN_BOTTOM, SC.ALIGN_TOP_LEFT, SC.ALIGN_TOP_RIGHT, SC.ALIGN_BOTTOM_LEFT or SC.ALIGN_BOTTOM_RIGHT.".fmt(align));
        }
        //@endif
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = (destHeight / 2) - (sourceHeight / 2);
    }

    return result;
  },

  /**
    Determines how the shape will scale to fit within its containing space. Possible values:

      - SC.SCALE_NONE
      - SC.FILL
      - SC.BEST_FILL
      - SC.BEST_FIT
      - SC.BEST_FIT_DOWN_ONLY

    @type String
    @default SC.FILL
  */
  scale: SC.FILL
};
