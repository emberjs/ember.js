var set = Ember.set, get = Ember.get;

// .......................................................
//  render()
//
module("Ember.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();

  buffer.push('a');
  buffer.push('b');

  equal("<div>ab</div>", buffer.string(), "Multiple pushes should concatenate");
});

test("prevents XSS injection via `id`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.id('hacked" megahax="yes');
  buffer.pushOpeningTag();

  equal('<span></span><div id="hacked&quot; megahax=&quot;yes">', buffer.string());
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.attr('id', 'trololol" onmouseover="pwn()');
  buffer.attr('class', "hax><img src=\"trollface.png\"");
  buffer.pushOpeningTag();

  equal('<span></span><div id="trololol&quot; onmouseover=&quot;pwn()" class="hax&gt;&lt;img src=&quot;trollface.png&quot;">', buffer.string());
});

test("prevents XSS injection via `addClass`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.addClass('megahax" xss="true');
  buffer.pushOpeningTag();

  // Regular check then check for IE
  equal('<span></span><div class="megahax&quot; xss=&quot;true">', buffer.string());
});

test("prevents XSS injection via `style`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.style('color', 'blue;" xss="true" style="color:red');
  buffer.pushOpeningTag();

  equal('<span></span><div style="color:blue;&quot; xss=&quot;true&quot; style=&quot;color:red;">', buffer.string());
});

module("Ember.RenderBuffer - without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new Ember.RenderBuffer();
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');

  equal(buffer.string(), "abc", "Buffers without tagNames do not wrap the content in a tag");
});

module("Ember.RenderBuffer#element");

test("properly handles old IE's zero-scope bug", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();
  buffer.push('<script></script>foo');

  var element = buffer.element();
  ok(Ember.$(element).html().match(/script/i), "should have script tag");
  ok(!Ember.$(element).html().match(/&shy;/), "should not have &shy;");
});
