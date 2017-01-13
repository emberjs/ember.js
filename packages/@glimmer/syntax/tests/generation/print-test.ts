import { preprocess as parse, print, builders as b } from "@glimmer/syntax";

function printTransform(template) {
  return print(parse(template));
}

function printEqual(template) {
  equal(printTransform(template), template);
}

QUnit.module('[glimmer-syntax] Code generation');

test('ElementNode: tag', function() {
  printEqual('<h1></h1>');
});

test('ElementNode: nested tags with indent', function() {
  printEqual('<div>\n  <p>Test</p>\n</div>');
});

test('ElementNode: attributes', function() {
  printEqual('<h1 class="foo" id="title"></h1>');
});

test('TextNode: chars', function() {
  printEqual('<h1>Test</h1>');
});

test('MustacheStatement: slash in path', function() {
  printEqual('{{namespace/foo "bar" baz="qux"}}');
});

test('MustacheStatement: path', function() {
  printEqual('<h1>{{model.title}}</h1>');
});

test('MustacheStatement: StringLiteral param', function() {
  printEqual('<h1>{{link-to "Foo"}}</h1>');
});

test('MustacheStatement: hash', function() {
  printEqual('<h1>{{link-to "Foo" class="bar"}}</h1>');
});

test('MustacheStatement: as element attribute', function() {
  printEqual('<h1 class={{if foo "foo" "bar"}}>Test</h1>');
});

test('MustacheStatement: as element attribute with path', function() {
  printEqual('<h1 class={{color}}>Test</h1>');
});

test('ConcatStatement: in element attribute string', function() {
  printEqual('<h1 class="{{if active "active" "inactive"}} foo">Test</h1>');
});

test('ElementModifierStatement', function() {
  printEqual('<p {{action "activate"}} {{someting foo="bar"}}>Test</p>');
});

test('PartialStatement', function() {
  printEqual('<p>{{>something "param"}}</p>');
});

test('SubExpression', function() {
  printEqual('<p>{{my-component submit=(action (mut model.name) (full-name model.firstName "Smith"))}}</p>');
});

test('BlockStatement: multiline', function() {
  printEqual('<ul>{{#each foos as |foo index|}}\n  <li>{{foo}}: {{index}}</li>\n{{/each}}</ul>');
});

test('BlockStatement: inline', function() {
  printEqual('{{#if foo}}<p>{{foo}}</p>{{/if}}');
});

test('UndefinedLiteral', function() {
  const ast = b.program([b.mustache(b.undefined())]);
  equal(print(ast), '{{undefined}}');
});

test('NumberLiteral', function() {
  const ast = b.program([
    b.mustache('foo', null,
      b.hash([b.pair('bar', b.number(5))])
    )
  ]);
  equal(print(ast), '{{foo bar=5}}');
});

test('BooleanLiteral', function() {
  const ast = b.program([
    b.mustache('foo', null,
      b.hash([b.pair('bar', b.boolean(true))])
    )
  ]);
  equal(print(ast), '{{foo bar=true}}');
});

test('HTML comment', function() {
  printEqual('<!-- foo -->');
});

test('Handlebars comment', function() {
  equal(printTransform('{{! foo }}'), '{{!-- foo --}}');
});

test('Handlebars comment: in ElementNode', function() {
  printEqual('<div {{!-- foo --}}></div>');
});

test('Handlebars comment: in ElementNode children', function() {
  printEqual('<div>{{!-- foo bar --}}<b></b></div>');
});

test('Handlebars in handlebar comment', function() {
  printEqual('{{!-- {{foo-bar}} --}}');
});
