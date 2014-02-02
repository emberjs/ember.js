// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// CoreQuery Tests
// ========================================================================

// This file tests additions to CoreQuery.  These should function even if you use
// jQuery
module("CoreQuery.within() && within()");

test("should return if passed RAW element that is child", function() {
  var cq = SC.$('<div class="root">\
    <div class="middle">\
      <div class="child1"></div>\
      <div class="child2"></div>\
    </div>\
  </div>') ;

  var child = cq.find('.child1');
  equals(cq.within(child.get(0)), YES, "cq.within(DOMElement) = YES") ;

  var notChild = SC.$('<div class="not-child"></div>') ;
  equals(cq.within(notChild.get(0)), NO, "cq.hadChild(DOMElement) = NO");
  child = notChild = cq = null ;
}) ;

test("should return if passed CQ with element that is child", function() {
  var cq = SC.$('<div class="root">\
    <div class="middle">\
      <div class="child1"></div>\
      <div class="child2"></div>\
    </div>\
  </div>') ;

  var child = cq.find('.child1');
  equals(cq.within(child), YES, "cq.within(DOMElement) = YES") ;

  var notChild = SC.$('<div class="not-child"></div>') ;
  equals(cq.within(notChild), NO, "cq.hadChild(DOMElement) = NO");
  child = notChild = cq = null ;
}) ;

test("should work if matched set has multiple element", function() {
  var cq = SC.$('<div class="wrapper">\
    <div class="root"></div>\
    <div class="root"></div>\
    <div class="root">\
      <div class="middle">\
        <div class="child1"></div>\
        <div class="child2"></div>\
      </div>\
    </div>\
  </div>').find('.root') ;
  equals(cq.length, 3, "should have three element in matched set");

  var child = cq.find('.child1');
  equals(cq.within(child), YES, "cq.within(DOMElement) = YES") ;

  var notChild = SC.$('<div class="not-child"></div>') ;
  equals(cq.within(notChild), NO, "cq.hadChild(DOMElement) = NO");
  child = notChild = cq = null ;
}) ;

test("should return YES if matching self", function() {
  var cq = SC.$('<div></div>');
  equals(cq.within(cq), YES, "should not match");
});
