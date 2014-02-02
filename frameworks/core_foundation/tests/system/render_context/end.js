// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

var context = null;

module("SC.RenderContext#end", {
  setup: function() {
    context = SC.RenderContext();
  }
});

test("should replace opening tag with string and add closing tag, leaving middle content in place", function() {
  context.push("line1").end();
  equals(context.get(0), "<div>", "opening tag");
  equals(context.get(1), "line1", "opening tag");
  equals(context.get(2), "</div>", "closing tag");
});

test("should emit any CSS class names included in the tag opts.addClass array", function() {
  context.addClass("foo bar".w()).end();
  ok(context.get(0).match(/class=\"(?:bar|foo)\s*(?:foo|bar)\s*\"/), '<div> has classes foo bar') ;
});

test("should emit id in tag opts.id", function() {
  context.id("foo").end();
  ok(context.get(0).match(/id=\"foo\"/), "<div> has id attr");
});

test("should emit style in tag if opts.styles is defined", function() {
  context.setStyle({ alpha: "beta", foo: "bar" }).end();
  ok(context.get(0).match(/style=\"alpha: beta; foo: bar; \"/), '<div> has style="alpha: beta; foo: bar; "');
});

test("should emit style with custom browser attributes", function() {
  context.setStyle({ mozColumnCount: '3', webkitColumnCount: '3', oColumnCount: '3', msColumnCount: '3' }).end();
  ok(context.get(0).match('<div style="-moz-column-count: 3; -webkit-column-count: 3; -o-column-count: 3; -ms-column-count: 3; " >'),
                            '<div> has style="-moz-column-count: 3; -webkit-column-count: 3, -o-column-count: 3, -ms-column-count: 3; "');
});

test("should write arbitrary attrs has in opts", function() {
  context.setAttr({ foo: "bar", bar: "baz" }).end();
  ok(context.get(0).match(/foo=\"bar\"/), 'has foo="bar"');
  ok(context.get(0).match(/bar=\"baz\"/), 'has bar="baz"');
});

test("addClass should override attrs.class", function() {
  context.addClass("foo".w()).setAttr({ "class": "bar" }).end();
  ok(context.get(0).match(/class=\"foo\"/), 'has class="foo"');
});

test("opts.id should override opts.attrs.id", function() {
  context.id("foo").setAttr({ id: "bar" }).end();
  ok(context.get(0).match(/id=\"foo\"/), 'has id="foo"');
});

test("opts.styles should override opts.attrs.style", function() {
  context.setStyle({ foo: "foo" }).setAttr({ style: "bar: bar" }).end();
  ok(context.get(0).match(/style=\"foo: foo; \"/), 'has style="foo: foo; "');
});

test("should return receiver if receiver has no prevObject", function() {
  ok(!context.prevObject, 'precondition - prevObject is null');
  equals(context.end(), context, 'ends as self');
});

test("should return prevObject if receiver has prevObject", function() {
  var c2 = context.begin();
  equals(c2.end(), context, "should return prevObject");
});

test("emits self closing tag if tag has no content and c._selfClosing !== NO", function() {
  var c2 = context.begin('input');
  c2.end();
  equals(c2.get(0), "<input />");
});

test("emits two tags even if tag has no content if opts.selfClosing == NO", function() {
  context._selfClosing = NO;

  context.end();
  equals(context.length, 2, "has two lines");
  equals(context.get(0), "<div>", "has opening tag");
  equals(context.get(1), "</div>", "has closing tag");
});

test("does NOT emit self closing tag if it has content, even if opts.selfClosing == YES (because that would yield invalid HTML)", function() {
  context._selfClosing = YES;
  context.push("line").end();
  equals(context.length, 3, "has 3 lines");
  equals(context.get(2), "</div>", "has closing tag");
});

test("it should make sure to clear reused temporary attributes object", function() {

  // generate one tag...
  context.begin('input')
    .id("foo")
    .setStyle({ foo: "bar" })
    .addClass("foo bar".w())
    .push("line")
  .end();

  // generate second tag...will reuse internal temporary attrs object.
  context.begin('input').id("bar").end();
  var str = context.get(context.length-1);
  equals(str, "<input id=\"bar\"  />");
});

test("it should work when nested more than one level deep", function() {
  context.begin().id("foo")
    .begin().id("bar").end()
  .end();

  var str = context.join('');
  ok(str.match(/id="foo"/), 'has foo');
  ok(str.match(/id="bar"/), 'has bar');
});

