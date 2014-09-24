import jQuery from "ember-views/system/jquery";
import RenderBuffer from "ember-views/system/render_buffer";

var trim = jQuery.trim;

// .......................................................
//  render()
//
QUnit.module("RenderBuffer");

test("RenderBuffers raise a deprecation warning without a contextualElement", function() {
  var buffer = new RenderBuffer('div');
  buffer.generateElement();
  expectDeprecation(function(){
    var el = buffer.element();
    equal(el.tagName.toLowerCase(), 'div');
  }, /buffer.element expects a contextualElement to exist/);
});

test("reset RenderBuffers raise a deprecation warning without a contextualElement", function() {
  var buffer = new RenderBuffer('div', document.body);
  buffer.reset('span');
  buffer.generateElement();
  expectDeprecation(function(){
    var el = buffer.element();
    equal(el.tagName.toLowerCase(), 'span');
  }, /buffer.element expects a contextualElement to exist/);
});

test("RenderBuffers combine strings", function() {
  var buffer = new RenderBuffer('div', document.body);
  buffer.generateElement();

  buffer.push('a');
  buffer.push('b');

  var el = buffer.element();
  equal(el.tagName.toLowerCase(), 'div');
  equal(el.childNodes[0].nodeValue, 'ab', "Multiple pushes should concatenate");
});

test("value of 0 is included in output", function() {
  var buffer, el;
  buffer = new RenderBuffer('input', document.body);
  buffer.prop('value', 0);
  buffer.generateElement();
  el = buffer.element();
  strictEqual(el.value, '0', "generated element has value of '0'");
});

test("prevents XSS injection via `id`", function() {
  var buffer = new RenderBuffer('div', document.body);

  buffer.id('hacked" megahax="yes');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.id, 'hacked" megahax="yes');
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new RenderBuffer('div', document.body);

  buffer.attr('id', 'trololol" onmouseover="pwn()');
  buffer.attr('class', "hax><img src=\"trollface.png\"");
  buffer.generateElement();

  var el = buffer.element();
  equal(el.tagName.toLowerCase(), 'div');
  equal(el.childNodes.length, 0);
  equal(el.id, 'trololol" onmouseover="pwn()');
  equal(el.getAttribute('class'), "hax><img src=\"trollface.png\"");
});

test("prevents XSS injection via `addClass`", function() {
  var buffer = new RenderBuffer('div', document.body);

  buffer.addClass('megahax" xss="true');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.getAttribute('class'), 'megahax" xss="true');
});

test("prevents XSS injection via `style`", function() {
  var buffer = new RenderBuffer('div', document.body);

  buffer.style('color', 'blue;" xss="true" style="color:red');
  buffer.generateElement();

  var el = buffer.element();
  var div = document.createElement('div');

  // some browsers have different escaping strageties
  // we should ensure the outcome is consistent. Ultimately we now use
  // setAttribute under the hood, so we should always do the right thing.  But
  // this test should be kept to ensure we do. Also, I believe/hope it is
  // alright to assume the browser escapes setAttribute correctly...
  div.setAttribute('style', 'color:blue;" xss="true" style="color:red;');

  equal(el.getAttribute('style'), div.getAttribute('style'));
});

test("prevents XSS injection via `tagName`", function() {
  var buffer = new RenderBuffer('cool-div><div xss="true"', document.body);
  try {
    buffer.generateElement();
    equal(buffer.element().childNodes.length, 0, 'no extra nodes created');
  } catch (e) {
    ok(true, 'dom exception');
  }
});

test("handles null props - Issue #2019", function() {
  var buffer = new RenderBuffer('div', document.body);

  buffer.prop('value', null);
  buffer.generateElement();
  equal(buffer.element().tagName, 'DIV', 'div exists');
});

test("handles browsers like Firefox < 11 that don't support outerHTML Issue #1952", function() {
  var buffer = new RenderBuffer('div', document.body);
  buffer.generateElement();
  // Make sure element.outerHTML is falsy to trigger the fallback.
  var elementStub = '<div></div>';
  buffer.element = function() { return elementStub; };
  // IE8 returns `element name as upper case with extra whitespace.
  equal(trim(buffer.string().toLowerCase()), elementStub);
});

test("lets `setClasses` and `addClass` work together", function() {
  var buffer = new RenderBuffer('div', document.body);
  buffer.setClasses(['foo', 'bar']);
  buffer.addClass('baz');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.tagName, 'DIV');
  equal(el.getAttribute('class'), 'foo bar baz');
});

test("generates text and a div and text", function() {
  var div = document.createElement('div');
  var buffer = new RenderBuffer(undefined, div);
  buffer.buffer = 'Howdy<div>Nick</div>Cage';

  var el = buffer.element();
  equal(el.childNodes[0].data, 'Howdy');
  equal(el.childNodes[1].tagName, 'DIV');
  equal(el.childNodes[1].childNodes[0].data, 'Nick');
  equal(el.childNodes[2].data, 'Cage');
});


test("generates a tr from a tr innerString", function() {
  var table = document.createElement('table');
  var buffer = new RenderBuffer(undefined, table);
  buffer.buffer = '<tr></tr>';

  var el = buffer.element();
  equal(el.childNodes[0].tagName.toLowerCase(), 'tr');
});

test("generates a tr from a tr innerString with leading <script", function() {
  var table = document.createElement('table');
  var buffer = new RenderBuffer(undefined, table);
  buffer.buffer = '<script></script><tr></tr>';

  var el = buffer.element();
  equal(el.childNodes[1].tagName.toLowerCase(), 'tr');
});

test("generates a tr from a tr innerString with leading comment", function() {
  var table = document.createElement('table');
  var buffer = new RenderBuffer(undefined, table);
  buffer.buffer = '<!-- blargh! --><tr></tr>';

  var el = buffer.element();
  equal(el.childNodes[1].tagName, 'TR');
});

test("generates a tbody from a tbody innerString", function() {
  var table = document.createElement('table');
  var buffer = new RenderBuffer(undefined, table);
  buffer.buffer = '<tbody><tr></tr></tbody>';

  var el = buffer.element();
  equal(el.childNodes[0].tagName, 'TBODY');
});

test("generates a col from a col innerString", function() {
  var table = document.createElement('table');
  var buffer = new RenderBuffer(undefined, table);
  buffer.buffer = '<col></col>';

  var el = buffer.element();
  equal(el.childNodes[0].tagName, 'COL');
});

QUnit.module("RenderBuffer - without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new RenderBuffer(undefined, document.body);
  buffer.push('a');
  buffer.push('b');
  buffer.push('c');

  var el = buffer.element();

  equal(el.nodeType, 11, "Buffers without tagNames do not wrap the content in a tag");
  equal(el.childNodes.length, 1);
  equal(el.childNodes[0].nodeValue, 'abc');
});

QUnit.module("RenderBuffer#element");

test("properly handles old IE's zero-scope bug", function() {
  var buffer = new RenderBuffer('div', document.body);
  buffer.generateElement();
  buffer.push('<script></script>foo');

  var element = buffer.element();
  ok(jQuery(element).html().match(/script/i), "should have script tag");
  ok(!jQuery(element).html().match(/&shy;/), "should not have &shy;");
});
