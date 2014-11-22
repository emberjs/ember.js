import { preprocess } from "../htmlbars-compiler/parser";
import {
  ProgramNode,
  BlockNode,
  ComponentNode,
  ElementNode,
  MustacheNode,
  SexprNode,
  HashNode,
  IdNode,
  StringNode,
  AttrNode,
  TextNode,
  CommentNode
} from "../htmlbars-compiler/ast";

var svgNamespace = "http://www.w3.org/2000/svg";

QUnit.module("HTML-based compiler (AST)");

function id(string) {
  return new IdNode([{ part: string }]);
}

function sexpr(params, hash) {
  var sexprNode = new SexprNode(params, hash || undefined);
  if (sexprNode.isHelper) {
    sexprNode.isHelper = true;
  }
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

  return new MustacheNode(params, hash(pairs), raw ? '{{{' : '{{');
}

function concat(params) {
  return mustache([id('concat')].concat(params));
}

function string(data) {
  return new StringNode(data);
}

function element(tagName, attributes, helpers, children) {
  return new ElementNode(tagName, attributes || [], helpers || [], children || []);
}

function svgElement(tagName, attributes, helpers, children) {
  var e = element(tagName, attributes, helpers, children);
  e.namespaceURI = svgNamespace;
  return e;
}

function svgHTMLIntegrationPoint(tagName, attributes, helpers, children) {
  var e = svgElement(tagName, attributes, helpers, children);
  e.isHTMLIntegrationPoint = true;
  return e;
}

function component(tagName, attributes, children) {
  return new ComponentNode(tagName, attributes || [], children || []);
}

function attr(name, value) {
  return new AttrNode(name, value);
}

function text(chars) {
  return new TextNode(chars);
}

function comment(value) {
  return new CommentNode(value);
}

function block(mustache, program, inverse) {
  return new BlockNode(mustache, program, inverse || null);
}

function program(children, blockParams) {
  return new ProgramNode(children || [], blockParams || null);
}

function root(children) {
  return program(children || []);
}

function removeLocInfoAndStrip(obj) {
  delete obj.firstColumn;
  delete obj.firstLine;
  delete obj.lastColumn;
  delete obj.lastLine;
  delete obj.strip;

  for (var k in obj) {
    if (obj.hasOwnProperty(k) && obj[k] && typeof obj[k] === 'object') {
      removeLocInfoAndStrip(obj[k]);
    }
  }
}

function astEqual(actual, expected, message) {
  // Perform a deepEqual but recursively remove the locInfo stuff
  // (e.g. line/column information about the compiled template)
  // that we don't want to have to write into our test cases.

  if (typeof actual === 'string') {
    actual = preprocess(actual);
  }
  if (typeof expected === 'string') {
    expected = preprocess(expected);
  }

  removeLocInfoAndStrip(actual);
  removeLocInfoAndStrip(expected);

  deepEqual(actual, expected, message);
}

test("a simple piece of content", function() {
  var t = 'some content';
  astEqual(t, root([
    text('some content')
  ]));
});

test("self-closed element", function() {
  var t = '<g />';
  astEqual(t, root([
    element("g")
  ]));
});

test("svg content", function() {
  var t = "<svg></svg>";
  astEqual(t, root([
    svgElement("svg")
  ]));
});

test("html content with html content inline", function() {
  var t = '<div><p></p></div>';
  astEqual(t, root([
    element("div", [], [], [
      element("p")
    ])
  ]));
});

test("html content with svg content inline", function() {
  var t = '<div><svg></svg></div>';
  astEqual(t, root([
    element("div", [], [], [
      svgElement("svg")
    ])
  ]));
});

var integrationPoints = ['foreignObject', 'desc', 'title'];
function buildIntegrationPointTest(integrationPoint){
  return function integrationPointTest(){
    var t = '<svg><'+integrationPoint+'><div></div></'+integrationPoint+'></svg>';
    astEqual(t, root([
      svgElement("svg", [], [], [
        svgHTMLIntegrationPoint(integrationPoint, [], [], [
          element("div")
        ])
      ])
    ]));
  };
}
for (var i=0, length = integrationPoints.length; i<length; i++) {
  test(
    "svg content with html content inline for "+integrationPoints[i],
    buildIntegrationPointTest(integrationPoints[i])
  );
}

test("a piece of content with HTML", function() {
  var t = 'some <div>content</div> done';
  astEqual(t, root([
    text("some "),
    element("div", [], [], [
      text("content")
    ]),
    text(" done")
  ]));
});

test("a piece of Handlebars with HTML", function() {
  var t = 'some <div>{{content}}</div> done';
  astEqual(t, root([
    text("some "),
    element("div", [], [], [
      mustache('content')
    ]),
    text(" done")
  ]));
});

test("Handlebars embedded in an attribute", function() {
  var t = 'some <div class="{{foo}}">content</div> done';
  astEqual(t, root([
    text("some "),
    element("div", [ attr("class", mustache('foo')) ], [], [
      text("content")
    ]),
    text(" done")
  ]));
});

test("Handlebars embedded in an attribute (sexprs)", function() {
  var t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
  astEqual(t, root([
    text("some "),
    element("div", [
      attr("class", mustache([id('foo'), sexpr([id('foo'), string('abc')])]))
    ], [], [
      text("content")
    ]),
    text(" done")
  ]));
});


test("Handlebars embedded in an attribute with other content surrounding it", function() {
  var t = 'some <a href="http://{{link}}/">content</a> done';
  astEqual(t, root([
    text("some "),
    element("a", [
      attr("href", concat([
        string("http://"),
        sexpr([id('link')]),
        string("/")
      ]))
    ], [], [
      text("content")
    ]),
    text(" done")
  ]));
});

test("A more complete embedding example", function() {
  var t = "{{embed}} {{some 'content'}} " +
          "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
          " {{more 'embed'}}";
  astEqual(t, root([
    text(''),
    mustache('embed'),
    text(' '),
    mustache([id('some'), string('content')]),
    text(' '),
    element("div", [
      attr("class", concat([
        sexpr([id('foo')]),
        string(' '),
        sexpr([id('bind-class'), id('isEnabled')], hash([['truthy', string('enabled')]]))
      ]))
    ], [], [
      mustache('content')
    ]),
    text(' '),
    mustache([id('more'), string('embed')]),
    text('')
  ]));
});

test("Simple embedded block helpers", function() {
  var t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('if'), id('foo')]), program([
      element('div', [], [], [
        mustache('content')
      ])
    ])),
    text('')
  ]));
});

test("Involved block helper", function() {
  var t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
  astEqual(t, root([
    element('p', [], [], [
      text('hi')
    ]),
    text(' content '),
    block(sexpr([id('testing'), id('shouldRender')]), program([
      element('p', [], [], [
        text('Appears!')
      ])
    ])),
    text(' more '),
    element('em', [], [], [
      text('content')
    ]),
    text(' here')
  ]));
});

test("Node helpers", function() {
  var t = "<p {{action 'boom'}} class='bar'>Some content</p>";
  astEqual(t, root([
    element('p', [attr('class', text('bar'))], [mustache([id('action'), string('boom')])], [
      text('Some content')
    ])
  ]));
});

test('Auto insertion of text nodes between blocks and mustaches', function () {
  var t = "{{one}}{{two}}{{#three}}{{/three}}{{#four}}{{/four}}{{five}}";
  astEqual(t, root([
    text(''),
    mustache([id('one')]),
    text(''),
    mustache([id('two')]),
    text(''),
    block(sexpr([id('three')]), program()),
    text(''),
    block(sexpr([id('four')]), program()),
    text(''),
    mustache([id('five')]),
    text('')
  ]));
});

test("Stripping - mustaches", function() {
  var t = "foo {{~content}} bar";
  astEqual(t, root([
    text('foo'),
    mustache([id('content')]),
    text(' bar')
  ]));

  t = "foo {{content~}} bar";
  astEqual(t, root([
    text('foo '),
    mustache([id('content')]),
    text('bar')
  ]));
});

test("Stripping - blocks", function() {
  var t = "foo {{~#wat}}{{/wat}} bar";
  astEqual(t, root([
    text('foo'),
    block(sexpr([id('wat')]), program()),
    text(' bar')
  ]));

  t = "foo {{#wat}}{{/wat~}} bar";
  astEqual(t, root([
    text('foo '),
    block(sexpr([id('wat')]), program()),
    text('bar')
  ]));
});


test("Stripping - programs", function() {
  var t = "{{#wat~}} foo {{else}}{{/wat}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('wat')]), program([
      text('foo ')
    ]), program()),
    text('')
  ]));

  t = "{{#wat}} foo {{~else}}{{/wat}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('wat')]), program([
      text(' foo')
    ]), program()),
    text('')
  ]));

  t = "{{#wat}}{{else~}} foo {{/wat}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('wat')]), program(), program([
      text('foo ')
    ])),
    text('')
  ]));

  t = "{{#wat}}{{else}} foo {{~/wat}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('wat')]), program(), program([
      text(' foo')
    ])),
    text('')
  ]));
});

test("Stripping - removes unnecessary text nodes", function() {
  var t = "{{#each~}}\n  <li> foo </li>\n{{~/each}}";
  astEqual(t, root([
    text(''),
    block(sexpr([id('each')]), program([
      element('li', [], [], [text(' foo ')])
    ])),
    text('')
  ]));
});

test("Mustache in unquoted attribute value", function() {
  var t = "<div class=a{{foo}}></div>";
  astEqual(t, root([
    element('div', [ attr('class', concat([string("a"), sexpr([id('foo')])])) ])
  ]));

  t = "<div class={{foo}}></div>";
  astEqual(t, root([
    element('div', [ attr('class', mustache('foo')) ])
  ]));

  t = "<div class=a{{foo}}b></div>";
  astEqual(t, root([
    element('div', [ attr('class', concat([string("a"), sexpr([id('foo')]), string("b")])) ])
  ]));

  t = "<div class={{foo}}b></div>";
  astEqual(t, root([
    element('div', [ attr('class', concat([sexpr([id('foo')]), string("b")])) ])
  ]));
});

test("Components", function() {
  var t = "<x-foo id='{{bar}}' class='foo-{{bar}}'>{{a}}{{b}}c{{d}}</x-foo>{{e}}";
  astEqual(t, root([
    text(''),
    component('x-foo', [
      attr('id', mustache('bar')),
      attr('class', concat([ string('foo-'), sexpr([id('bar')]) ]))
    ], program([
      text(''),
      mustache('a'),
      text(''),
      mustache('b'),
      text('c'),
      mustache('d'),
      text('')
    ])),
    text(''),
    mustache('e'),
    text('')
  ]));
});

test("Components", function() {
  var t = "<x-foo id='{{bar}}' class='foo-{{bar}}'>{{a}}{{b}}c{{d}}</x-foo>{{e}}";
  astEqual(t, root([
    text(''),
    component('x-foo', [
      attr('id', mustache('bar')),
      attr('class', concat([ string('foo-'), sexpr([id('bar')]) ]))
    ], program([
      text(''),
      mustache('a'),
      text(''),
      mustache('b'),
      text('c'),
      mustache('d'),
      text('')
    ])),
    text(''),
    mustache('e'),
    text('')
  ]));
});

test("Components with disableComponentGeneration", function() {
  var t = "begin <x-foo>content</x-foo> finish";
  var actual = preprocess(t, {
    disableComponentGeneration: true
  });

  astEqual(actual, root([
    text("begin "),
    element("x-foo", [], [], [
      text("content")
    ]),
    text(" finish")
  ]));
});

test("Components with disableComponentGeneration === false", function() {
  var t = "begin <x-foo>content</x-foo> finish";
  var actual = preprocess(t, {
    disableComponentGeneration: false
  });

  astEqual(actual, root([
    text("begin "),
    component("x-foo", [],
      program([
        text("content")
      ])
    ),
    text(" finish")
  ]));
});

test("an HTML comment", function() {
  var t = 'before <!-- some comment --> after';
  astEqual(t, root([
    text("before "),
    comment(" some comment "),
    text(" after")
  ]));
});
