// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.mixin( /** @scope SC */ {

  _copy_computed_props: [
    "maxWidth", "maxHeight", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
    "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant", "lineHeight",
    "whiteSpace", "letterSpacing", "wordWrap"
  ],

  /**
    Returns a string representation of the layout hash.

    Layouts can contain the following keys:
      - left: the left edge
      - top: the top edge
      - right: the right edge
      - bottom: the bottom edge
      - height: the height
      - width: the width
      - centerX: an offset from center X
      - centerY: an offset from center Y
      - minWidth: a minimum width
      - minHeight: a minimum height
      - maxWidth: a maximum width
      - maxHeight: a maximum height
      - rotateX
      - rotateY
      - rotateZ
      - scale

    @param layout {Hash} The layout hash to stringify.
    @returns {String} A string representation of the layout hash.
  */
  stringFromLayout: function(layout) {
    // Put them in the reverse order that we want to display them, because
    // iterating in reverse is faster for CPUs that can compare against zero
    // quickly.
    var keys = ['maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'centerY',
                'centerX', 'width', 'height', 'bottom', 'right', 'top',
                'left', 'zIndex', 'opacity', 'border', 'borderLeft',
                'borderRight', 'borderTop', 'borderBottom', 'rotateX',
                'rotateY', 'rotateZ', 'scale'],
        keyValues = [], key,
        i = keys.length;
    while (--i >= 0) {
      key = keys[i];
      if (layout.hasOwnProperty(key)) {
        keyValues.push(key + ':' + layout[key]);
      }
    }

    return '{ ' + keyValues.join(', ') + ' }';
  },

  /**
    Given a string and a fixed width, calculates the height of that
    block of text using a style string, a set of class names,
    or both.

    @param str {String} The text to calculate
    @param width {Number} The fixed width to assume the text will fill
    @param style {String} A CSS style declaration.  E.g., 'font-weight: bold'
    @param classNames {Array} An array of class names that may affect the style
    @param ignoreEscape {Boolean} To NOT html escape the string.
    @returns {Number} The height of the text given the passed parameters
  */
  heightForString: function(str, width, style, classNames, ignoreEscape) {
    var elem = this._heightCalcElement, classes, height;

    if(!ignoreEscape) str = SC.RenderContext.escapeHTML(str);

    // Coalesce the array of class names to one string, if the array exists
    classes = (classNames && SC.typeOf(classNames) === SC.T_ARRAY) ? classNames.join(' ') : '';

    if (!width) width = 100; // default to 100 pixels

    // Only create the offscreen element once, then cache it
    if (!elem) {
      elem = this._heightCalcElement = document.createElement('div');
      document.body.insertBefore(elem, null);
    }

    style = style+'; width: '+width+'px; left: '+(-1*width)+'px; position: absolute';
    var cqElem = SC.$(elem);
    cqElem.attr('style', style);

    if (classes !== '') {
      cqElem.attr('class', classes);
    }

    elem.innerHTML = str;
    height = elem.clientHeight;

    elem = null; // don't leak memory
    return height;
  },

  /**
    Sets up a string measuring environment.

    You may want to use this, in conjunction with teardownStringMeasurement and
    measureString, instead of metricsForString, if you will be measuring many
    strings with the same settings. It would be a lot more efficient, as it
    would only prepare and teardown once instead of several times.

    @param exampleElement The example element to grab styles from, or the style
                          string to use.
    @param classNames {String} (Optional) Class names to add to the test element.
  */
  prepareStringMeasurement: function(exampleElement, classNames) {
    var element = this._metricsCalculationElement, classes, styles, style,
        cqElem;

    // collect the class names
    classes = SC.A(classNames).join(' ');

    // get the calculation element
    if (!element) {
      var parentElement = document.createElement("div");

      // To have effectively unbounded widths when no max-width is set,
      // give the metricsCalculationElement a very wide sandbox.
      // To make sure it's never visible, position it way, way offscreen.
      parentElement.style.cssText = "position:absolute; left:-10010px; top:-10px;"+
                                    "width:10000px; height:0px; overflow:hidden;"+
                                    "visibility:hidden;";

      element = this._metricsCalculationElement = document.createElement("div");

      parentElement.appendChild(element);
      document.body.insertBefore(parentElement, null);
    }

    cqElem = SC.$(element);
    // two possibilities: example element or type string
    if (SC.typeOf(exampleElement) != SC.T_STRING) {
      var computed = null;
      if (document.defaultView && document.defaultView.getComputedStyle) {
        computed = document.defaultView.getComputedStyle(exampleElement, null);
      } else {
      computed = exampleElement.currentStyle;
      }

      var props = this._copy_computed_props;

      // firefox ONLY allows this method
      for (var i = 0; i < props.length; i++) {
        var prop = props[i], val = computed[prop];
        element.style[prop] = val;
      }

      // and why does firefox specifically need "font" set?
      var cs = element.style; // cached style
      if (cs.font === "") {
        var font = "";
        if (cs.fontStyle) font += cs.fontStyle + " ";
        if (cs.fontVariant) font += cs.fontVariant + " ";
        if (cs.fontWeight) font += cs.fontWeight + " ";
        if (cs.fontSize) font += cs.fontSize; else font += "10px"; //force a default
        if (cs.lineHeight) font += "/" + cs.lineHeight;
        font += " ";
        if (cs.fontFamily) font += cs.fontFamily; else cs += "sans-serif";

        element.style.font = font;
      }

      SC.mixin(element.style, {
        left: "0px", top: "0px", position: "absolute", bottom: "auto", right: "auto", width: "auto", height: "auto"
      });
     // clean up
      computed = null;
    } else {
      // it is a style string already
      style = exampleElement;

      // set style
      cqElem.attr("style", style + "; position:absolute; left: 0px; top: 0px; bottom: auto; right: auto; width: auto; height: auto;");
    }

    element.className = classes;
    element = null;
  },

  /**
    Tears down the string measurement environment. Usually, this doesn't _have_
    to be called, but there are too many what ifs: for example, what if the measurement
    environment has a bright green background and is over 10,000px wide? Guess what: it will
    become visible on the screen.

    So, generally, we tear the measurement environment down so that it doesn't cause issue.
    However, we keep the DOM element for efficiency.
  */
  teardownStringMeasurement: function() {
    var element = this._metricsCalculationElement;

    // clear element
    element.innerHTML = "";
    element.className = "";
    element.setAttribute("style", ""); // get rid of any junk from computed style.
    element = null;
  },

  /**
    Measures a string in the prepared environment.

    An easier and simpler alternative (but less efficient for bulk measuring) is metricsForString.

    @param string {String} The string to measure.
    @param ignoreEscape {Boolean} To NOT html escape the string.
  */
  measureString: function(string, ignoreEscape) {
    var element = this._metricsCalculationElement,
    padding = 0;

    if (!element) {
      throw new Error("measureString requires a string measurement environment to be set up. Did you mean metricsForString?");
    }

    // since the string has already been escaped (if the user wants it to be),
    // we should set the innerHTML instead of innertext
    if(ignoreEscape) element.innerHTML = string;
    // the conclusion of which to use (innerText or textContent) should be cached
    else if (typeof element.innerText != "undefined") element.innerText = string;
    else element.textContent = string;

    // for some reason IE measures 1 pixel too small
    if(SC.browser.isIE) padding = 1;

    // generate result
    var result = {
      width: element.clientWidth + padding,
      height: element.clientHeight
    };

    // Firefox seems to be 1 px short at times, especially with non english characters.
    if (SC.browser.isMozilla) {
      result.width += 1;
    }

    element = null;
    return result;
  },

  /**
    Given a string and an example element or style string, and an optional
    set of class names, calculates the width and height of that block of text.

    To constrain the width, set max-width on the exampleElement or in the style string.

    @param string {String} The string to measure.
    @param exampleElement The example element to grab styles from, or the style string to use.
    @param classNames {String} (Optional) Class names to add to the test element.
    @param ignoreEscape {Boolean} To NOT html escape the string.
  */
  metricsForString: function(string, exampleElement, classNames, ignoreEscape) {
    SC.prepareStringMeasurement(exampleElement, classNames);
    var result = SC.measureString(string, ignoreEscape);
    SC.teardownStringMeasurement();
    return result;
  }

});
