// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// Rect utility Tests
// ========================================================================


module("Rect utilities");

test("Get the X & Y points of a rect", function() {
  var frame = { x: 50, y: 40, width: 700, height: 9000 };
  expect(6);
  equals(SC.minX(frame),50,'Left edge');
  equals(SC.maxX(frame),750,'Right edge');
  equals(SC.midX(frame),400,'Horizontal midpoint');
  
  equals(SC.minY(frame),40, 'Top edge');
  equals(SC.maxY(frame),9040,'Bottom edge');
  equals(SC.midY(frame),4540,'Vertical midpoint');
});

test("Treat empty object as frame with 0 width and height", function() {
  var frame = { };
  expect(6);
  equals(SC.minX(frame),0,'Left edge');
  equals(SC.maxX(frame),0,'Right edge');
  equals(SC.midX(frame),0,'Horizontal midpoint');
  
  equals(SC.minY(frame),0,'Top edge');
  equals(SC.maxY(frame),0,'Bottom edge');
  equals(SC.midY(frame),0,'Vertical midpoint');
});

test("pointInRect() to test if a given point is inside the rect", function(){
  var frame = { x: 50, y: 40, width: 700, height: 9000 };
  
  ok(SC.pointInRect({ x: 100, y: 100 }, frame), "Point in rect");
  equals(NO, SC.pointInRect({ x: 40, y: 100 }, frame), "Point out of rect horizontally");
  equals(NO, SC.pointInRect({ x: 600, y: 9100 }, frame), "Point out of rect vertically");
  equals(NO, SC.pointInRect({ x: 0, y: 0 }, frame), "Point up and left from rect");
  equals(NO, SC.pointInRect({ x: 800, y: 9500 }, frame), "Point down and right from rect");
});

test("rectsEqual() tests equality with default delta", function() {
  var frame = { x: 50, y: 50, width: 100, height: 100 };
  
  equals(SC.rectsEqual(frame, frame), YES, "Frames are same object");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100 }), YES, "Frames have same position and dimensions");
  equals(SC.rectsEqual(frame, { x: 50.08, y: 50, width: 100, height: 100 }), YES, "Frame.x above, within delta");
  equals(SC.rectsEqual(frame, { x: 49.92, y: 50, width: 100, height: 100 }), YES, "Frame.x below, within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50.099, width: 100, height: 100 }), YES, "Frame.y within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100.001, height: 100 }), YES, "Frame.width within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100.09999 }), YES, "Frame.height within delta");
  equals(SC.rectsEqual(frame, { x: 55, y: 50, width: 100, height: 100 }), NO, "Frame.x not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 55, width: 100, height: 100 }), NO, "Frame.y not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 105, height: 100 }), NO, "Frame.width not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 105 }), NO, "Frame.height not equal");
});

test("rectsEqual() tests equality with null delta", function() {
  var frame = { x: 50, y: 50, width: 100, height: 100 };
  
  equals(SC.rectsEqual(frame, frame), YES, "Frames are same object");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100 }, null), YES, "Frames have same position and dimensions");
  equals(SC.rectsEqual(frame, { x: 50.08, y: 50, width: 100, height: 100 }, null), YES, "Frame.x above, within delta");
  equals(SC.rectsEqual(frame, { x: 49.92, y: 50, width: 100, height: 100 }, null), YES, "Frame.x below, within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50.099, width: 100, height: 100 }, null), YES, "Frame.y within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100.001, height: 100 }, null), YES, "Frame.width within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100.01 }, null), YES, "Frame.height within delta");
  equals(SC.rectsEqual(frame, { x: 55, y: 50, width: 100, height: 100 }, null), NO, "Frame.x not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 55, width: 100, height: 100 }, null), NO, "Frame.y not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 105, height: 100 }, null), NO, "Frame.width not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 105 }, null), NO, "Frame.height not equal");
});

test("rectsEqual() tests equality with delta of 10", function() {
  var frame = { x: 50, y: 50, width: 100, height: 100 };
  
  equals(SC.rectsEqual(frame, frame), YES, "Frames are same object");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100 }, 10), YES, "Frames have same position and dimensions");
  equals(SC.rectsEqual(frame, { x: 59.99, y: 50, width: 100, height: 100 }, 10), YES, "Frame.x above, within delta");
  equals(SC.rectsEqual(frame, { x: 41, y: 50, width: 100, height: 100 }, 10), YES, "Frame.x below, within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 59, width: 100, height: 100 }, 10), YES, "Frame.y within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 109, height: 100 }, 10), YES, "Frame.width within delta");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100.000002 }, 10), YES, "Frame.height within delta");
  equals(SC.rectsEqual(frame, { x: 61, y: 50, width: 100, height: 100 }, 10), NO, "Frame.x not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 92, width: 100, height: 100 }, 10), NO, "Frame.y not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 89, height: 100 }, 10), NO, "Frame.width not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 89.99999 }, 10), NO, "Frame.height not equal");
});

test("rectsEqual() tests equality with delta of 0", function() {
  var frame = { x: 50, y: 50, width: 100, height: 100 };
  
  equals(SC.rectsEqual(frame, frame), YES, "Frames are same object");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 100 }, 0), YES, "Frames have same position and dimensions");
  equals(SC.rectsEqual(frame, { x: 50.0001, y: 50, width: 100, height: 100 }, 0), NO, "Frame.x not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 51, width: 100, height: 100 }, 0), NO, "Frame.y not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 99, height: 100 }, 0), NO, "Frame.width not equal");
  equals(SC.rectsEqual(frame, { x: 50, y: 50, width: 100, height: 102 }, 0), NO, "Frame.height not equal");
});