// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC Miscellaneous Utils Tests - documentOffset
// ========================================================================

/*global module test htmlbody clearHtmlbody ok equals same */

var pane, view1, view2, view3, view4;



module("SC.offset", {

  setup: function() {

    htmlbody('<style> .sc-main { height: 2500px; width: 2500px; } </style>');

    SC.RunLoop.begin();

    // Even though a full SC app doesn't really allow the viewport to be scaled or scrolled by default (thus
    // the offset by viewport will always equal offset by document), we simulate an app that uses a
    // scrollable viewport to test the validity of the functions.
    var viewportEl;
    if (SC.browser.isMobileSafari) {
      viewportEl = $("[name='viewport']")[0];

      viewportEl.setAttribute('content','initial-scale=0.8, minimum-scale=0.5, maximum-scale=1.2, user-scalable=yes, width=device-height');
    }

    pane = SC.MainPane.create({
      childViews: [
        SC.View.extend({
          classNames: 'upper'.w(),
          layout: { top: 20, left: 20, width: 100, height: 100 },
          childViews: [
            SC.View.extend({
              classNames: 'upper-inner'.w(),
              layout: { top: 10, left: 10, width: 20, height: 20 }
            })]
        }),
        SC.View.extend({
          classNames: 'lower'.w(),
          layout: { top: 1200, left: 20, width: 100, height: 100 },
          childViews: [
            SC.View.extend({
              classNames: 'lower-inner'.w(),
              layout: { top: 10, left: 10, width: 20, height: 20 }
            })]
        })]

      // Useful for debugging in iOS
      // /** Allow default touch events */
      //  touchStart: function(touch) {
      //    if (SC.browser.isMobileSafari) touch.allowDefault();
      //  },
      //
      //  touchesDragged: function(evt, touches) {
      //    if (SC.browser.isMobileSafari) evt.allowDefault();
      //  },
      //
      //  touchEnd: function(touch) {
      //    if (SC.browser.isMobileSafari) touch.allowDefault();
      //  }
    });
    pane.append();
    SC.RunLoop.end();

    view1 = pane.childViews[0];
    view2 = pane.childViews[1];
    view3 = view1.childViews[0];
    view4 = view2.childViews[0];
  },

  teardown: function() {
    // Useful for debugging in iOS
    // if (!SC.browser.isMobileSafari) {
      pane.remove();
      pane = view1 = view2 = view3 = view4 = null;
    // }

    clearHtmlbody();
  }
});


function checkDocumentOffset(element, top, left) {
  var docOffset = SC.offset(element, 'document');

  equals(docOffset.y, top, '%@ document offset top'.fmt(element[0].className));
  equals(docOffset.x, left, '%@ document offset left'.fmt(element[0].className));
}

function checkViewportOffset(element, top, left) {
  var viewOffset = SC.offset(element, 'viewport');

  equals(viewOffset.y, top, '%@ viewport offset top'.fmt(element[0].className));
  equals(viewOffset.x, left, '%@ viewport offset left'.fmt(element[0].className));
}

function checkParentOffset(element, top, left) {
  var parentOffset = SC.offset(element, 'parent');

  equals(parentOffset.y, top, '%@ parent offset top'.fmt(element[0].className));
  equals(parentOffset.x, left, '%@ parent offset left'.fmt(element[0].className));
}

test("Regular views", function() {
  var element;

  element = view1.$();
  checkDocumentOffset(element, 20, 20);
  checkViewportOffset(element, 20, 20);
  checkParentOffset(element, 20, 20);

  element = view3.$();
  checkDocumentOffset(element, 30, 30);
  checkViewportOffset(element, 30, 30);
  checkParentOffset(element, 10, 10);
});

test("A regular view not visible within the visual viewport", function() {
  var element;

  element = view2.$();
  checkDocumentOffset(element, 1200, 20);
  checkViewportOffset(element, 1200, 20);
  checkParentOffset(element, 1200, 20);

  element = view4.$();
  checkDocumentOffset(element, 1210, 30);
  checkViewportOffset(element, 1210, 30);
  checkParentOffset(element, 10, 10);
});

function testPosition4(element1, element2, element3, element4) {
  window.scrollTo(100, 100);

  checkDocumentOffset(element1, 20, 20);
  checkViewportOffset(element1, -80, -80);
  checkParentOffset(element1, 20, 20);

  checkDocumentOffset(element3, 30, 30);
  checkViewportOffset(element3, -70, -70);
  checkParentOffset(element3, 10, 10);

  checkDocumentOffset(element2, 1200, 20);
  checkViewportOffset(element2, 1100, -80);
  checkParentOffset(element2, 1200, 20);

  checkDocumentOffset(element4, 1210, 30);
  checkViewportOffset(element4, 1110, -70);
  checkParentOffset(element4, 10, 10);

  window.start(); // continue the tests
}

function testPosition3(element1, element2, element3, element4) {
  window.scrollTo(10, 100);

  checkDocumentOffset(element1, 20, 20);
  checkViewportOffset(element1, -80, 10);
  checkParentOffset(element1, 20, 20);

  checkDocumentOffset(element3, 30, 30);
  checkViewportOffset(element3, -70, 20);
  checkParentOffset(element3, 10, 10);

  checkDocumentOffset(element2, 1200, 20);
  checkViewportOffset(element2, 1100, 10);
  checkParentOffset(element2, 1200, 20);

  checkDocumentOffset(element4, 1210, 30);
  checkViewportOffset(element4, 1110, 20);
  checkParentOffset(element4, 10, 10);

  window.start();
}

function testPosition2(element1, element2, element3, element4) {

  window.scrollTo(10, 10);

  checkDocumentOffset(element1, 20, 20);
  checkViewportOffset(element1, 10, 10);
  checkParentOffset(element1, 20, 20);

  checkDocumentOffset(element3, 30, 30);
  checkViewportOffset(element3, 20, 20);
  checkParentOffset(element3, 10, 10);

  checkDocumentOffset(element2, 1200, 20);
  checkViewportOffset(element2, 1190, 10);
  checkParentOffset(element2, 1200, 20);

  checkDocumentOffset(element4, 1210, 30);
  checkViewportOffset(element4, 1200, 20);
  checkParentOffset(element4, 10, 10);

  window.start();
}

function testPosition1(element1, element2, element3, element4) {
  // For some reason, the scroll jumps back to 0,0 if we don't set it here
  window.scrollTo(0, 10);

  checkDocumentOffset(element1, 20, 20);
  checkViewportOffset(element1, 10, 20);
  checkParentOffset(element1, 20, 20);

  checkDocumentOffset(element3, 30, 30);
  checkViewportOffset(element3, 20, 30);
  checkParentOffset(element3, 10, 10);

  checkDocumentOffset(element2, 1200, 20);
  checkViewportOffset(element2, 1190, 20);
  checkParentOffset(element2, 1200, 20);

  checkDocumentOffset(element4, 1210, 30);
  checkViewportOffset(element4, 1200, 30);
  checkParentOffset(element4, 10, 10);

  window.start();
}

test("A regular view with window scroll offset top:10", function() {
  var element1 = view1.$(),
      element2 = view2.$(),
      element3 = view3.$(),
      element4 = view4.$();

  window.stop();

  window.scrollTo(0, 10);
  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function() { return testPosition1(element1, element2, element3, element4); }, interval: 200 });
  SC.RunLoop.end();
});

test("A regular view with window scroll offset top:10, left: 10", function() {
  var element1 = view1.$(),
      element2 = view2.$(),
      element3 = view3.$(),
      element4 = view4.$();

  window.stop();

  window.scrollTo(10, 10);
  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function() { return testPosition2(element1, element2, element3, element4); }, interval: 200 });
  SC.RunLoop.end();
});

test("A regular view with window scroll offset top:100, left: 10", function() {
  var element1 = view1.$(),
      element2 = view2.$(),
      element3 = view3.$(),
      element4 = view4.$();

  window.stop();

  window.scrollTo(10, 100);
  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function() { return testPosition3(element1, element2, element3, element4); }, interval: 200 });
  SC.RunLoop.end();
});

test("A regular view with window scroll offset top:100, left: 100", function() {
  var element1 = view1.$(),
      element2 = view2.$(),
      element3 = view3.$(),
      element4 = view4.$();

  window.stop();

  window.scrollTo(100, 100);
  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function() { return testPosition4(element1, element2, element3, element4); }, interval: 200 });
  SC.RunLoop.end();
});
