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

  // trim and toLowerCase since IE8 returns uppercase tags and line breaks
  var cleanedString = Ember.$.trim(buffer.string().toLowerCase());
  equal("<div>ab</div>", cleanedString, "Multiple pushes should concatenate");
});

test("prevents XSS injection via `id`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.id('hacked" megahax="yes');
  buffer.pushOpeningTag();

  // Regular check, then check for IE 8
  var cleanedString = Ember.$.trim(buffer.string()).toLowerCase();
  ok(cleanedString === '<div id="hacked&quot; megahax=&quot;yes"></div>' ||
      cleanedString === Ember.$.trim("<div id='hacked\" megahax=\"yes'></div>"),
      'expected safe string but was: '+cleanedString);
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.attr('id', 'trololol" onmouseover="pwn()');
  buffer.attr('class', "hax><img src=\"trollface.png\"");
  buffer.pushOpeningTag();

  var el = buffer.element(),
      elId = el.getAttribute('id'),
      elOnmouseover = el.getAttribute('onmouseover'),
      elClass = el.getAttribute('class');

  equal(elId, 'trololol" onmouseover="pwn()', 'id should be escaped');
  equal(elOnmouseover, undefined, 'should not have onmouseover');
  ok(elClass === 'hax><img src=\"trollface.png\"' || !elClass, 'should have escaped class');
  equal(el.childNodes.length, 0, 'should not have children');
});

test("prevents XSS injection via `val`", function() {
  var buffer = new Ember.RenderBuffer('input');

  buffer.val('trololol" onmouseover="pwn()');
  buffer.pushOpeningTag();

  var el = buffer.element(),
      elValue = el.value,
      elOnmouseover = el.getAttribute('onmouseover');

  equal(elValue, 'trololol" onmouseover="pwn()', 'value should be escaped');
  equal(elOnmouseover, undefined, 'should not have onmouseover');
});

test("prevents XSS injection via `addClass`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.addClass('megahax" xss="true');
  buffer.pushOpeningTag();

  // Regular check then check for IE
  var cleanedString = Ember.$.trim(buffer.string()).toLowerCase();
  ok(cleanedString === '<div class="megahax&quot; xss=&quot;true"></div>' ||
      cleanedString === "<div class='megahax\" xss=\"true'></div>",
      'expected safe string but was: '+cleanedString);
});

test("prevents XSS injection via `style`", function() {
  var buffer = new Ember.RenderBuffer('div');

  buffer.style('color', 'blue;" xss="true" style="color:red');
  buffer.pushOpeningTag();

  var el = buffer.element(),
      elColor = el.style.color,
      elXss = el.getAttribute('xss');

  equal(elColor, 'blue', 'should have escaped style');
  equal(elXss, undefined, 'should not have xss attr');
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
