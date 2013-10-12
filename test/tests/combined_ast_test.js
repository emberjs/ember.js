import { preprocess } from "htmlbars/parser";
module AST from "handlebars/compiler/ast";
import { HTMLElement, BlockElement } from "htmlbars/ast";

module("HTML-based compiler (AST)");

function id(string) {
  return new AST.IdNode([{ part: string }]);
}

function hash(pairs) {
  return pairs ? new AST.HashNode(pairs) : undefined;
}

function mustache(string, pairs, raw) {
  var params;

  if (({}).toString.call(string) === '[object Array]') {
    params = string;
  } else {
    params = [id(string)];
  }

  return new AST.MustacheNode(params, hash(pairs), raw || false);
}

function string(data) {
  return new AST.StringNode(data);
}

function element(tagName, attrs, children, helpers) {
  if (arguments.length === 2) {
    children = attrs;
    attrs = [];
  }

  return new HTMLElement(tagName, attrs, children, helpers);
}

function block(helper, children) {
  return new BlockElement(helper, children);
}

test("a simple piece of content", function() {
  deepEqual(preprocess('some content'), ['some content']);
});

test("a piece of content with HTML", function() {
  deepEqual(preprocess('some <div>content</div> done'), [
    "some ",
    element("div", [ "content" ]),
    " done"
  ]);
});

test("a piece of Handlebars with HTML", function() {
  deepEqual(preprocess('some <div>{{content}}</div> done'), [
    "some ",
    element("div", [ mustache('content') ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute", function() {
  deepEqual(preprocess('some <div class="{{foo}}">content</div> done'), [
    "some ",
      element("div", [[ "class", [mustache('foo')] ]], [
      "content"
    ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute with other content surrounding it", function() {
  deepEqual(preprocess('some <a href="http://{{link}}/">content</a> done'), [
    "some ",
      element("a", [[ "href", ["http://", mustache('link'), "/"] ]], [
      "content"
    ]),
    " done"
  ]);
});

test("A more complete embedding example", function() {
  var html = "{{embed}} {{some 'content'}} " +
             "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
             " {{more 'embed'}}";

  deepEqual(preprocess(html), [
    mustache('embed'), ' ',
    mustache([id('some'), string('content')]), ' ',
    element("div", [
      ["class", [mustache('foo'), ' ', mustache([id('bind-class'), id('isEnabled')], [['truthy', string('enabled')]])]]
    ], [
      mustache('content')
    ]),
    ' ', mustache([id('more'), string('embed')])
  ]);
});

test("Simple embedded block helpers", function() {
  var html = "{{#if foo}}<div>{{content}}</div>{{/if}}";

  deepEqual(preprocess(html), [
    block(mustache([id('if'), id('foo')]), [
      element('div', [ mustache('content') ])
    ])
  ]);
});

test("Involved block helper", function() {
  var html = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';

  deepEqual(preprocess(html), [
    element('p', ['hi']),
    ' content ',
    block(mustache([id('testing'), id('shouldRender')]), [
      element('p', ['Appears!'])
    ]),
    ' more ',
    element('em', ['content']),
    ' here'
  ]);
});

test("Node helpers", function() {
  var html = "<p {{action 'boom'}} class='bar'>Some content</p>";

  deepEqual(preprocess(html), [
    element('p', [['class', ['bar']]], ['Some content'], [mustache([id('action'), string('boom')])])
  ]);
});
