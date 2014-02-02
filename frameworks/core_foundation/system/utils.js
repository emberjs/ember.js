// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// These are helpful utility functions for calculating range and rect values
sc_require('system/browser');

SC.mixin( /** @scope SC */ {

  /**
    Takes a URL of any type and normalizes it into a fully qualified URL with
    hostname.  For example:

        "some/path" => "http://localhost:4020/some/path"
        "/some/path" => "http://localhost:4020/some/path"
        "http://localhost:4020/some/path" => "http://localhost:4020/some/path"

    @param url {String} the URL
    @returns {String} the normalized URL
  */
  normalizeURL: function(url) {
    if (url.slice(0,1) == '/') {
      url = window.location.protocol + '//' + window.location.host + url ;
    } else if ((url.slice(0,5) == 'http:') || (url.slice(0,6) == 'https:')) {
      // no change
    } else {
      url = window.location.href + '/' + url ;
    }
    return url ;
  },

  /** Return true if the number is between 0 and 1 */
  isPercentage: function(val){
    return (val<1 && val>0);
  },

  /** Return the left edge of the frame */
  minX: function(frame) {
    return frame.x || 0;
  },

  /** Return the right edge of the frame. */
  maxX: function(frame) {
    return (frame.x || 0) + (frame.width || 0);
  },

  /** Return the midpoint of the frame. */
  midX: function(frame) {
    return (frame.x || 0) + ((frame.width || 0) / 2) ;
  },

  /** Return the top edge of the frame */
  minY: function(frame) {
    return frame.y || 0 ;
  },

  /** Return the bottom edge of the frame */
  maxY: function(frame) {
    return (frame.y || 0) + (frame.height || 0) ;
  },

  /** Return the midpoint of the frame */
  midY: function(frame) {
    return (frame.y || 0) + ((frame.height || 0) / 2) ;
  },

  /** Returns the point that will center the frame X within the passed frame. */
  centerX: function(innerFrame, outerFrame) {
    return (outerFrame.width - innerFrame.width) / 2 ;
  },

  /** Return the point that will center the frame Y within the passed frame. */
  centerY: function(innerFrame, outerFrame) {
    return (outerFrame.height - innerFrame.height) /2  ;
  },

  /**
    The offset of an element.

    This function returns the left and top offset of an element with respect to either the document, the
    viewport or the element's parent element.  In standard SproutCore applications, the coordinates of the
    viewport are equivalent to the document, but a HTML5 application that wishes to use this component
    of SproutCore might need to properly distinguish between the two.

    For a useful discussion on the concepts of offsets and coordinates, see:
    http://www.quirksmode.org/mobile/viewports.html.

    @param {DOMElement|jQuery|String} elem the element to find the offset of.
      This is passed to `jQuery()`, so any value supported by `jQuery()` will work.
    @param {String} relativeToFlag flag to determine which relative element to determine offset by.
      One of either: 'document', 'viewport' or 'parent' (default: 'document').
    @returns {Object} the offset of the element as an Object (ie. Hash) in the form { x: value, y: value }.
   */
  offset: function(elem, relativeToFlag) {
    var userAgent,
        index,
        mobileBuildNumber,
        result;

    relativeToFlag = relativeToFlag || 'document';

    if (relativeToFlag === 'parent') {
      result = jQuery(elem).position();
    } else {
      result = jQuery(elem).offset();

      // jQuery does not workaround a problem with Mobile Safari versions prior to 4.1 that add the scroll
      // offset to the results of getBoundingClientRect.
      //
      // See http://dev.jquery.it/ticket/6446
      if (SC.browser.isMobileSafari) {
        userAgent = navigator.userAgent;
        index = userAgent.indexOf('Mobile/');
        mobileBuildNumber = userAgent.substring(index + 7, index + 9);

        if (parseInt(SC.browser.mobileSafari, 0) <= 532 || (mobileBuildNumber <= "8A")) {
          result.left -= window.pageXOffset;
          result.top -= window.pageYOffset;
        }
      }

      // Subtract the scroll offset for viewport coordinates
      if (relativeToFlag === 'viewport') {

        if(SC.browser.isIE8OrLower){
          result.left -= $(window).scrollLeft();
          result.top -= $(window).scrollTop();
        }else{
          result.left -= window.pageXOffset;
          result.top -= window.pageYOffset;
        }
      }
    }

    // Translate 'left', 'top' to 'x', 'y'

    try{
      result.x = result.left;
      result.y = result.top;
    } catch (e) {
      // We need this for IE, when the element is detached, for some strange
      // reason the object returned by element.getBoundingClientRect()
      // is read-only
      result = {x:result.left, y:result.top};
    }
    delete result.left;
    delete result.top;

    return result;
  },

  /**
    @deprecated Use SC.offset instead.

    SC.offset() is more accurate, more flexible in the value for the element parameter and
    easier to understand.

    @param el The DOM element
    @returns {Point} A hash with x, y offsets.
  */
  viewportOffset: function(el) {
    //@if(debug)
    SC.warn("Developer Warning: SC.viewportOffset() has been deprecated in favor of SC.offset().  Please use SC.offset() from here on.");
    //@endif
    var result = SC.offset(el, 'viewport');

    return {x: result.left, y: result.top};
  }

}) ;
