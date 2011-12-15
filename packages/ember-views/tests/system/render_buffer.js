// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

var set = Ember.set, get = Ember.get;

// .......................................................
//  render()
//
module("Ember.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');
  buffer.push('b');

  equals("<div>ab</div>", buffer.string(), "Multiple pushes should concatenate");
});

test("It is possible to remove a RenderBuffer", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin('span').push('zomg');
  second.end();

  var third = buffer.begin('span').push('wotwot');
  third.end();

  buffer.push('b');

  second.remove();

  equals(buffer.string(), '<div>a<span>wotwot</span>b</div>', 'Removed elements are gone');
});

test("It is possible to replace a RenderBuffer", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin('span').push('zomg');
  second.end();

  buffer.push('b');

  var third = buffer.begin('span').push('wotwot');
  third.end();

  buffer.push('c');

  var replacement = second.replaceWith('aside').push('replaced!');
  replacement.end();

  equals(buffer.string(), '<div>a<aside>replaced!</aside>b<span>wotwot</span>c</div>', 'Removed elements are absent in the final output');
});

test("It is possible to insert a RenderBuffer after another one", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin('span').push('zomg');
  second.end();

  buffer.push('b');

  var third = buffer.begin('span').push('wotwot');
  third.end();

  buffer.push('c');

  var inserted = third.insertAfter('aside').push('inserted!');
  inserted.end();

  equals(buffer.string(), '<div>a<span>zomg</span>b<span>wotwot</span><aside>inserted!</aside>c</div>', 'Inserted objects are inserted in the final output');
});

test("It is possible to prepend a child RenderBuffer", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin('span').push('zomg');
  second.end();

  buffer.push('b');

  var third = buffer.begin('span').push('wotwot');
  third.end();

  buffer.push('c');

  var prepended = buffer.prepend('aside').push('prepended!');
  prepended.end();

  equals(buffer.string(), '<div><aside>prepended!</aside>a<span>zomg</span>b<span>wotwot</span>c</div>', 'Prepended buffers are prepended to the final output');
});

module("RenderBuffers without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer();
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');

  equals(buffer.string(), "abc", "Buffers without tagNames do not wrap the content in a tag");
});

test("it is possible to create a child render buffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  second = buffer.begin().push('middle').end();

  buffer.push('b');
  buffer.push('c');

  equals(buffer.string(), "<div>amiddlebc</div>", "Buffers without tagNames do not wrap the content in a tag");
});

test("it is possible to replace a child render buffer initially created without a tagName", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  second = buffer.begin().push('middle');
  second.end();

  buffer.push('b');
  buffer.push('c');

  equals(buffer.string(), "<div>amiddlebc</div>", "precond - Buffers without tagNames do not wrap the content in a tag");

  var replacement = second.replaceWith().push('new-mid');
  replacement.end();

  equals(buffer.string(), "<div>anew-midbc</div>", "Replacements can operate on tagName-less buffers");
});

