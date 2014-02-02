// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  These functions are deprecated use SC.Color instead.
  @deprecated
  @see SC.Color
 */
SC.mixin ( /** @scope SC */ {

  /** Returns hex color from hsv value */
  convertHsvToHex: function (h, s, v) {
    // @if (debug)
    SC.Logger.warn("SC.convertHsvToHex is deprecated. Please use SC.Color.hsvToRgb instead.");
    // @endif
    var rgb = SC.Color.hsvToRgb(h, s, v);
    return SC.Color.create({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHex();
  },

  /** Returns hsv color from hex value */
  convertHexToHsv: function (hex) {
    // @if (debug)
    SC.Logger.warn("SC.convertHexToHsv is deprecated. Please use SC.Color.rgbToHsv instead.");
    // @endif
    var color = SC.Color.from(hex);
    return color && SC.Color.rgbToHsv(color.r, color.g, color.b);
  },

  /** regular expression for parsing color: rgb, hex */
  PARSE_COLOR_RGBRE: /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  PARSE_COLOR_HEXRE: /^\#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,

  // return an array of r,g,b colour
  expandColor: function(color) {
    // @if (debug)
    SC.Logger.warn("SC.expandColor is deprecated. Please use SC.Color.from instead.");
    // @endif
    var hexColor, red, green, blue;
    hexColor = this.parseColor(color);
    if (hexColor) {
      red = parseInt(hexColor.slice(1, 3), 16);
      green = parseInt(hexColor.slice(3, 5), 16);
      blue = parseInt(hexColor.slice(5, 7), 16);
      return [red,green,blue];
    }
  },

  // parse rgb color or 3-digit hex color to return a properly formatted 6-digit hex colour spec, or false
  parseColor: function(string) {
    // @if (debug)
    SC.Logger.warn("SC.expandColor is deprecated. Please use SC.Color.from instead.");
    // @endif
    var i=0, color = '#', match, part;
    if(match = this.PARSE_COLOR_RGBRE.exec(string)) {
      for (i=1; i<=3; i++) {
        part = Math.max(0, Math.min(255, parseInt(match[i],0)));
        color += this.toColorPart(part);
      }
      return color;
    }
    if (match = this.PARSE_COLOR_HEXRE.exec(string)) {
      if(match[1].length == 3) {
        for (i=0; i<3; i++) {
          color += match[1].charAt(i) + match[1].charAt(i);
        }
        return color;
      }
      return '#' + match[1];
    }
    return false;
  },

  // convert one r,g,b number to a 2 digit hex string
  toColorPart: function(number) {
    if (number > 255) number = 255;
    var digits = number.toString(16);
    if (number < 16) return '0' + digits;
    return digits;
  }


});
