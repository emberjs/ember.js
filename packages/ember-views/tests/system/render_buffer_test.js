import { set } from "ember-metal/property_set";
import { get } from "ember-metal/property_get";
import jQuery from "ember-views/system/jquery";
import RenderBuffer from "ember-views/system/render_buffer";

var trim = jQuery.trim;

// .......................................................
//  render()
//
QUnit.module("RenderBuffer");

test("RenderBuffers combine strings", function() {
  var buffer = new RenderBuffer('div');
  buffer.generateElement();

  buffer.push('a');
  buffer.push('b');

  var el = buffer.element();
  equal(el.tagName.toLowerCase(), 'div');
  equal(el.childNodes[0].nodeValue, 'ab', "Multiple pushes should concatenate");
});

test("value of 0 is included in output", function() {
  var buffer, el;
  buffer = new RenderBuffer('input');
  buffer.prop('value', 0);
  buffer.generateElement();
  el = buffer.element();
  strictEqual(el.value, '0', "generated element has value of '0'");
});

test("prevents XSS injection via `id`", function() {
  var buffer = new RenderBuffer('div');

  buffer.id('hacked" megahax="yes');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.id, 'hacked" megahax="yes');
});

test("prevents XSS injection via `attr`", function() {
  var buffer = new RenderBuffer('div');

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
  var buffer = new RenderBuffer('div');

  buffer.addClass('megahax" xss="true');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.getAttribute('class'), 'megahax" xss="true');
});

test("prevents XSS injection via `style`", function() {
  var buffer = new RenderBuffer('div');

  buffer.style('color', 'blue;" xss="true" style="color:red');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.getAttribute('style'), 'color:blue;" xss="true" style="color:red;');
});

test("prevents XSS injection via `tagName`", function() {
  var buffer = new RenderBuffer('cool-div><div xss="true"');
  try {
    buffer.generateElement();
    equal(buffer.string(), '<cool-divdivxsstrue></cool-divdivxsstrue>');
  } catch (e) {
    ok(true, 'dom exception');
  }
});

test("handles null props - Issue #2019", function() {
  var buffer = new RenderBuffer('div');

  buffer.prop('value', null);
  buffer.generateElement();
  equal(buffer.string(), '<div></div>');
});

test("handles browsers like Firefox < 11 that don't support outerHTML Issue #1952", function() {
  var buffer = new RenderBuffer('div');
  buffer.generateElement();
  // Make sure element.outerHTML is falsy to trigger the fallback.
  var elementStub = '<div></div>';
  buffer.element = function() { return elementStub; };
  // IE8 returns `element name as upper case with extra whitespace.
  equal(trim(buffer.string().toLowerCase()), elementStub);
});

test("lets `setClasses` and `addClass` work together", function() {
  var buffer = new RenderBuffer('div');
  buffer.setClasses(['foo', 'bar']);
  buffer.addClass('baz');
  buffer.generateElement();

  var el = buffer.element();
  equal(el.tagName.toLowerCase(), 'div');
  equal(el.getAttribute('class'), 'foo bar baz');
});

QUnit.module("RenderBuffer - without tagName");

test("It is possible to create a RenderBuffer without a tagName", function() {
  var buffer = new RenderBuffer();
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
  var buffer = new RenderBuffer('div');
  buffer.generateElement();
  buffer.push('<script></script>foo');

  var element = buffer.element();
  ok(jQuery(element).html().match(/script/i), "should have script tag");
  ok(!jQuery(element).html().match(/&shy;/), "should not have &shy;");
});
