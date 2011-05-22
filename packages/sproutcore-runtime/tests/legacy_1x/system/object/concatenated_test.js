// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:

  * changed get(obj, ) and set(obj, ) to SC.get() and SC.set()
  * converted uses of obj.isEqual() to use same() test since isEqual is not 
    always defined
*/



  var klass, get = SC.get, set = SC.set;

  module("SC.Object Concatenated Properties", {
    setup: function(){
      klass = SC.Object.extend({
        concatenatedProperties: ['values'],
        values: ['a', 'b', 'c']
      });
    }
  });

  test("concatenates instances", function() {
    var obj = klass.create({
      values: ['d', 'e', 'f']
    });

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    same(values, expected, "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates subclasses", function() {
    var subKlass = klass.extend({
      values: ['d', 'e', 'f']
    });
    var obj = subKlass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    same(values, expected, "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates reopen", function() {
    klass.reopen({
      values: ['d', 'e', 'f']
    });
    var obj = klass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    same(values, expected, "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates mixin", function() {
    var mixin = {
      values: ['d', 'e']
    };
    var subKlass = klass.extend(mixin, {
      values: ['f']
    });
    var obj = subKlass.create();

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    same(values, expected, "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates reopen, subclass, and instance", function() {
    klass.reopen({ values: ['d'] });
    var subKlass = klass.extend({ values: ['e'] });
    var obj = subKlass.create({ values: ['f'] });

    var values = get(obj, 'values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    same(values, expected, "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });



