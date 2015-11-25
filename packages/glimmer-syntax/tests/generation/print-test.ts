import { parse, print, builders } from 'glimmer-syntax';

const b = builders;

function printEqual(template) {
  const ast = parse(template);
  equal(print(ast), template);
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
  printEqual('<ul>{{#each foos as |foo|}}\n  {{foo}}\n{{/each}}</ul>');
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
