// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

var set = SC.set, get = SC.get;

// .......................................................
//  render()
//
module("SC.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new SC.RenderBuffer('div');

  buffer.push('a');
  buffer.push('b');

  equals("<div>ab</div>", buffer.string(), "Multiple pushes should concatenate");
});

