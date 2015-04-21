import { parse } from "../htmlbars-syntax/handlebars/compiler/base";
import { preprocess } from "../htmlbars-syntax/parser";

import b from "../htmlbars-syntax/builders";

QUnit.module("HTML-based compiler (AST)");

function normalizeNode(obj) {
  if (obj && typeof obj === 'object') {
    var newObj;
    if (obj.splice) {
      newObj = new Array(obj.length);

      for (var i = 0; i < obj.length; i++) {
        newObj[i] = normalizeNode(obj[i]);
      }
    } else {
      newObj = {};

      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = normalizeNode(obj[key]);
        }
      }

      if (newObj.type) {
        newObj._type = newObj.type;
        delete newObj.type;
      }

      if (newObj.loc) {
        delete newObj.loc;
      }
    }
    return newObj;
  } else {
    return obj;
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

  actual = normalizeNode(actual);
  expected = normalizeNode(expected);

  deepEqual(actual, expected, message);
}

test("a simple piece of content", function() {
  var t = 'some content';
  astEqual(t, b.program([
    b.text('some content')
  ]));
});

test("allow simple AST to be passed", function() {
  var ast = preprocess(parse("simple"));

  astEqual(ast, b.program([
    b.text("simple")
  ]));
});

test("allow an AST with mustaches to be passed", function() {
  var ast = preprocess(parse("<h1>some</h1> ast {{foo}}"));

  astEqual(ast, b.program([
    b.element("h1", [], [], [
      b.text("some")
    ]),
    b.text(" ast "),
    b.mustache(b.path('foo'))
  ]));
});

test("self-closed element", function() {
  var t = '<g />';
  astEqual(t, b.program([
    b.element("g")
  ]));
});

test("elements can have empty attributes", function() {
  var t = '<img id="">';
  astEqual(t, b.program([
    b.element("img", [
      b.attr("id", b.text(""))
    ])
  ]));
});

test("svg content", function() {
  var t = "<svg></svg>";
  astEqual(t, b.program([
    b.element("svg")
  ]));
});

test("html content with html content inline", function() {
  var t = '<div><p></p></div>';
  astEqual(t, b.program([
    b.element("div", [], [], [
      b.element("p")
    ])
  ]));
});

test("html content with svg content inline", function() {
  var t = '<div><svg></svg></div>';
  astEqual(t, b.program([
    b.element("div", [], [], [
      b.element("svg")
    ])
  ]));
});

var integrationPoints = ['foreignObject', 'desc', 'title'];
function buildIntegrationPointTest(integrationPoint){
  return function integrationPointTest(){
    var t = '<svg><'+integrationPoint+'><div></div></'+integrationPoint+'></svg>';
    astEqual(t, b.program([
      b.element("svg", [], [], [
        b.element(integrationPoint, [], [], [
          b.element("div")
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
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("a piece of Handlebars with HTML", function() {
  var t = 'some <div>{{content}}</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [], [], [
      b.mustache(b.path('content'))
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (quoted)", function() {
  var t = 'some <div class="{{foo}}">content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [ b.attr("class", b.concat([ b.path('foo') ])) ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (unquoted)", function() {
  var t = 'some <div class={{foo}}>content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [ b.attr("class", b.mustache(b.path('foo'))) ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (sexprs)", function() {
  var t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [
      b.attr("class", b.concat([ b.mustache(b.path('foo'), [ b.sexpr(b.path('foo'), [ b.string('abc') ]) ]) ]))
    ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});


test("Handlebars embedded in an attribute with other content surrounding it", function() {
  var t = 'some <a href="http://{{link}}/">content</a> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("a", [
      b.attr("href", b.concat([
        b.string("http://"),
        b.path('link'),
        b.string("/")
      ]))
    ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("A more complete embedding example", function() {
  var t = "{{embed}} {{some 'content'}} " +
          "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
          " {{more 'embed'}}";
  astEqual(t, b.program([
    b.mustache(b.path('embed')),
    b.text(' '),
    b.mustache(b.path('some'), [b.string('content')]),
    b.text(' '),
    b.element("div", [
      b.attr("class", b.concat([
        b.path('foo'),
        b.string(' '),
        b.mustache(b.path('bind-class'), [b.path('isEnabled')], b.hash([b.pair('truthy', b.string('enabled'))]))
      ]))
    ], [], [
      b.mustache(b.path('content'))
    ]),
    b.text(' '),
    b.mustache(b.path('more'), [b.string('embed')])
  ]));
});

test("Simple embedded block helpers", function() {
  var t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
  astEqual(t, b.program([
    b.block(b.path('if'), [b.path('foo')], b.hash(), b.program([
      b.element('div', [], [], [
        b.mustache(b.path('content'))
      ])
    ]))
  ]));
});

test("Involved block helper", function() {
  var t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
  astEqual(t, b.program([
    b.element('p', [], [], [
      b.text('hi')
    ]),
    b.text(' content '),
    b.block(b.path('testing'), [b.path('shouldRender')], b.hash(), b.program([
      b.element('p', [], [], [
        b.text('Appears!')
      ])
    ])),
    b.text(' more '),
    b.element('em', [], [], [
      b.text('content')
    ]),
    b.text(' here')
  ]));
});

test("Element modifiers", function() {
  var t = "<p {{action 'boom'}} class='bar'>Some content</p>";
  astEqual(t, b.program([
    b.element('p', [ b.attr('class', b.text('bar')) ], [
      b.elementModifier(b.path('action'), [b.string('boom')])
    ], [
      b.text('Some content')
    ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in tagName state", function() {
  var t = "<input{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in beforeAttributeName state", function() {
  var t = "<input {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in attributeName state", function() {
  var t = "<input foo{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeName state", function() {
  var t = "<input foo {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeValue state", function() {
  var t = "<input foo=1 {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('1')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeValueQuoted state", function() {
  var t = "<input foo='1'{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('1')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Stripping - mustaches", function() {
  var t = "foo {{~content}} bar";
  astEqual(t, b.program([
    b.text('foo'),
    b.mustache(b.path('content')),
    b.text(' bar')
  ]));

  t = "foo {{content~}} bar";
  astEqual(t, b.program([
    b.text('foo '),
    b.mustache(b.path('content')),
    b.text('bar')
  ]));
});

test("Stripping - blocks", function() {
  var t = "foo {{~#wat}}{{/wat}} bar";
  astEqual(t, b.program([
    b.text('foo'),
    b.block(b.path('wat'), [], b.hash(), b.program()),
    b.text(' bar')
  ]));

  t = "foo {{#wat}}{{/wat~}} bar";
  astEqual(t, b.program([
    b.text('foo '),
    b.block(b.path('wat'), [], b.hash(), b.program()),
    b.text('bar')
  ]));
});


test("Stripping - programs", function() {
  var t = "{{#wat~}} foo {{else}}{{/wat}}";
  astEqual(t, b.program([
    b.block(b.path('wat'), [], b.hash(), b.program([
      b.text('foo ')
    ]), b.program())
  ]));

  t = "{{#wat}} foo {{~else}}{{/wat}}";
  astEqual(t, b.program([
    b.block(b.path('wat'), [], b.hash(), b.program([
      b.text(' foo')
    ]), b.program())
  ]));

  t = "{{#wat}}{{else~}} foo {{/wat}}";
  astEqual(t, b.program([
    b.block(b.path('wat'), [], b.hash(), b.program(), b.program([
      b.text('foo ')
    ]))
  ]));

  t = "{{#wat}}{{else}} foo {{~/wat}}";
  astEqual(t, b.program([
    b.block(b.path('wat'), [], b.hash(), b.program(), b.program([
      b.text(' foo')
    ]))
  ]));
});

test("Stripping - removes unnecessary text nodes", function() {
  var t = "{{#each~}}\n  <li> foo </li>\n{{~/each}}";
  astEqual(t, b.program([
    b.block(b.path('each'), [], b.hash(), b.program([
      b.element('li', [], [], [b.text(' foo ')])
    ]))
  ]));
});

// TODO: Make these throw an error.
//test("Awkward mustache in unquoted attribute value", function() {
//  var t = "<div class=a{{foo}}></div>";
//  astEqual(t, b.program([
//    b.element('div', [ b.attr('class', concat([b.string("a"), b.sexpr([b.path('foo')])])) ])
//  ]));
//
//  t = "<div class=a{{foo}}b></div>";
//  astEqual(t, b.program([
//    b.element('div', [ b.attr('class', concat([b.string("a"), b.sexpr([b.path('foo')]), b.string("b")])) ])
//  ]));
//
//  t = "<div class={{foo}}b></div>";
//  astEqual(t, b.program([
//    b.element('div', [ b.attr('class', concat([b.sexpr([b.path('foo')]), b.string("b")])) ])
//  ]));
//});

test("Components", function() {
  var t = "<x-foo a=b c='d' e={{f}} id='{{bar}}' class='foo-{{bar}}'>{{a}}{{b}}c{{d}}</x-foo>{{e}}";
  astEqual(t, b.program([
    b.component('x-foo', [
      b.attr('a', b.text('b')),
      b.attr('c', b.text('d')),
      b.attr('e', b.mustache(b.path('f'))),
      b.attr('id', b.concat([ b.path('bar') ])),
      b.attr('class', b.concat([ b.string('foo-'), b.path('bar') ]))
    ], b.program([
      b.mustache(b.path('a')),
      b.mustache(b.path('b')),
      b.text('c'),
      b.mustache(b.path('d'))
    ])),
    b.mustache(b.path('e'))
  ]));
});

test("Components with disableComponentGeneration", function() {
  var t = "begin <x-foo>content</x-foo> finish";
  var actual = preprocess(t, {
    disableComponentGeneration: true
  });

  astEqual(actual, b.program([
    b.text("begin "),
    b.element("x-foo", [], [], [
      b.text("content")
    ]),
    b.text(" finish")
  ]));
});

test("Components with disableComponentGeneration === false", function() {
  var t = "begin <x-foo>content</x-foo> finish";
  var actual = preprocess(t, {
    disableComponentGeneration: false
  });

  astEqual(actual, b.program([
    b.text("begin "),
    b.component("x-foo", [],
      b.program([
        b.text("content")
      ])
    ),
    b.text(" finish")
  ]));
});

test("an HTML comment", function() {
  var t = 'before <!-- some comment --> after';
  astEqual(t, b.program([
    b.text("before "),
    b.comment(" some comment "),
    b.text(" after")
  ]));
});

test("allow {{null}} to be passed", function() {
  var ast = preprocess(parse("{{null}}"));

  astEqual(ast, b.program([
    b.mustache(b.null())
  ]));
});
