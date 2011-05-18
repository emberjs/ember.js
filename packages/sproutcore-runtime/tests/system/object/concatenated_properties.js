// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
(function(){

  var klass;

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

    var values = obj.get('values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    ok(values.isEqual(expected), "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates subclasses", function() {
    var subKlass = klass.extend({
      values: ['d', 'e', 'f']
    });
    var obj = subKlass.create();

    var values = obj.get('values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    ok(values.isEqual(expected), "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates reopen", function() {
    klass.reopen({
      values: ['d', 'e', 'f']
    });
    var obj = klass.create();

    var values = obj.get('values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    ok(values.isEqual(expected), "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates mixin", function() {
    var mixin = {
      values: ['d', 'e']
    };
    var subKlass = klass.extend(mixin, {
      values: ['f']
    });
    var obj = subKlass.create();

    var values = obj.get('values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    ok(values.isEqual(expected), "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });

  test("concatenates reopen, subclass, and instance", function() {
    klass.reopen({ values: ['d'] });
    var subKlass = klass.extend({ values: ['e'] });
    var obj = subKlass.create({ values: ['f'] });

    var values = obj.get('values'),
        expected = ['a', 'b', 'c', 'd', 'e', 'f'];
    ok(values.isEqual(expected), "should concatenate values property (expected: %@, got: %@)".fmt(expected, values));
  });


})();
