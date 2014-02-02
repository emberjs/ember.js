// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

var context = null;

// ..........................................................
// id()
// 
module("SC.RenderContext#id", {
  setup: function() {
    context = SC.RenderContext().id('foo') ;
  }
});

test("id() returns the current id for the tag", function() {
  equals(context.id(), 'foo', 'get id');
});

test("id(bar) alters the current id", function() {
  equals(context.id("bar"), context, "Returns receiver");
  equals(context.id(), 'bar', 'changed to bar');
});
