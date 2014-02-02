// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */


// ..........................................................
// COMMON SETUP CODE
//
var pane, a, b, aa, aaa, bb, f ;
var A_LEFT = 10, A_TOP = 10, B_LEFT = 100, B_TOP = 100;

function setupFrameViews() {
  htmlbody('<style> .sc-view { border: 1px blue solid; position: absolute; }</style>');

  pane = SC.Pane.design()
    .layout({ top: 0, left: 0, width: 400, height: 300 })
    .childView(SC.View.design()
      .layout({ top: A_TOP, left: A_LEFT, width: 150, height: 150 })
      .childView(SC.View.design()
        .layout({ top: A_TOP, left: A_LEFT, width: 50, height: 50 })
        .childView(SC.View.design()
          .layout({ top: A_TOP, left: A_LEFT, width: 10, height: 10 }))))

    .childView(SC.View.design()
      .layout({ top: B_TOP, left: B_LEFT, width: 150, height: 150 })
      .childView(SC.View.design()
        .layout({ top: B_TOP, left: B_LEFT, width: 10, height: 10 })))
    .create();

  a = pane.childViews[0];
  b = pane.childViews[1];
  aa = a.childViews[0];
  aaa = aa.childViews[0];
  bb = b.childViews[0];

  f = { x: 10, y: 10, width: 10, height: 10 };
  pane.append();
}

function teardownFrameViews() {
  pane.remove() ;
  pane.destroy();
  pane = a = aa = aaa = b = bb = null ;
  clearHtmlbody();
}

// ..........................................................
// convertFrameToView()
//
module('SC.View#convertFrameToView', {
  setup: setupFrameViews, teardown: teardownFrameViews
});

test("convert a -> top level", function() {
  var result = a.convertFrameToView(f, null);
  f.x += A_LEFT; f.y += A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child -> top level", function() {
  var result = aa.convertFrameToView(f, null);
  f.x += A_LEFT*2; f.y += A_TOP*2 ;
  same(result, f, 'should convert frame');
});

test("convert nested child -> top level", function() {
  var result = aaa.convertFrameToView(f, null);
  f.x += A_LEFT*3; f.y += A_TOP*3 ;
  same(result, f, 'should convert frame');
});


test("convert a -> sibling", function() {
  var result = a.convertFrameToView(f, b);
  f.x += A_LEFT - B_LEFT; f.y += A_TOP - B_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child -> parent sibling", function() {
  var result = aa.convertFrameToView(f, b);
  f.x += A_LEFT*2 - B_LEFT; f.y += A_TOP*2 - B_TOP ;
  same(result, f, 'should convert frame');
});

test("convert nested child -> parent sibling", function() {
  var result = aaa.convertFrameToView(f, b);
  f.x += A_LEFT*3 - B_LEFT; f.y += A_TOP*3 - B_TOP ;
  same(result, f, 'should convert frame');
});



test("convert a -> child", function() {
  var result = a.convertFrameToView(f, aa);
  f.x -= A_LEFT; f.y -= A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child -> parent", function() {
  var result = aa.convertFrameToView(f, a);
  f.x += A_LEFT; f.y += A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert nested child -> parent", function() {
  var result = aaa.convertFrameToView(f, a);
  f.x += A_LEFT*2; f.y += A_TOP*2 ;
  same(result, f, 'should convert frame');
});



test("convert a -> nested child", function() {
  var result = a.convertFrameToView(f, aaa);
  f.x -= (A_LEFT+A_LEFT); f.y -= (A_TOP+A_TOP) ;
  same(result, f, 'should convert frame');
});

test("convert nested child -> direct parent (child)", function() {
  var result = aaa.convertFrameToView(f, aa);
  f.x += A_LEFT; f.y += (A_TOP) ;
  same(result, f, 'should convert frame');
});



test("convert a -> child of sibling", function() {
  var result = a.convertFrameToView(f, bb);
  f.x += A_LEFT - (B_LEFT+B_LEFT); f.y += A_TOP - (B_TOP+B_TOP) ;
  same(result, f, 'should convert frame');
});


test("convert child -> child of sibling", function() {
  var result = aa.convertFrameToView(f, bb);
  f.x += A_LEFT*2 - (B_LEFT+B_LEFT); f.y += A_TOP*2 - (B_TOP+B_TOP) ;
  same(result, f, 'should convert frame');
});

test("convert nested child -> child of sibling", function() {
  var result = aaa.convertFrameToView(f, bb);
  f.x += A_LEFT*3 - (B_LEFT+B_LEFT); f.y += A_TOP*3 - (B_TOP+B_TOP) ;
  same(result, f, 'should convert frame');
});


// ..........................................................
// convertFrameFromView()
//
module('SC.View#convertFrameFromView', {
  setup: setupFrameViews, teardown: teardownFrameViews
});

test("convert a <- top level", function() {
  var result = a.convertFrameFromView(f, null);
  f.x -= A_LEFT; f.y -= A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child <- top level", function() {
  var result = aa.convertFrameFromView(f, null);
  f.x -= A_LEFT*2; f.y -= A_TOP*2 ;
  same(result, f, 'should convert frame');
});

test("convert nested child <- top level", function() {
  var result = aaa.convertFrameFromView(f, null);
  f.x -= A_LEFT*3; f.y -= A_TOP*3 ;
  same(result, f, 'should convert frame');
});


test("convert a <- sibling", function() {
  var result = a.convertFrameFromView(f, b);
  f.x += B_LEFT - A_LEFT; f.y += B_TOP - A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child <- parent sibling", function() {
  var result = aa.convertFrameFromView(f, b);
  f.x += B_LEFT - A_LEFT*2; f.y += B_TOP - A_TOP*2;
  same(result, f, 'should convert frame');
});

test("convert nested child <- parent sibling", function() {
  var result = aaa.convertFrameFromView(f, b);
  f.x += B_LEFT - A_LEFT*3; f.y += B_TOP - A_TOP*3;
  same(result, f, 'should convert frame');
});



test("convert a <- child", function() {
  var result = a.convertFrameFromView(f, aa);
  f.x += A_LEFT; f.y += A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert child <- parent", function() {
  var result = aa.convertFrameFromView(f, a);
  f.x -= A_LEFT; f.y -= A_TOP ;
  same(result, f, 'should convert frame');
});

test("convert nested child <- parent", function() {
  var result = aaa.convertFrameFromView(f, a);
  f.x -= A_LEFT*2; f.y -= A_TOP*2 ;
  same(result, f, 'should convert frame');
});



test("convert a <- nested child", function() {
  var result = a.convertFrameFromView(f, aaa);
  f.x += (A_LEFT+A_LEFT); f.y += (A_TOP+A_TOP) ;
  same(result, f, 'should convert frame');
});

test("convert nested child <- direct parent (child)", function() {
  var result = aaa.convertFrameFromView(f, aa);
  f.x -= A_LEFT; f.y -= (A_TOP) ;
  same(result, f, 'should convert frame');
});



test("convert a <- child of sibling", function() {
  var result = a.convertFrameFromView(f, bb);
  f.x += (B_LEFT+B_LEFT) - A_LEFT ; f.y += (B_TOP+B_TOP) - A_TOP ;
  same(result, f, 'should convert frame');
});


test("convert child <- child of sibling", function() {
  var result = aa.convertFrameFromView(f, bb);
  f.x += (B_LEFT+B_LEFT) - A_LEFT*2; f.y += (B_TOP+B_TOP) - A_TOP*2;
  same(result, f, 'should convert frame');
});

test("convert nested child <- child of sibling", function() {
  var result = aaa.convertFrameFromView(f, bb);
  f.x += (B_LEFT+B_LEFT) - A_LEFT*3; f.y += (B_TOP+B_TOP) - A_TOP*3 ;
  same(result, f, 'should convert frame');
});

