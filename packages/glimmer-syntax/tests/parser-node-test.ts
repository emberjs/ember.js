import { parse as handlebarsParse } from "handlebars/compiler/base";
import { parse } from "glimmer-syntax";
import b from "glimmer-syntax/lib/builders";
import { astEqual } from "./support";

QUnit.module("[glimmer-syntax] Parser - AST");

test("a simple piece of content", function() {
  let t = 'some content';
  astEqual(t, b.program([
    b.text('some content')
  ]));
});

test("allow simple AST to be passed", function() {
  let ast = parse(handlebarsParse("simple"));

  astEqual(ast, b.program([
    b.text("simple")
  ]));
});

test("allow an AST with mustaches to be passed", function() {
  let ast = parse(handlebarsParse("<h1>some</h1> ast {{foo}}"));

  astEqual(ast, b.program([
    b.element("h1", [], [], [
      b.text("some")
    ]),
    b.text(" ast "),
    b.mustache(b.path('foo'))
  ]));
});

test("self-closed element", function() {
  let t = '<g />';
  astEqual(t, b.program([
    b.element("g")
  ]));
});

test("elements can have empty attributes", function() {
  let t = '<img id="">';
  astEqual(t, b.program([
    b.element("img", [
      b.attr("id", b.text(""))
    ])
  ]));
});

test("svg content", function() {
  let t = "<svg></svg>";
  astEqual(t, b.program([
    b.element("svg")
  ]));
});

test("html content with html content inline", function() {
  let t = '<div><p></p></div>';
  astEqual(t, b.program([
    b.element("div", [], [], [
      b.element("p")
    ])
  ]));
});

test("html content with svg content inline", function() {
  let t = '<div><svg></svg></div>';
  astEqual(t, b.program([
    b.element("div", [], [], [
      b.element("svg")
    ])
  ]));
});

let integrationPoints = ['foreignObject', 'desc', 'title'];
function buildIntegrationPointTest(integrationPoint){
  return function integrationPointTest(){
    let t = '<svg><'+integrationPoint+'><div></div></'+integrationPoint+'></svg>';
    astEqual(t, b.program([
      b.element("svg", [], [], [
        b.element(integrationPoint, [], [], [
          b.element("div")
        ])
      ])
    ]));
  };
}
for (let i=0, length = integrationPoints.length; i<length; i++) {
  test(
    "svg content with html content inline for "+integrationPoints[i],
    buildIntegrationPointTest(integrationPoints[i])
  );
}

test("a piece of content with HTML", function() {
  let t = 'some <div>content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("a piece of Handlebars with HTML", function() {
  let t = 'some <div>{{content}}</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [], [], [
      b.mustache(b.path('content'))
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (quoted)", function() {
  let t = 'some <div class="{{foo}}">content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [ b.attr("class", b.concat([ b.mustache('foo') ])) ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (unquoted)", function() {
  let t = 'some <div class={{foo}}>content</div> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("div", [ b.attr("class", b.mustache(b.path('foo'))) ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("Handlebars embedded in an attribute (sexprs)", function() {
  let t = 'some <div class="{{foo (foo "abc")}}">content</div> done';
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
  let t = 'some <a href="http://{{link}}/">content</a> done';
  astEqual(t, b.program([
    b.text("some "),
    b.element("a", [
      b.attr("href", b.concat([
        b.text("http://"),
        b.mustache('link'),
        b.text("/")
      ]))
    ], [], [
      b.text("content")
    ]),
    b.text(" done")
  ]));
});

test("A more complete embedding example", function() {
  let t = "{{embed}} {{some 'content'}} " +
          "<div class='{{foo}} {{bind-class isEnabled truthy='enabled'}}'>{{ content }}</div>" +
          " {{more 'embed'}}";
  astEqual(t, b.program([
    b.mustache(b.path('embed')),
    b.text(' '),
    b.mustache(b.path('some'), [b.string('content')]),
    b.text(' '),
    b.element("div", [
      b.attr("class", b.concat([
        b.mustache('foo'),
        b.text(' '),
        b.mustache('bind-class', [b.path('isEnabled')], b.hash([b.pair('truthy', b.string('enabled'))]))
      ]))
    ], [], [
      b.mustache(b.path('content'))
    ]),
    b.text(' '),
    b.mustache(b.path('more'), [b.string('embed')])
  ]));
});

test("Simple embedded block helpers", function() {
  let t = "{{#if foo}}<div>{{content}}</div>{{/if}}";
  astEqual(t, b.program([
    b.block(b.path('if'), [b.path('foo')], b.hash(), b.program([
      b.element('div', [], [], [
        b.mustache(b.path('content'))
      ])
    ]))
  ]));
});

test("Involved block helper", function() {
  let t = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
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
  let t = "<p {{action 'boom'}} class='bar'>Some content</p>";
  astEqual(t, b.program([
    b.element('p', [ b.attr('class', b.text('bar')) ], [
      b.elementModifier(b.path('action'), [b.string('boom')])
    ], [
      b.text('Some content')
    ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in tagName state", function() {
  let t = "<input{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in beforeAttributeName state", function() {
  let t = "<input {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in attributeName state", function() {
  let t = "<input foo{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeName state", function() {
  let t = "<input foo {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeValue state", function() {
  let t = "<input foo=1 {{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('1')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Tokenizer: MustacheStatement encountered in afterAttributeValueQuoted state", function() {
  let t = "<input foo='1'{{bar}}>";
  astEqual(t, b.program([
    b.element('input', [ b.attr('foo', b.text('1')) ], [ b.elementModifier(b.path('bar')) ])
  ]));
});

test("Stripping - mustaches", function() {
  let t = "foo {{~content}} bar";
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
  let t = "foo {{~#wat}}{{/wat}} bar";
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
  let t = "{{#wat~}} foo {{else}}{{/wat}}";
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
  let t = "{{#each~}}\n  <li> foo </li>\n{{~/each}}";
  astEqual(t, b.program([
    b.block(b.path('each'), [], b.hash(), b.program([
      b.element('li', [], [], [b.text(' foo ')])
    ]))
  ]));
});

// TODO: Make these throw an error.
//test("Awkward mustache in unquoted attribute value", function() {
//  let t = "<div class=a{{foo}}></div>";
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

test("an HTML comment", function() {
  let t = 'before <!-- some comment --> after';
  astEqual(t, b.program([
    b.text("before "),
    b.comment(" some comment "),
    b.text(" after")
  ]));
});

test("allow {{null}} to be passed as helper name", function() {
  let ast = parse("{{null}}");

  astEqual(ast, b.program([
    b.mustache(b.null())
  ]));
});

test("allow {{null}} to be passed as a param", function() {
  let ast = parse("{{foo null}}");

  astEqual(ast, b.program([
    b.mustache(b.path('foo'), [b.null()])
  ]));
});

test("allow {{undefined}} to be passed as helper name", function() {
  let ast = parse("{{undefined}}");

  astEqual(ast, b.program([
    b.mustache(b.undefined())
  ]));
});

test("allow {{undefined}} to be passed as a param", function() {
  let ast = parse("{{foo undefined}}");

  astEqual(ast, b.program([
    b.mustache(b.path('foo'), [b.undefined()])
  ]));
});
