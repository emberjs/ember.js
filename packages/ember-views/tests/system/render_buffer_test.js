var set = Ember.set, get = Ember.get, trim = Ember.$.trim;

// .......................................................
//  render()
//
module("Ember.RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();

  buffer.push('a');
  buffer.push('b');

  // IE8 returns `element name as upper case with extra whitespace.
  equal("<div>ab</div>", trim(buffer.string().toLowerCase()), "Multiple pushes should concatenate");
});

test("value of 0 is included in output", function() {
  var buffer, $el;

  buffer = new Ember.RenderBuffer('input');
  buffer.prop('value', 0);
  buffer.pushOpeningTag();
  $el = buffer.element();

  strictEqual($el.value, '0', "generated element has value of '0'");

  buffer = new Ember.RenderBuffer('input');
  buffer.prop('value', 0);
  buffer.push('<div>');
  buffer.pushOpeningTag();
  buffer.push('</div>');
  $el = Ember.$(buffer.innerString());

  strictEqual($el.find('input').val(), '0', "raw tag has value of '0'");
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

test("prevents XSS injection via `tagName`", function() {
  var buffer = new Ember.RenderBuffer('cool-div><div xss="true"');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.pushOpeningTag();
  buffer.begin('span><span xss="true"');
  buffer.pushOpeningTag();
  buffer.pushClosingTag();
  buffer.pushClosingTag();

  equal('<span></span><cool-divdivxsstrue><spanspanxsstrue></spanspanxsstrue></cool-divdivxsstrue>', buffer.string());
});

test("handles null props - Issue #2019", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.push('<span></span>'); // We need the buffer to not be empty so we use the string path
  buffer.prop('value', null);
  buffer.pushOpeningTag();

  equal('<span></span><div>', buffer.string());
});

test("handles browsers like Firefox < 11 that don't support outerHTML Issue #1952", function() {
  var buffer = new Ember.RenderBuffer('div');
  buffer.pushOpeningTag();
  // Make sure element.outerHTML is falsy to trigger the fallback.
  var elementStub = '<div></div>';
  buffer.element = function() { return elementStub; };
  // IE8 returns `element name as upper case with extra whitespace.
  equal(elementStub, trim(buffer.string().toLowerCase()));
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
