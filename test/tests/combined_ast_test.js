import { preprocess } from "htmlbars/parser";
import AST from "handlebars/compiler/ast";
import { HTMLElement, BlockElement } from "htmlbars/ast";

module("HTML-based compiler (AST)");

function id(string) {
  return new AST.IdNode([{ part: string }]);
}

function sexpr(params) {
  var sexprNode = new AST.SexprNode(params);

  // normalize 1 -> true for the sake of comparison; not sure
  // why they come in differently...
  sexprNode.isHelper = sexprNode.isHelper === 1 ? true : sexprNode.isHelper;
  return sexprNode;
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

  return new AST.MustacheNode(params, hash(pairs), raw ? '{{{' : '{{', { left: false, right: false });
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
  return new BlockElement(helper, children);;
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

function astEqual(result, expected, message) {
  // Perform a deepEqual but recursively remove the locInfo stuff
  // (e.g. line/column information about the compiled template)
  // that we don't want to have to write into our test cases.
  removeLocInfo(result);
  removeLocInfo(expected);

  deepEqual(result, expected, message);
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
  var preprocessed = preprocess('some <div>{{content}}</div> done');
  astEqual(preprocessed, [
    "some ",
    element("div", [ mustache('content') ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute", function() {
  astEqual(preprocess('some <div class="{{foo}}">content</div> done'), [
    "some ",
      element("div", [[ "class", [mustache('foo')] ]], [
      "content"
    ]),
    " done"
  ]);
});

test("Handlebars embedded in an attribute (sexprs)", function() {
  var preprocessed = preprocess('some <div class="{{foo (foo "abc")}}">content</div> done');
  var expected = [
    "some ",
      element("div", [[ "class", [mustache([id('foo'), sexpr([id('foo'), string('abc')])])] ]], [
      "content"
    ]),
    " done"
  ];
  astEqual(preprocessed, expected);
});


test("Handlebars embedded in an attribute with other content surrounding it", function() {
  astEqual(preprocess('some <a href="http://{{link}}/">content</a> done'), [
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

  astEqual(preprocess(html), [
    '',
    mustache('embed'), ' ',
    mustache([id('some'), string('content')]), ' ',
    element("div", [
      ["class", [mustache('foo'), ' ', mustache([id('bind-class'), id('isEnabled')], [['truthy', string('enabled')]])]]
    ], [
      mustache('content')
    ]),
    ' ', mustache([id('more'), string('embed')]),
    ''
  ]);
});

test("Simple embedded block helpers", function() {
  var html = "{{#if foo}}<div>{{content}}</div>{{/if}}";

  astEqual(preprocess(html), ['',
    block(mustache([id('if'), id('foo')]), [
      element('div', [ mustache('content') ])
    ]),
    ''
  ]);
});

test("Involved block helper", function() {
  var html = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';

  astEqual(preprocess(html), [
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

  astEqual(preprocess(html), [
    element('p', [['class', ['bar']]], ['Some content'], [mustache([id('action'), string('boom')])])
  ]);
});
