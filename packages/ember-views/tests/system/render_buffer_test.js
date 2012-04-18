// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

// .......................................................
//  render()
//
module("Ember.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');
  buffer.push('b');

  equal("<div>ab</div>", buffer.string(), "Multiple pushes should concatenate");
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

  equal(buffer.string(), '<div>a<span>wotwot</span>b</div>', 'Removed elements are gone');
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

  equal(buffer.string(), '<div>a<aside>replaced!</aside>b<span>wotwot</span>c</div>', 'Removed elements are absent in the final output');
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

  equal(buffer.string(), '<div>a<span>zomg</span>b<span>wotwot</span><aside>inserted!</aside>c</div>', 'Inserted objects are inserted in the final output');
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

  equal(buffer.string(), '<div><aside>prepended!</aside>a<span>zomg</span>b<span>wotwot</span>c</div>', 'Prepended buffers are prepended to the final output');
});

test("prevents XSS injection via `id`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.id('hacked" megahax="yes');

  equal(buffer.string(), '<div id="hacked&quot; megahax=&quot;yes"></div>');
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.attr('id', 'trololol" onmouseover="pwn()');
  buffer.attr('class', "hax><img src='trollface.png'");

  equal(buffer.string(), '<div id="trololol&quot; onmouseover=&quot;pwn()" class="hax&gt;&lt;img src=&#x27;trollface.png&#x27;"></div>');
});

test("prevents XSS injection via `addClass`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.addClass('megahax" xss="true');

  equal(buffer.string(), '<div class="megahax&quot; xss=&quot;true"></div>');
});

test("prevents XSS injection via `style`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.style('color', 'blue;" xss="true" style="color:red');

  equal(buffer.string(), '<div style="color:blue;&quot; xss=&quot;true&quot; style=&quot;color:red;"></div>');
});


module("RenderBuffers without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer();
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');

  equal(buffer.string(), "abc", "Buffers without tagNames do not wrap the content in a tag");
});

test("it is possible to create a child render buffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin().push('middle').end();

  buffer.push('b');
  buffer.push('c');

  equal(buffer.string(), "<div>amiddlebc</div>", "Buffers without tagNames do not wrap the content in a tag");
});

test("it is possible to replace a child render buffer initially created without a tagName", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('a');

  var second = buffer.begin().push('middle');
  second.end();

  buffer.push('b');
  buffer.push('c');

  equal(buffer.string(), "<div>amiddlebc</div>", "precond - Buffers without tagNames do not wrap the content in a tag");

  var replacement = second.replaceWith().push('new-mid');
  replacement.end();

  equal(buffer.string(), "<div>anew-midbc</div>", "Replacements can operate on tagName-less buffers");
});
