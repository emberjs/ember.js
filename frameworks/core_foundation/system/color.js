// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class
  Provides colorspace conversions between rgb and hsl.

  This object can be instantiated by using `create`
  if it's a simple RGB color, or through `SC.Color.from`,
  which will turn any valid CSS color into it's
  appropriate SC.Color.

  To get the CSS value of the color, call `toCSS`,
  which will provide the best CSS color to use
  according to browser support. This means that
  in IE, colors with an alpha channel will fall
  back to use ARGB, which requires the following
  hack to use:

      // This hack disables ClearType on IE!
      var color = SC.Color.from('rgba(0, 0, 0, .5)').get('cssText'),
          css;
      if (SC.Color.supportsARGB) {
        var gradient = "progid:DXImageTransform.Microsoft.gradient";
        css = ("-ms-filter:" + gradient + "(startColorstr=%@1,endColorstr=%@1);" +
               "filter:" + gradient + "(startColorstr=%@1,endColorstr=%@1)" + 
               "zoom: 1").fmt(color);
      } else {
        css = "background-color:" + color;
      }

  You may want to use the `sub`, `add`, and `mult`
  functions to tween colors between a start and
  end color.

  For instance, if we wanted to tween between
  the color "blue" and "teal", we would to the following:

     var blue = SC.Color.from("blue"),
         teal = SC.Color.from("teal"),
         delta = blue.sub(teal);

     // Tick is called using a percent
     // between 0 and 1
     function tick (t) {
       return blue.add(delta.mult(t)).get('cssText');
     }

  @extends SC.Object
  @extends SC.Copyable
 */
SC.Color = SC.Object.extend(
  SC.Copyable,
  /** @scope SC.Color.prototype */{

  /**
    The original color string that
    this object was created from.

    For example, if you color was
    created via `SC.Color.from("burlywood")`,
    then this would be set to `"burlywood"`.

    @type String
    @default null
   */
  original: null,

  /**
    The alpha channel (opacity).
    `a` is a percent between 0 and 1.

    @type Number
    @default 1
   */
  a: 1,

  /**
    The red value.
    `r` is an integer between 0 and 255.

    @type Number
    @default 0
   */
  r: 0,

  /**
    The green value.
    `g` is an integer between 0 and 255.

    @type Number
    @default 0
   */
  g: 0,

  /**
    The blue value.
    `b` is an integer between 0 and 255.

    @type Number
    @default 0
   */
  b: 0,

  /**
    The current hue of this color.
    Hue is a float in degrees between 0° and 360°.

    @field
    @type Number
   */
  hue: function (key, deg) {
    var clamp = SC.Color.clampToDeviceGamut,
        hsl = SC.Color.rgbToHsl(clamp(this.get('r')),
                                clamp(this.get('g')),
                                clamp(this.get('b'))),
        rgb;

    if (deg !== undefined) {
      // Normalize the hue to be between 0 and 360
      hsl[0] = (deg % 360 + 360) % 360;

      rgb = SC.Color.hslToRgb(hsl[0], hsl[1], hsl[2]);
      this.beginPropertyChanges();
      this.set('r', rgb[0]);
      this.set('g', rgb[1]);
      this.set('b', rgb[2]);
      this.endPropertyChanges();
    }
    return hsl[0];
  }.property('r', 'g', 'b').cacheable(),

  /**
    The current saturation of this color.
    Saturation is a percent between 0 and 1.

    @field
    @type Number
   */
  saturation: function (key, value) {
    var clamp = SC.Color.clampToDeviceGamut,
        hsl = SC.Color.rgbToHsl(clamp(this.get('r')),
                                clamp(this.get('g')),
                                clamp(this.get('b'))),
        rgb;

    if (value !== undefined) {
      // Clamp the saturation between 0 and 100
      hsl[1] = SC.Color.clamp(value, 0, 1);

      rgb = SC.Color.hslToRgb(hsl[0], hsl[1], hsl[2]);
      this.beginPropertyChanges();
      this.set('r', rgb[0]);
      this.set('g', rgb[1]);
      this.set('b', rgb[2]);
      this.endPropertyChanges();
    }

    return hsl[1];
  }.property('r', 'g', 'b').cacheable(),

  /**
    The current lightness of this color.
    Saturation is a percent between 0 and 1.

    @field
    @type Number
   */
  luminosity: function (key, value) {
    var clamp = SC.Color.clampToDeviceGamut,
        hsl = SC.Color.rgbToHsl(clamp(this.get('r')),
                                clamp(this.get('g')),
                                clamp(this.get('b'))),
        rgb;

    if (value !== undefined) {
      // Clamp the lightness between 0 and 1
      hsl[2] = SC.Color.clamp(value, 0, 1);

      rgb = SC.Color.hslToRgb(hsl[0], hsl[1], hsl[2]);
      this.beginPropertyChanges();
      this.set('r', rgb[0]);
      this.set('g', rgb[1]);
      this.set('b', rgb[2]);
      this.endPropertyChanges();
    }
    return hsl[2];
  }.property('r', 'g', 'b').cacheable(),

  /**
    Whether two colors are equivalent.
    @param {SC.Color} color The color to compare this one to.
    @returns {Boolean} YES if the two colors are equivalent
   */
  isEqualTo: function (color) {
    return this.get('r') === color.get('r') &&
           this.get('g') === color.get('g') &&
           this.get('b') === color.get('b') &&
           this.get('a') === color.get('a');
  },

  /**
    Returns a CSS string of the color
    under the #aarrggbb scheme.

    This color is only valid for IE
    filters. This is here as a hack
    to support animating rgba values
    in older versions of IE by using
    filter gradients with no change in
    the actual gradient.

    @returns {String} The color in the rgba color space as an argb value.
   */
  toArgb: function () {
    var clamp = SC.Color.clampToDeviceGamut;

    return '#' + [clamp(255 * this.get('a')),
                  clamp(this.get('r')),
                  clamp(this.get('g')),
                  clamp(this.get('b'))].map(function (v) {
      v = v.toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  },

  /**
    Returns a CSS string of the color
    under the #rrggbb scheme.

    @returns {String} The color in the rgb color space as a hex value.
   */
  toHex: function () {
    var clamp = SC.Color.clampToDeviceGamut;
    return '#' + [clamp(this.get('r')),
                  clamp(this.get('g')),
                  clamp(this.get('b'))].map(function (v) {
      v = v.toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  },

  /**
    Returns a CSS string of the color
    under the rgb() scheme.

    @returns {String} The color in the rgb color space.
   */
  toRgb: function () {
    var clamp = SC.Color.clampToDeviceGamut;
    return 'rgb(' + clamp(this.get('r')) + ','
                  + clamp(this.get('g')) + ','
                  + clamp(this.get('b')) + ')';
  },

  /**
    Returns a CSS string of the color
    under the rgba() scheme.

    @returns {String} The color in the rgba color space.
   */
  toRgba: function () {
    var clamp = SC.Color.clampToDeviceGamut;
    return 'rgba(' + clamp(this.get('r')) + ','
                   + clamp(this.get('g')) + ','
                   + clamp(this.get('b')) + ','
                   + this.get('a') + ')';
  },

  /**
    Returns a CSS string of the color
    under the hsl() scheme.

    @returns {String} The color in the hsl color space.
   */
  toHsl: function () {
    var round = Math.round;
    return 'hsl(' + round(this.get('hue')) + ','
                  + round(this.get('saturation') * 100) + '%,'
                  + round(this.get('luminosity') * 100) + '%)';
  },

  /**
    Returns a CSS string of the color
    under the hsla() scheme.

    @returns {String} The color in the hsla color space.
   */
  toHsla: function () {
    var round = Math.round;
    return 'hsla(' + round(this.get('hue')) + ','
                   + round(this.get('saturation') * 100) + '%,'
                   + round(this.get('luminosity') * 100) + '%,'
                   + this.get('a') + ')';
  },

  /**
    The CSS string representation that will be
    best displayed by the browser.

    @field
    @type String
   */
  cssText: function () {
    var supportsAlphaChannel = SC.Color.supportsRgba ||
                               SC.Color.supportsArgb;
    return (this.a === 1 || !supportsAlphaChannel)
           ? this.toHex()
           : SC.Color.supportsRgba
           ? this.toRgba()
           : this.toArgb();
  }.property('r', 'g', 'b', 'a').cacheable(),

  /**
    Returns a clone of this color.
    This will always a deep clone.

    @returns {SC.Color} The clone color.
   */
  copy: function () {
    return SC.Color.create({
      original: this.get('original'),
      r: this.get('r'),
      g: this.get('g'),
      b: this.get('b'),
      a: this.get('a')
    });
  },

  /**
    Returns a color that's the difference between two colors.

    Note that the result might not be a valid CSS color.

    @param {SC.Color} color The color to subtract from this one.
    @returns {SC.Color} The difference between the two colors.
   */
  sub: function (color) {
    return SC.Color.create({
      r: this.get('r') - color.get('r'),
      g: this.get('g') - color.get('g'),
      b: this.get('b') - color.get('b'),
      a: this.get('a') - color.get('a')
    });
  },

  /**
    Returns a color that's the addition of two colors.

    Note that the result might not be a valid CSS color.

    @param {SC.Color} color The color to add to this one.
    @returns {SC.Color} The addition of the two colors.
   */
  add: function (color) {
    return SC.Color.create({
      r: this.get('r') + color.get('r'),
      g: this.get('g') + color.get('g'),
      b: this.get('b') + color.get('b'),
      a: this.get('a') + color.get('a')
    });
  },

  /**
    Returns a color that has it's units uniformly multiplied
    by a given multiplier.

    Note that the result might not be a valid CSS color.

    @param {Number} multipler How much to multiply rgba by.
    @returns {SC.Color} The adjusted color.
   */
  mult: function (multiplier) {
    var round = Math.round;
    return SC.Color.create({
      r: round(this.get('r') * multiplier),
      g: round(this.get('g') * multiplier),
      b: round(this.get('b') * multiplier),
      a: this.get('a') * multiplier
    });
  }
});

SC.Color.mixin(
  /** @scope SC.Color */{

  /**
    Whether this browser supports the rgba color model.
    Check courtesy of Modernizr.
    @type Boolean
    @see https://github.com/Modernizr/Modernizr/blob/master/modernizr.js#L552
   */
  supportsRgba: (function () {
    var style = document.getElementsByTagName('script')[0].style,
        cssText = style.cssText,
        supported;

    style.cssText = 'background-color:rgba(5,2,1,.5)';
    supported = style.backgroundColor.indexOf('rgba') !== -1;
    style.cssText = cssText;
    return supported;
  }()),

  /**
    Whether this browser supports the argb color model.
    @type Boolean
   */
  supportsArgb: (function () {
    var style = document.getElementsByTagName('script')[0].style,
        cssText = style.cssText,
        supported;

    style.cssText = 'filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#55000000", endColorstr="#55000000");';
    supported = style.backgroundColor.indexOf('#55000000') !== -1;
    style.cssText = cssText;
    return supported;
  }()),

  /**
    Used to clamp a value in between a minimum
    value and a maximum value.

    @param {Number} value The value to clamp.
    @param {Number} min The minimum number the value can be.
    @param {Number} max The maximum number the value can be.
    @returns {Number} The value clamped between min and max.
   */
  clamp: function (value, min, max) {
    return Math.max(Math.min(value, max), min);
  },

  /**
    Clamps a number, then rounds it to the nearest integer.

    @param {Number} value The value to clamp.
    @param {Number} min The minimum number the value can be.
    @param {Number} max The maximum number the value can be.
    @returns {Number} The value clamped between min and max as an integer.
    @see SC.Color.clamp
   */
  clampInt: function (value, min, max) {
    return Math.round(SC.Color.clamp(value, min, max));
  },

  /**
    Clamps a number so it lies in the device gamut.
    For screens, this an integer between 0 and 255.

    @param {Number} value The value to clamp
    @returns {Number} The value clamped to the device gamut.
   */
  clampToDeviceGamut: function (value) {
    return SC.Color.clampInt(value, 0, 255);
  },

  /**
    Returns the RGB for a color defined in
    the HSV color space.

    @param {Number} h The hue of the color as a degree between 0° and 360°
    @param {Number} s The saturation of the color as a percent between 0 and 1.
    @param {Number} v The value of the color as a percent between 0 and 1.
    @returns {Number[]} A RGB triple in the form `(r, g, b)`
      where each of the values are integers between 0 and 255.
   */
  hsvToRgb: function (h, s, v) {
    h /= 360;
    var r, g, b,
        i = Math.floor(h * 6),
        f = h * 6 - i,
        p = v * (1 - s),
        q = v * (1 - (s * f)),
        t = v * (1 - (s * (1 - f))),
        rgb = [[v, t, p],
               [q, v, p],
               [p, v, t],
               [p, q, v],
               [t, p, v],
               [v, p, q]],
        clamp = SC.Color.clampToDeviceGamut;

    i = i % 6;
    r = clamp(rgb[i][0] * 255);
    g = clamp(rgb[i][1] * 255);
    b = clamp(rgb[i][2] * 255);

    return [r, g, b];
  },

  /**
    Returns an RGB color transformed into the
    HSV colorspace as triple `(h, s, v)`.

    @param {Number} r The red component as an integer between 0 and 255.
    @param {Number} g The green component as an integer between 0 and 255.
    @param {Number} b The blue component as an integer between 0 and 255.
    @returns {Number[]} A HSV triple in the form `(h, s, v)`
      where `h` is in degrees (as a float) between 0° and 360° and
            `s` and `v` are percents between 0 and 1.
   */
  rgbToHsv: function (r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min,
        h, s = max === 0 ? 0 : d / max, v = max;

    // achromatic
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      }
      h /= 6;
    }
    h *= 360;

    return [h, s, v];
  },

  /**
    Returns the RGB for a color defined in
    the HSL color space.

    (Notes are taken from the W3 spec, and are
     written in ABC)

    @param {Number} h The hue of the color as a degree between 0° and 360°
    @param {Number} s The saturation of the color as a percent between 0 and 1.
    @param {Number} l The luminosity of the color as a percent between 0 and 1.
    @returns {Number[]} A RGB triple in the form `(r, g, b)`
      where each of the values are integers between 0 and 255.
    @see http://www.w3.org/TR/css3-color/#hsl-color
   */
  hslToRgb: function (h, s, l) {
    h /= 360;

  // HOW TO RETURN hsl.to.rgb(h, s, l):
    var m1, m2, hueToRgb = SC.Color.hueToRgb,
        clamp = SC.Color.clampToDeviceGamut;

    // SELECT:
      // l<=0.5: PUT l*(s+1) IN m2
      // ELSE: PUT l+s-l*s IN m2
    m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
    // PUT l*2-m2 IN m1
    m1 = l * 2 - m2;
    // PUT hue.to.rgb(m1, m2, h+1/3) IN r
    // PUT hue.to.rgb(m1, m2, h    ) IN g
    // PUT hue.to.rgb(m1, m2, h-1/3) IN b
    // RETURN (r, g, b)
    return [clamp(hueToRgb(m1, m2, h + 1/3) * 255),
            clamp(hueToRgb(m1, m2, h)       * 255),
            clamp(hueToRgb(m1, m2, h - 1/3) * 255)];
  },

  /** @private
    Returns the RGB value for a given hue.
   */
  hueToRgb: function (m1, m2, h) {
  // HOW TO RETURN hue.to.rgb(m1, m2, h):
    // IF h<0: PUT h+1 IN h
    if (h < 0) h++;
    // IF h>1: PUT h-1 IN h
    if (h > 1) h--;
    // IF h*6<1: RETURN m1+(m2-m1)*h*6
    if (h < 1/6) return m1 + (m2 - m1) * h * 6;
    // IF h*2<1: RETURN m2
    if (h < 1/2) return m2;
    // IF h*3<2: RETURN m1+(m2-m1)*(2/3-h)*6
    if (h < 2/3) return m1 + (m2 - m1) * (2/3 - h) * 6;
    // RETURN m1
    return m1;
  },

  /**
    Returns an RGB color transformed into the
    HSL colorspace as triple `(h, s, l)`.

    @param {Number} r The red component as an integer between 0 and 255.
    @param {Number} g The green component as an integer between 0 and 255.
    @param {Number} b The blue component as an integer between 0 and 255.
    @returns {Number[]} A HSL triple in the form `(h, s, l)`
      where `h` is in degrees (as a float) between 0° and 360° and
            `s` and `l` are percents between 0 and 1.
   */
  rgbToHsl: function (r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        h, s, l = (max + min) / 2,
        d = max - min;

    // achromatic
    if (max === min) {
      h = s = 0;
    } else {
      s = l > 0.5
          ? d / (2 - max - min)
          : d / (max + min);

      switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      }
      h /= 6;
    }
    h *= 360;

    return [h, s, l];
  },

  // ..........................................................
  // Regular expressions for accepted color types
  // 
  PARSE_RGBA: /^rgba\(\s*([\d]+%?)\s*,\s*([\d]+%?)\s*,\s*([\d]+%?)\s*,\s*([.\d]+)\s*\)$/,
  PARSE_RGB : /^rgb\(\s*([\d]+%?)\s*,\s*([\d]+%?)\s*,\s*([\d]+%?)\s*\)$/,
  PARSE_HSLA: /^hsla\(\s*(-?[\d]+)\s*\s*,\s*([\d]+)%\s*,\s*([\d]+)%\s*,\s*([.\d]+)\s*\)$/,
  PARSE_HSL : /^hsl\(\s*(-?[\d]+)\s*,\s*([\d]+)%\s*,\s*([\d]+)%\s*\)$/,
  PARSE_HEX : /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
  PARSE_ARGB: /^#[0-9a-fA-F]{8}$/,

  /**
    A mapping of anglicized colors to their hexadecimal
    representation.

    Computed by running the following code at http://www.w3.org/TR/css3-color

       var T = {}, color = null,
           colors = document.querySelectorAll('.colortable')[1].querySelectorAll('.c');

       for (var i = 0; i < colors.length; i++) {
         if (i % 4 === 0) {
           color = colors[i].getAttribute('style').split(':')[1];
         } else if (i % 4 === 1) {
           T[color] = colors[i].getAttribute('style').split(':')[1].toUpperCase();
         }
       }
       JSON.stringify(T);

    @see http://www.w3.org/TR/css3-color/#svg-color
   */
  KEYWORDS: {"aliceblue":"#F0F8FF","antiquewhite":"#FAEBD7","aqua":"#00FFFF","aquamarine":"#7FFFD4","azure":"#F0FFFF","beige":"#F5F5DC","bisque":"#FFE4C4","black":"#000000","blanchedalmond":"#FFEBCD","blue":"#0000FF","blueviolet":"#8A2BE2","brown":"#A52A2A","burlywood":"#DEB887","cadetblue":"#5F9EA0","chartreuse":"#7FFF00","chocolate":"#D2691E","coral":"#FF7F50","cornflowerblue":"#6495ED","cornsilk":"#FFF8DC","crimson":"#DC143C","cyan":"#00FFFF","darkblue":"#00008B","darkcyan":"#008B8B","darkgoldenrod":"#B8860B","darkgray":"#A9A9A9","darkgreen":"#006400","darkgrey":"#A9A9A9","darkkhaki":"#BDB76B","darkmagenta":"#8B008B","darkolivegreen":"#556B2F","darkorange":"#FF8C00","darkorchid":"#9932CC","darkred":"#8B0000","darksalmon":"#E9967A","darkseagreen":"#8FBC8F","darkslateblue":"#483D8B","darkslategray":"#2F4F4F","darkslategrey":"#2F4F4F","darkturquoise":"#00CED1","darkviolet":"#9400D3","deeppink":"#FF1493","deepskyblue":"#00BFFF","dimgray":"#696969","dimgrey":"#696969","dodgerblue":"#1E90FF","firebrick":"#B22222","floralwhite":"#FFFAF0","forestgreen":"#228B22","fuchsia":"#FF00FF","gainsboro":"#DCDCDC","ghostwhite":"#F8F8FF","gold":"#FFD700","goldenrod":"#DAA520","gray":"#808080","green":"#008000","greenyellow":"#ADFF2F","grey":"#808080","honeydew":"#F0FFF0","hotpink":"#FF69B4","indianred":"#CD5C5C","indigo":"#4B0082","ivory":"#FFFFF0","khaki":"#F0E68C","lavender":"#E6E6FA","lavenderblush":"#FFF0F5","lawngreen":"#7CFC00","lemonchiffon":"#FFFACD","lightblue":"#ADD8E6","lightcoral":"#F08080","lightcyan":"#E0FFFF","lightgoldenrodyellow":"#FAFAD2","lightgray":"#D3D3D3","lightgreen":"#90EE90","lightgrey":"#D3D3D3","lightpink":"#FFB6C1","lightsalmon":"#FFA07A","lightseagreen":"#20B2AA","lightskyblue":"#87CEFA","lightslategray":"#778899","lightslategrey":"#778899","lightsteelblue":"#B0C4DE","lightyellow":"#FFFFE0","lime":"#00FF00","limegreen":"#32CD32","linen":"#FAF0E6","magenta":"#FF00FF","maroon":"#800000","mediumaquamarine":"#66CDAA","mediumblue":"#0000CD","mediumorchid":"#BA55D3","mediumpurple":"#9370DB","mediumseagreen":"#3CB371","mediumslateblue":"#7B68EE","mediumspringgreen":"#00FA9A","mediumturquoise":"#48D1CC","mediumvioletred":"#C71585","midnightblue":"#191970","mintcream":"#F5FFFA","mistyrose":"#FFE4E1","moccasin":"#FFE4B5","navajowhite":"#FFDEAD","navy":"#000080","oldlace":"#FDF5E6","olive":"#808000","olivedrab":"#6B8E23","orange":"#FFA500","orangered":"#FF4500","orchid":"#DA70D6","palegoldenrod":"#EEE8AA","palegreen":"#98FB98","paleturquoise":"#AFEEEE","palevioletred":"#DB7093","papayawhip":"#FFEFD5","peachpuff":"#FFDAB9","peru":"#CD853F","pink":"#FFC0CB","plum":"#DDA0DD","powderblue":"#B0E0E6","purple":"#800080","red":"#FF0000","rosybrown":"#BC8F8F","royalblue":"#4169E1","saddlebrown":"#8B4513","salmon":"#FA8072","sandybrown":"#F4A460","seagreen":"#2E8B57","seashell":"#FFF5EE","sienna":"#A0522D","silver":"#C0C0C0","skyblue":"#87CEEB","slateblue":"#6A5ACD","slategray":"#708090","slategrey":"#708090","snow":"#FFFAFA","springgreen":"#00FF7F","steelblue":"#4682B4","tan":"#D2B48C","teal":"#008080","thistle":"#D8BFD8","tomato":"#FF6347","turquoise":"#40E0D0","violet":"#EE82EE","wheat":"#F5DEB3","white":"#FFFFFF","whitesmoke":"#F5F5F5","yellow":"#FFFF00","yellowgreen":"#9ACD32"},

  /**
    Parses a CSS color into a `SC.Color` object.
    Any valid CSS color should work here.

    @param {String} color The color to parse into a `SC.Color` object.
    @returns {SC.Color} The color object representing the color passed in.
   */
  from: function (color) {
    var C = SC.Color,
        oColor = color,
        r, g, b, a = 1,
        percentOrDeviceGamut = function (value) {
          var v = parseInt(value, 10);
          return value.slice(-1) === "%"
                 ? C.clampInt(v * 2.55, 0, 255)
                 : C.clampInt(v, 0, 255);
        };

    if (C.KEYWORDS.hasOwnProperty(color)) {
      color = C.KEYWORDS[color];
    }

    if (C.PARSE_RGB.test(color)) {
      color = color.match(C.PARSE_RGB);

      r = percentOrDeviceGamut(color[1]);
      g = percentOrDeviceGamut(color[2]);
      b = percentOrDeviceGamut(color[3]);

    } else if (C.PARSE_RGBA.test(color)) {
      color = color.match(C.PARSE_RGBA);

      r = percentOrDeviceGamut(color[1]);
      g = percentOrDeviceGamut(color[2]);
      b = percentOrDeviceGamut(color[3]);

      a = parseFloat(color[4], 10);

    } else if (C.PARSE_HEX.test(color)) {
      // The three-digit RGB notation (#rgb)
      // is converted into six-digit form (#rrggbb)
      // by replicating digits, not by adding zeros.
      if (color.length === 4) {
        color = '#' + color.charAt(1) + color.charAt(1)
                    + color.charAt(2) + color.charAt(2)
                    + color.charAt(3) + color.charAt(3);
      }

      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);

    } else if (C.PARSE_ARGB.test(color)) {
      r = parseInt(color.slice(3, 5), 16);
      g = parseInt(color.slice(5, 7), 16);
      b = parseInt(color.slice(7, 9), 16);

      a = parseInt(color.slice(1, 3), 16) / 255;

    } else if (C.PARSE_HSL.test(color)) {
      color = color.match(C.PARSE_HSL);
      color = C.hslToRgb(((parseInt(color[1], 10) % 360 + 360) % 360),
                         C.clamp(parseInt(color[2], 10) / 100, 0, 1),
                         C.clamp(parseInt(color[3], 10) / 100, 0, 1));

      r = color[0];
      g = color[1];
      b = color[2];

    } else if (C.PARSE_HSLA.test(color)) {
      color = color.match(C.PARSE_HSLA);

      a = parseFloat(color[4], 10);

      color = C.hslToRgb(((parseInt(color[1], 10) % 360 + 360) % 360),
                         C.clamp(parseInt(color[2], 10) / 100, 0, 1),
                         C.clamp(parseInt(color[3], 10) / 100, 0, 1));

      r = color[0];
      g = color[1];
      b = color[2];

    // See http://www.w3.org/TR/css3-color/#transparent-def
    } else if (color === "transparent") {
      r = g = b = 0;
      a = 0;

    } else {
      return NO;
    }

    return SC.Color.create({
      original: oColor,
      r: C.clampInt(r, 0, 255),
      g: C.clampInt(g, 0, 255),
      b: C.clampInt(b, 0, 255),
      a: C.clamp(a, 0, 1)
    });
  }
});
