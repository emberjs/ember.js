// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Object.invokeLater Tests
// ========================================================================
/*globals module test ok isObj equals expects */

module("SC.Object.invokeLater") ;

test("should invoke method string after specified time", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var o = SC.Object.create({
    func: function() { fired = YES; }
  });
  o.invokeLater('func', 200) ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should invoke method instance after specified time", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var o = SC.Object.create({
    func: function() { fired = YES; }
  });
  o.invokeLater(o.func, 200) ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should invoke method string immediately if no time passed", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var o = SC.Object.create({
    func: function() { fired = YES; }
  });
  o.invokeLater('func') ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should automatically bind with arguments if passed", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var g1 = null, g2 = null ; target = null ;

  var o = SC.Object.create({
    func: function(arg1, arg2) {
      g1 = arg1 ; g2 = arg2 ; fired = YES ; target = this ;
    }
  });
  o.invokeLater('func', 200, 'ARG1', 'ARG2') ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    equals(g1, 'ARG1', 'arg1') ;
    equals(g2, 'ARG2', 'arg2') ;
    equals(target, o, 'target') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

module("Function.invokeLater") ;

test("should invoke function with target after specified time", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var target = null;
  var o = SC.Object.create() ;
  var func = function() { fired = YES; target = this; } ;
  func.invokeLater(o, 200) ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    equals(target, o, 'target') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should invoke object with no target after specified time", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var func = function() { fired = YES; } ;
  func.invokeLater(null, 200) ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should invoke function immediately if no time passed", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var o = SC.Object.create() ;
  var func = function() { fired = YES; } ;
  func.invokeLater(o) ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});

test("should automatically bind with arguments if passed", function() {
  SC.RunLoop.begin() ;
  var fired = NO ;
  var g1 = null, g2 = null ; target = null ;

  var o = SC.Object.create() ;
  var func = function(arg1, arg2) {
    g1 = arg1 ; g2 = arg2 ; fired = YES ; target = this ;
  } ;
  func.invokeLater(o, 200, 'ARG1', 'ARG2') ;
  SC.RunLoop.end() ;

  var tries = 20 ;
  var f = function f() {
    if (!fired && --tries >= 0) {
      setTimeout(f, 100) ;
      return ;
    }
    equals(YES, fired, 'did not fire') ;
    equals(g1, 'ARG1', 'arg1') ;
    equals(g2, 'ARG2', 'arg2') ;
    equals(target, o, 'target') ;
    window.start() ; // starts the test runner
  } ;

  stop() ; // stops the test runner
  setTimeout(f, 300) ;
});
