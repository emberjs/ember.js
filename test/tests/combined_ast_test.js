import { preprocess, buildClose } from "htmlbars/parser";
import { ProgramNode, BlockNode, ElementNode, MustacheNode, SexprNode,
  HashNode, IdNode, StringNode, AttrNode, TextNode } from "htmlbars/ast";

module("HTML-based compiler (AST)");

var stripNone = { left: false, right: false };

function id(string) {
  return new IdNode([{ part: string }]);
}

function sexpr(params) {
  var sexprNode = new SexprNode(params);

  // normalize 1 -> true for the sake of comparison; not sure
  // why they come in differently...
  sexprNode.isHelper = sexprNode.isHelper === 1 ? true : sexprNode.isHelper;
  return sexprNode;
}

function hash(pairs) {
  return pairs ? new HashNode(pairs) : undefined;
}

function mustache(string, pairs, raw) {
  var params;

  if (({}).toString.call(string) === '[object Array]') {
    params = string;
  } else {
    params = [id(string)];
  }

  return new MustacheNode(params, hash(pairs), raw ? '{{{' : '{{', { left: false, right: false });
}

function string(data) {
  return new StringNode(data);
}

function element(tagName, a, b, c) {
  var l = arguments.length;
  if (l == 2) return new ElementNode(tagName, [], [], a);
  if (l == 3) return new ElementNode(tagName, a, [], b);
  if (l == 4) return new ElementNode(tagName, a, b, c);
}

function attr(name, value) {
  return new AttrNode(name, value);
}

function text(chars) {
  return new TextNode(chars);
}

function block(mustache, program, inverse, stripRight) {
  var close = buildClose(mustache, program, inverse, stripRight);
  return new BlockNode(mustache, program, inverse || null, close);
}

function program(children, strip) {
  return new ProgramNode(children, strip || stripNone);
}

function removeLocInfo(obj) {
  delete obj.firstColumn;
  delete obj.firstLine;
  delete obj.lastColumn;
  delete obj.lastLine;

  for (var k in obj) {
    if (obj.hasOwnProperty(k) && obj[k] && typeof obj[k] === 'object') {
      removeLocInfo(obj[k]);
    }
  }
}

function astEqual(template, expected, message) {
  // Perform a deepEqual but recursively remove the locInfo stuff
  // (e.g. line/column information about the compiled template)
  // that we don't want to have to write into our test cases.
  var actual = preprocess(template);
  removeLocInfo(actual);
  removeLocInfo(expected);

  deepEqual(actual, expected, message);
}

test("a simple piece of content", function() {
  var t = 'some content';
  astEqual(t, program([
    text('some content')
  ]));
});

test("a piece of content with HTML", function() {
  var t = 'some <div>content</div> done';
  astEqual(t, program([
    text("some "),
    element("div", [
      text("content")
    ]),
    text(" done")
  ]));
});

test("a piece of Handlebars with HTML", function() {
  var t = 'some <div>{{content}}</div> done';
  astEqual(t, program([
    text("some "),
    element("div", [
      mustache('content')
    ]),
    text(" done")
  ]));
});

test("Handlebars embedded in an attribute", function() {
  var t = 'some <div class="{{foo}}">content</div> done';
  astEqual(t, program([
    text("some "),
    element("div", [attr("class", [mustache('foo')])], [
      text("content")
    ]),
    text(" done")
  ]));
});

test("Handlebars embedded in an attribute (sexprs)", function() {
  var t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
  astEqual(t, program([
    text("some "),
    element("div", [attr("class", [
      mustache([id('foo'), sexpr([id('foo'), string('abc')])])
    ])], [
      text("content")
    ]),
    text(" done")
  ]));
});


test("Handlebars embedded in an attribute with other content surrounding it", function() {
  var t = 'some <a href="http://{{link}}/">content</a> done';
  astEqual(t, program([
    text("some "),
    element("a", [attr("href", [
      text("http://"),
      mustache('link'), text("/")
    ])], [
      text("content")
    ]),
    text(" done")
  ]));
});

test("A more complete embedding example", function() {
  var t = "{{embed}} {{some 'content'}} " +
          "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
          " {{more 'embed'}}";
  astEqual(t, program([
    text(''),
    mustache('embed'),
    text(' '),
    mustache([id('some'), string('content')]),
    text(' '),
    element("div", [
      attr("class", [
        mustache('foo'),
        text(' '),
        mustache([id('bind-class'), id('isEnabled')], [['truthy', string('enabled')]])
      ])
    ], [
      mustache('content')
    ]),
    text(' '),
    mustache([id('more'), string('embed')]),
    text('')
  ]));
});

test("Simple embedded block helpers", function() {
  var t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
  astEqual(t, program([
    text(''),
    block(mustache([id('if'), id('foo')]), program([
      element('div', [
        mustache('content')
      ])
    ])),
    text('')
  ]));
});

test("Involved block helper", function() {
  var t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
  astEqual(t, program([
    element('p', [
      text('hi')
    ]),
    text(' content '),
    block(mustache([id('testing'), id('shouldRender')]), program([
      element('p', [
        text('Appears!')
      ])
    ])),
    text(' more '),
    element('em', [
      text('content')
    ]),
    text(' here')
  ]));
});

test("Node helpers", function() {
  var t = "<p {{action 'boom'}} class='bar'>Some content</p>";
  astEqual(t, program([
    element('p', [attr('class', [text('bar')])], [mustache([id('action'), string('boom')])], [
      text('Some content')
    ])
  ]));
});

test('Auto insertion of text nodes between blocks and mustaches', function () {
  var t = "{{one}}{{two}}{{#three}}{{/three}}{{#four}}{{/four}}{{five}}";
  astEqual(t, program([
    text(''),
    mustache([id('one')]),
    text(''),
    mustache([id('two')]),
    text(''),
    block(mustache([id('three')]), program([])),
    text(''),
    block(mustache([id('four')]), program([])),
    text(''),
    mustache([id('five')]),
    text('')
  ]));
});