import { preprocess as parse, print, builders as b } from '@glimmer/syntax';

const { test } = QUnit;

function printTransform(template: string) {
  return print(parse(template));
}

function printEqual(template: string) {
  QUnit.assert.equal(printTransform(template), template);
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

test('ElementNode: attributes escaping', function() {
  printEqual('<h1 class="foo" id="title" data-a="&quot;Foo&nbsp;&amp;&nbsp;Bar&quot;"></h1>');
});

test('TextNode: chars escape', assert => {
  assert.equal(printTransform('&lt; &amp; &nbsp; &gt; &copy;2018'), '&lt; &amp; &nbsp; &gt; ©2018');
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

test('ConcatStatement: in element attribute string escaping', function() {
  printEqual('<h1 class="< &nbsp; {{if x "&" "<"}} &amp; &quot;">Test</h1>');
});

test('ElementModifierStatement', function() {
  printEqual('<p {{action "activate"}} {{someting foo="bar"}}>Test</p>');
});

test('SubExpression', function() {
  printEqual(
    '<p>{{my-component submit=(action (mut model.name) (full-name model.firstName "Smith"))}}</p>'
  );
});

test('BlockStatement: multiline', function() {
  printEqual('<ul>{{#each foos as |foo index|}}\n  <li>{{foo}}: {{index}}</li>\n{{/each}}</ul>');
});

test('BlockStatement: inline', function() {
  printEqual('{{#if foo}}<p>{{foo}}</p>{{/if}}');
});

test('UndefinedLiteral', assert => {
  const ast = b.program([b.mustache(b.undefined())]);
  assert.equal(print(ast), '{{undefined}}');
});

test('NumberLiteral', assert => {
  const ast = b.program([b.mustache('foo', undefined, b.hash([b.pair('bar', b.number(5))]))]);
  assert.equal(print(ast), '{{foo bar=5}}');
});

test('BooleanLiteral', assert => {
  const ast = b.program([b.mustache('foo', undefined, b.hash([b.pair('bar', b.boolean(true))]))]);
  assert.equal(print(ast), '{{foo bar=true}}');
});

test('HTML comment', function() {
  printEqual('<!-- foo -->');
});

test('Handlebars comment', assert => {
  assert.equal(printTransform('{{! foo }}'), '{{!-- foo --}}');
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

test('Void elements', function() {
  printEqual('<br>');
});

test('Void elements self closing', function() {
  printEqual('<br />');
});

test('Block params', function() {
  printEqual('<Foo as |bar|>{{bar}}</Foo>');
});

test('Attributes without value', function() {
  printEqual('<input disabled />');
});
