import { preprocess as parse, print } from '@glimmer/syntax';

const { test } = QUnit;

let templates = [
  '<h1></h1>',
  '<h1 class="foo" id="title"></h1>',
  '<h1>Test</h1>',
  '<h1>{{model.title}}</h1>',
  '<h1>{{link-to "Foo" class="bar"}}</h1>',
  '<h1 class={{if foo "foo" "bar"}}>Test</h1>',
  '<h1 class={{color}}>Test</h1>',
  '<h1 class="{{if active "active" "inactive"}} foo">Test</h1>',
  '<p {{action "activate"}} {{someting foo="bar"}}>Test</p>',
  '<p>{{my-component submit=(action (mut model.name) (full-name model.firstName "Smith"))}}</p>',
  '<ul>{{#each foos as |foo index|}}\n  <li>{{foo}}: {{index}}</li>\n{{/each}}</ul>',
  '{{#if foo}}<p>{{foo}}</p>{{/if}}',
  '{{#if foo}}Foo{{else if bar}}Bar{{else}}Baz{{/if}}',
  '<Foo>{{bar}}</Foo>',
  '<Foo></Foo>',
  '<Foo />',
  '<Foo as |bar|>{{bar}}</Foo>',

  '<input disabled />',

  // void elements
  '<br>',
  '<br />',

  // comments
  '<!-- foo -->',
  '<div {{!-- foo --}}></div>',
  '<div>{{!-- foo bar --}}<b></b></div>',
  '{{!-- {{foo-bar}} --}}',

  // literals
  '<Panel @arg={{"Foo"}}></Panel>',
  '<Panel @arg={{true}}></Panel>',
  '<Panel @arg={{5}}></Panel>',
  '{{panel arg="Foo"}}',
  '{{panel arg=true}}',
  '{{panel arg=5}}',

  // nested tags with indent
  '<div>\n  <p>Test</p>\n</div>',

  // attributes escaping
  '<h1 class="foo" id="title" data-a="&quot;Foo&nbsp;&amp;&nbsp;Bar&quot;"></h1>',
  '<h1 class="< &nbsp; {{if x "&" "<"}} &amp; &quot;">Test</h1>',

  // slash in path
  '{{namespace/foo "bar" baz="qux"}}',

  // unescaped
  '{{{unescaped}}}',
];

QUnit.module('[glimmer-syntax] Code generation', function() {
  function printTransform(template: string) {
    return print(parse(template));
  }

  templates.forEach(template => {
    test(`${template} is stable when printed`, function(assert) {
      assert.equal(printTransform(template), template);
    });
  });

  test('TextNode: chars escape - but do not match', assert => {
    assert.equal(
      printTransform('&lt; &amp; &nbsp; &gt; &copy;2018'),
      '&lt; &amp; &nbsp; &gt; ©2018'
    );
  });

  test('Handlebars comment', assert => {
    assert.equal(printTransform('{{! foo }}'), '{{!-- foo --}}');
  });
});

QUnit.module('[glimmer-syntax] Code generation - source -> source', function() {
  function printTransform(template: string) {
    let ast = parse(template, {
      mode: 'codemod',
      parseOptions: { ignoreStandalone: true },
    });

    return print(ast, { entityEncoding: 'raw' });
  }

  function buildTest(template: string) {
    test(`${template} is stable when printed`, function(assert) {
      assert.equal(printTransform(template), template);
    });
  }

  templates.forEach(buildTest);

  [
    '&lt; &amp; &nbsp; &gt; &copy;2018',

    // newlines after opening block
    '{{#each}}\n  <li> foo </li>\n{{/each}}',
  ].forEach(buildTest);

  test('whitespace control is preserved', function(assert) {
    let before = '\n{{~var~}}  ';
    let after = '{{~var~}}';

    assert.equal(printTransform(before), after);
  });

  test('block whitespace control is preserved', function(assert) {
    let before = '\n{{~#foo-bar~}} {{~else if x~}} {{~else~}} {{~/foo-bar~}}  ';
    let after = '{{~#foo-bar~}}{{~else if x~}}{{~else~}}{{~/foo-bar~}}';

    assert.equal(printTransform(before), after);
  });
});
