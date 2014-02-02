// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ...............................................
// SC.Color.from parsing
//

function matches(c, r, g, b, a, msg) {
  var isEqual = c.r === r &&
                c.g === g &&
                c.b === b &&
                c.a === a;
  ok(isEqual, msg + " [rgba(%@, %@, %@) === rgba(%@, %@, %@, %@)]".fmt(r, g, b, a,
                                                                     c.r, c.g, c.b, c.a));
};

test("SC.Color.from(rgb)", function () {
  matches(SC.Color.from("rgb(212, 15, 2)"),
                             212, 15, 2, 1,
                        "rgb() colors should be parseable");
  matches(SC.Color.from("rgb(10000, 20, 256)"),
                             255, 20, 255, 1,
                        "Colors should be clamped to the device gamut");

  matches(SC.Color.from("rgb(10%, 20%, 30%)"),
                             26, 51, 77, 1,
                        "rgb should allow percents as values");

  matches(SC.Color.from("rgb(140%, 200%, 350%)"),
                             255, 255, 255, 1,
                        "rgb percents should be clamped to the device gamut");

  ok(SC.Color.from("rgb(1,2,3)"), "Whitespace shouldn't matter");
  ok(SC.Color.from("rgb(1   ,           2   ,   3  )"), "Whitespace shouldn't matter");
});

test("SC.Color.from(rgba)", function () {
  matches(SC.Color.from("rgba(212, 15, 2, .2)"),
                              212, 15, 2, .2,
                        "rgba() colors should be parseable");
  matches(SC.Color.from("rgba(260, 255, 20, 1.5)"),
                              255, 255, 20, 1,
                        "Alpha should be clamped to 1");

  matches(SC.Color.from("rgba(10%, 20%, 30%, .5)"),
                             26, 51, 77, .5,
                        "rgba should allow percents as values");

  matches(SC.Color.from("rgba(140%, 200%, 350%, .5)"),
                             255, 255, 255, .5,
                        "rgba percents should be clamped to the device gamut");

  ok(!SC.Color.from("rgba(255, 255, 255, -.2)"),
     "Invalid alpha should make the SC.Color.from return 'NO'");

  ok(SC.Color.from("rgba(1,2,3,1)"), "Whitespace shouldn't matter");
  ok(SC.Color.from("rgba(1   ,           2   ,   3 , 1 )"), "Whitespace shouldn't matter");
});

test("SC.Color.from() with invalid rgb colors", function () {
  ok(!SC.Color.from("rgb(0, 0, 0, 0)"), "Too many arguments");

  ok(!SC.Color.from("rgba(0, 0, 0)"), "Too few arguments");
  ok(!SC.Color.from("rgb(0, 0)"), "Too few arguments");

  ok(!SC.Color.from("rgb(0.0, 0.0, 0.0)"), "Floats are not allowed");

  ok(!SC.Color.from("rgb(0, 0, 0"), "Missing parenthesis");

  ok(!SC.Color.from("rgb(260, -10, 5)"), "Negative numbers");
});

test("SC.Color.from(#rgb)", function () {
  matches(SC.Color.from("#21a"),
          34, 17, 170, 1,
          "#rgb colors should be parseable");

  ok(SC.Color.from("#ABC").isEqualTo(
     SC.Color.from("#abc")),
     "Character casing should not matter with hex colors");
});

test("SC.Color.from(#rrggbb)", function () {
  matches(SC.Color.from("#ABCDEF"),
          171, 205, 239, 1,
          "#rrggbb colors should be parseable");

  ok(SC.Color.from("#ABCDEF").isEqualTo(
     SC.Color.from("#abcdef")),
     "Character casing should not matter with hex colors");
});

test("SC.Color.from(#aarrggbb)", function () {
  matches(SC.Color.from("#00ABCDEF"),
          171, 205, 239, 0,
          "#aarrggbb colors should be parseable");

  ok(SC.Color.from("#BAABCDEF").isEqualTo(
     SC.Color.from("#baabcdef")),
     "Character casing should not matter with hex colors");
});

test("SC.Color.from() with invalid hex colors", function () {
  ok(!SC.Color.from("#GAB"), "Invalid character");

  ok(!SC.Color.from("#0000"), "Invalid length");
  ok(!SC.Color.from("#00000"), "Invalid length");
  ok(!SC.Color.from("#0000000"), "Invalid length");
});

test("SC.Color.from(hsl)", function () {
  matches(SC.Color.from("hsl(330, 60%, 54%)"),
          208, 67, 138, 1,
          "hsl() colors should be parseable");

  matches(SC.Color.from("hsl(-90, 50%, 44%)"),
          112, 56, 168, 1,
          "negative hues should be allowed");

  matches(SC.Color.from("hsl(-810, 50%, 44%)"),
          112, 56, 168, 1,
          "negative hues should be allowed");

  matches(SC.Color.from("hsl(690, 60%, 54%)"),
          208, 67, 138, 1,
          "hues above 360 degrees should be valid");

  matches(SC.Color.from("hsl(1050, 60%, 54%)"),
          208, 67, 138, 1,
          "hues above 360 degrees should be valid");

  matches(SC.Color.from("hsl(1050, 150%, 190%)"),
          255, 255, 255, 1,
          "luminosity and saturation should be clamped between 0 and 100");

  ok(SC.Color.from("hsl(1,2%,3%)"), "Whitespace shouldn't matter");
  ok(SC.Color.from("hsl(1   ,           2%   ,   3% )"), "Whitespace shouldn't matter");
});

test("SC.Color.from(hsla)", function () {
  matches(SC.Color.from("hsla(210, 87%, 55%, 0.4)"),
          40, 140, 240, .4,
          "hsla() colors should be parseable");

  matches(SC.Color.from("hsla(-150, 87%, 55%, 0.4)"),
          40, 140, 240, .4,
          "negative hues should be allowed");

  matches(SC.Color.from("hsla(-510, 87%, 55%, 0.4)"),
          40, 140, 240, .4,
          "negative hues should be allowed");

  matches(SC.Color.from("hsla(570, 87%, 55%, 0.4)"),
          40, 140, 240, .4,
          "hues above 360 degrees should be valid");

  matches(SC.Color.from("hsla(930, 87%, 55%, 0.4)"),
          40, 140, 240, .4,
          "hues above 360 degrees should be valid");

  matches(SC.Color.from("hsla(930, 0427%, 200%, 0.4)"),
          255, 255, 255, .4,
          "luminosity and saturation should be clamped between 0 and 100");

  ok(SC.Color.from("hsla(1,2%,3%,1)"), "Whitespace shouldn't matter");
  ok(SC.Color.from("hsla(1   ,           2%   ,   3% , 1 )"), "Whitespace shouldn't matter");
});

test("SC.Color.from(transparent)", function () {
  matches(SC.Color.from("transparent"),
          0, 0, 0, 0,
          "transparent should be black with an alpha of 0");
});

test("SC.Color.from(white, black)", function () {
  matches(SC.Color.from("white"),
          255, 255, 255, 1,
          "white should convert to rgb(255, 255, 255)");

  matches(SC.Color.from("black"),
          0, 0, 0, 1,
          "black should convert to rgb(0, 0, 0)");
});

// ...............................................
// SC.Color helper functions
//

test("SC.Color.clamp", function () {
  equals(SC.Color.clamp(0, 0, 1), 0);
  equals(SC.Color.clamp(.5, 0, 1), .5);
  equals(SC.Color.clamp(1, 0, 1), 1);

  equals(SC.Color.clamp(-1, 0, 1), 0);
  equals(SC.Color.clamp(2, 0, 1), 1);
});

test("SC.Color.clampInt", function () {
  equals(SC.Color.clampInt(0, 0, 1), 0);
  equals(SC.Color.clampInt(.5, 0, 1), 1);
  equals(SC.Color.clampInt(1, 0, 1), 1);

  equals(SC.Color.clampInt(-1, 0, 1), 0);
  equals(SC.Color.clampInt(2, 0, 1), 1);
});

test("SC.Color.clampToDeviceGamut", function () {
  equals(SC.Color.clampToDeviceGamut(250.25), 250);
  equals(SC.Color.clampToDeviceGamut(260), 255);
  equals(SC.Color.clampToDeviceGamut(-20), 0);
});

test("SC.Color.supportsArgb", function () {
  ok(SC.Color.hasOwnProperty('supportsArgb'),
     "supportsARGB should exist on SC.Color");
});

test("SC.Color.supportsRgba", function () {
  ok(SC.Color.hasOwnProperty('supportsRgba'),
     "supportsRGBA should exist on SC.Color");
});

// ...............................................
// SC.Color color space conversion functions
//

test("SC.Color.hsvToRgb", function () {
  var rgb = SC.Color.hsvToRgb(252, .94, .7843),
      isValid;

  isValid = rgb[0] === 50 &&
            rgb[1] === 12 &&
            rgb[2] === 200;
  ok(isValid, "[rgb(50, 12, 200) === rgb(" + rgb.join(', ') + ")");
});

test("SC.Color.rgbToHsv", function () {
  var hsv = SC.Color.rgbToHsv(50, 12, 200),
      isValid;

  hsv[0] = Math.round(hsv[0]);
  hsv[1] = Math.round(hsv[1] * 100);
  hsv[2] = Math.round(hsv[2] * 100);

  isValid = hsv[0] === 252 &&
            hsv[1] === 94 &&
            hsv[2] === 78;
  ok(isValid, "[rgb(50, 12, 200) === hsv(212, 75%, 49%) === hsv(" + hsv.join(', ') + ")]");
});

test("Converting between color spaces doesn't reduce accuracy", function () {
  var rgb = [20, 145, 42],
      cRgb = SC.Color.hsvToRgb.apply(null, SC.Color.rgbToHsv.apply(null, rgb));

  ok(rgb[0] === cRgb[0] &&
     rgb[1] === cRgb[1] &&
     rgb[2] === cRgb[2]);

  cRgb = SC.Color.hslToRgb.apply(null, SC.Color.rgbToHsl.apply(null, rgb));

  ok(rgb[0] === cRgb[0] &&
     rgb[1] === cRgb[1] &&
     rgb[2] === cRgb[2]);
});

// ...............................................
// SC.Copyable
//

test("SC.Color.isCopyable", function () {
  ok(SC.Color.create().isCopyable);
});

test("SC.Color copy() creates a clone of the current color", function () {
  var teal = SC.Color.from("teal"),
      cTeal = teal.copy();

  ok(teal.isEqualTo(cTeal), "the colors should be equivalent");
  teal.incrementProperty('hue', 30);
  ok(!teal.isEqualTo(cTeal), "mutating one color should not affect the other");
});

// ...............................................
// SC.Color properties
//

test("SC.Color#cssText", function () {
  var color = SC.Color.create({
    r: 255, g: 255, b: 255
  });
  equals(color.get('cssText'), '#ffffff');

  color.set('r', 0);
  equals(color.get('cssText'), '#00ffff');

  color.set('g', 128);
  equals(color.get('cssText'), '#0080ff');

  color.set('b', 128);
  equals(color.get('cssText'), '#008080');

  color.set('a', 0.5);
  ok(color.get('cssText') !== '#008080');
});

test("SC.Color#hue", function () {
  var color = SC.Color.from("hsl(330, 60%, 54%)"),
      round = Math.round;

  equals(round(color.get('hue')), 330);

  color.set('hue', 300);

  equals(color.get('r'), 208);
  equals(color.get('g'), 67);
  equals(color.get('b'), 208);

  equals(round(color.get('hue')), 300);
});

test("SC.Color#saturation", function () {
  var color = SC.Color.from("hsl(330, 60%, 54%)"),
      round = Math.round;

  equals(round(color.get('saturation') * 100), 60);

  color.set('saturation', .5);

  equals(color.get('r'), 196);
  equals(color.get('g'), 79);
  equals(color.get('b'), 138);

  equals(round(color.get('saturation') * 100), 50);
});

test("SC.Color#luminosity", function () {
  var color = SC.Color.from("hsl(330, 60%, 54%)"),
      round = Math.round;

  equals(round(color.get('luminosity') * 100), 54);

  color.set('luminosity', .74);

  equals(color.get('r'), 228);
  equals(color.get('g'), 149);
  equals(color.get('b'), 189);

  equals(round(color.get('luminosity') * 100), 74);
});

test("SC.Color#isEqualTo", function () {
  var white = SC.Color.from("white"),
      cWhite = SC.Color.create({ r: 255, g: 255, b: 255 });

  ok(white.isEqualTo(cWhite));
});

test("SC.Color#toRgb", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toRgb(),
         "rgb(50,240,250)");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toRgb(),
         "rgb(0,255,250)",
         "Color clamping should occur");
});

test("SC.Color#toRgba", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toRgba(),
         "rgba(50,240,250,0.4)");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toRgba(),
         "rgba(0,255,250,1)",
         "Color clamping should occur");
});

test("SC.Color#toHex", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toHex(),
         "#32f0fa");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toHex(),
         "#00fffa",
         "Color clamping should occur");
});

test("SC.Color#toArgb", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toArgb(),
         "#6632f0fa");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toArgb(),
         "#ff00fffa",
         "Color clamping should occur");
});

test("SC.Color#toHsl", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toHsl(),
         "hsl(183,95%,59%)");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toHsl(),
         "hsl(179,100%,50%)",
         "Color clamping should occur");
});

test("SC.Color#toHsla", function () {
  equals(SC.Color.create({ r: 50, g: 240, b: 250, a: .4 }).toHsla(),
         "hsla(183,95%,59%,0.4)");

  equals(SC.Color.create({ r: -50, g: 270, b: 250 }).toHsla(),
         "hsla(179,100%,50%,1)",
         "Color clamping should occur");
});

test("SC.Color#add", function () {
  var white = SC.Color.create({ r: 255, g: 255, b: 255 }),
      red = SC.Color.create({ r: 255, g: 0, b: 25, a: .4 }),
      c;

  c = white.add(red);
  equals(c.get('r'), 510);
  equals(c.get('g'), 255);
  equals(c.get('b'), 280);
  equals(c.get('a'), 1.4);
});

test("SC.Color#sub", function () {
  var white = SC.Color.create({ r: 255, g: 255, b: 255 }),
      red = SC.Color.create({ r: 255, g: 0, b: 25, a: .4 }),
      c;

  c = white.sub(red);
  equals(c.get('r'), 0);
  equals(c.get('g'), 255);
  equals(c.get('b'), 230);
  equals(c.get('a'), .6);
});

test("SC.Color#mult", function () {
  var c = SC.Color.create({ r: 10, g: 20, b: 30 });

  c = c.mult(.5);
  equals(c.get('r'), 5);
  equals(c.get('g'), 10);
  equals(c.get('b'), 15);
  equals(c.get('a'), .5);
});
