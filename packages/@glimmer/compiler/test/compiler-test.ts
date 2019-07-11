import {
  precompile,
  WireFormatDebugger,
  BuilderStatement,
  ProgramSymbols,
  buildStatements,
  Builder,
  s,
  c,
  NEWLINE,
  unicode,
} from '@glimmer/compiler';
import {
  SerializedTemplateWithLazyBlock,
  SerializedTemplate,
  SerializedTemplateBlock,
} from '@glimmer/interfaces';
import { assign, strip } from '@glimmer/util';

QUnit.module('@glimmer/compiler - compiling source to wire format');

function compile(content: string): SerializedTemplate<unknown> {
  let parsed = (JSON.parse(
    precompile(content, { meta: null })
  ) as unknown) as SerializedTemplateWithLazyBlock<unknown>;
  let block = JSON.parse(parsed.block);

  return assign({}, parsed, { block });
}

function test(desc: string, template: string, ...expectedStatements: BuilderStatement[]) {
  QUnit.test(desc, assert => {
    let actual = compile(template);

    let symbols = new ProgramSymbols();

    let statements = buildStatements(expectedStatements, symbols);

    let expected: SerializedTemplateBlock = {
      symbols: symbols.toSymbols(),
      hasEval: false,
      upvars: symbols.toUpvars(),
      statements,
    };

    let debugExpected = new WireFormatDebugger(expected).format();
    let debugActual = new WireFormatDebugger(actual.block).format();

    assert.deepEqual(debugActual, debugExpected);
  });
}

const Append = Builder.Append;
const Concat = Builder.Concat;

test('HTML text content', 'content', s`content`);

test('Text curlies', '<div>{{title}}<span>{{title}}</span></div>', [
  '<div>',
  [[Append, '^title'], ['<span>', [[Append, '^title']]]],
]);

test(
  `Smoke test (blocks don't produce 'this' fallback)`,
  `{{#with person as |name|}}{{#with this.name as |test|}}{{test}}{{/with}}{{/with}}`,
  ['#^with', ['^person'], { as: 'name' }, [['#^with', ['this.name'], { as: 'test' }, ['test']]]]
);

// test(
//   'Smoke test (integration, basic)',
//   '<div ...attributes><@foo @staticNamedArg="static" data-test1={{@outerArg}} data-test2="static" @dynamicNamedArg={{@outerArg}} /></div>',
//   [
//     '<div>',
//     { attributes: 'splat' },
//     [
//       [
//         `<@foo>`,`
//         {
//           '@staticNamedArg': s`static`,
//           'data-test1': '@outerArg',
//           'data-test2': s`static`,
//           '@dynamicNamedArg': `@outerArg`,
//         },
//       ],
//     ],
//   ]
// );

test(
  'elements',
  '<h1>hello!</h1><div>content</div>',
  ['<h1>', [s`hello!`]],
  ['<div>', [s`content`]]
);

test('attributes', "<div class='foo' id='bar'>content</div>", [
  '<div>',
  { class: s`foo`, id: s`bar` },
  [s`content`],
]);

test('data attributes', "<div data-some-data='foo'>content</div>", [
  '<div>',
  { 'data-some-data': s`foo` },
  [s`content`],
]);

test('checked attributes', "<input checked='checked'>", ['<input>', { checked: s`checked` }]);

test(
  'selected options',
  strip`
     <select>
       <option>1</option>
       <option selected>2</option>
       <option>3</option>
     </select>`,
  [
    '<select>',
    [
      s`${NEWLINE}  `,
      ['<option>', [s`1`]],
      s`${NEWLINE}  `,
      ['<option>', { selected: true }, [s`2`]],
      s`${NEWLINE}  `,
      ['<option>', [s`3`]],
      s`${NEWLINE}`,
    ],
  ]
);

test(
  'multi-select options',
  strip`
     <select multiple>
       <option>1</option>
       <option selected>2</option>
       <option selected>3</option>
     </select>`,

  [
    '<select>',
    { multiple: true },
    [
      s`${NEWLINE}  `,
      ['<option>', [s`1`]],
      s`${NEWLINE}  `,
      ['<option>', { selected: true }, [s`2`]],
      s`${NEWLINE}  `,
      ['<option>', { selected: true }, [s`3`]],
      s`${NEWLINE}`,
    ],
  ]
);

let voidElements = 'area base br embed hr img input keygen link meta param source track wbr';
voidElements.split(' ').forEach(tagName => {
  test(`void ${tagName}`, `<${tagName}>`, [`<${tagName}>`, []]);
});

test(
  'nested HTML',
  "<div class='foo'><p><span id='bar' data-foo='bar'>hi!</span></p></div>&nbsp;More content",
  [
    '<div>',
    { class: s`foo` },
    [['<p>', [['<span>', { id: s`bar`, 'data-foo': s`bar` }, [s`hi!`]]]]],
  ],
  s`${unicode('00a0')}More content`
);

test('custom elements', '<use-the-platform></use-the-platform>', ['<use-the-platform>']);

test(
  'nested custom elements',
  "<use-the-platform><seriously-please data-foo='1'>Stuff <div>Here</div></seriously-please></use-the-platform>",
  [
    '<use-the-platform>',
    [['<seriously-please>', { 'data-foo': s`1` }, [s`Stuff `, ['<div>', [s`Here`]]]]],
  ]
);

test(
  'moar nested Custom Elements',
  "<use-the-platform><seriously-please data-foo='1'><wheres-the-platform>Here</wheres-the-platform></seriously-please></use-the-platform>",
  [
    '<use-the-platform>',
    [['<seriously-please>', { 'data-foo': s`1` }, [['<wheres-the-platform>', [s`Here`]]]]],
  ]
);

test(
  'Custom Elements with dynamic attributes',
  "<fake-thing><other-fake-thing data-src='extra-{{someDynamicBits}}-here' /></fake-thing>",
  [
    '<fake-thing>',
    [['<other-fake-thing>', { 'data-src': [Concat, s`extra-`, '^someDynamicBits', s`-here`] }]],
  ]
);

test('Custom Elements with dynamic content', '<x-foo><x-bar>{{derp}}</x-bar></x-foo>', [
  '<x-foo>',
  [['<x-bar>', ['^derp']]],
]);

test('helpers', '<div>{{testing title}}</div>', ['<div>', [['(^testing)', ['^title']]]]);

test(
  'Dynamic content within single custom element',
  '<x-foo>{{#if param name=hash}}Content Here{{parent}}{{/if}}</x-foo>',
  ['<x-foo>', [['#^if', ['^param'], { name: '^hash' }, [s`Content Here`, '^parent']]]]
);

test('quotes in HTML', `<div>"This is a title," we're on a boat</div>`, [
  '<div>',
  [s`"This is a title," we're on a boat`],
]);

test('backslashes in HTML', `<div>This is a backslash: \\</div>`, [
  '<div>',
  [s`This is a backslash: \\`],
]);

test('newlines in HTML', `<div>common\n\nbro</div>`, ['<div>', [s`common\n\nbro`]]);

test('empty attributes', `<div class=''>content</div>`, ['<div>', { class: s`` }, [s`content`]]);

test('helpers in string attributes', `<a href="http://{{testing 123}}/index.html">linky</a>`, [
  '<a>',
  { href: [Concat, s`http://`, ['(^testing)', [123]], s`/index.html`] },
  [s`linky`],
]);

test(`boolean attribute 'disabled'`, '<input disabled>', ['<input>', { disabled: true }]);

test(`string quoted attributes`, `<input disabled="{{isDisabled}}">`, [
  '<input>',
  { disabled: [Concat, '^isDisabled'] },
]);

test(`unquoted attributes`, `<img src={{src}}>`, ['<img>', { src: '^src' }]);

test(`dynamic attr followed by static attr`, `<div foo='{{funstuff}}' name='Alice'></div>`, [
  '<div>',
  { foo: [Concat, '^funstuff'], name: s`Alice` },
]);

test(
  `dynamic selected options`,
  strip`
    <select>
      <option>1</option>
      <option selected={{selected}}>2</option>
      <option>3</option>
    </select>`,
  [
    '<select>',
    [
      s`\n  `,
      ['<option>', [s`1`]],
      s`\n  `,
      ['<option>', { selected: '^selected' }, [s`2`]],
      s`\n  `,
      ['<option>', [s`3`]],
      s`\n`,
    ],
  ]
);

test(
  `dynamic multi-select`,
  strip`
      <select multiple>
        <option>0</option>
        <option selected={{somethingTrue}}>1</option>
        <option selected={{somethingTruthy}}>2</option>
        <option selected={{somethingUndefined}}>3</option>
        <option selected={{somethingNull}}>4</option>
        <option selected={{somethingFalse}}>5</option>
      </select>`,
  [
    '<select>',
    { multiple: true },
    [
      s`\n  `,
      ['<option>', [s`0`]],
      s`\n  `,
      ['<option>', { selected: '^somethingTrue' }, [s`1`]],
      s`\n  `,
      ['<option>', { selected: '^somethingTruthy' }, [s`2`]],
      s`\n  `,
      ['<option>', { selected: '^somethingUndefined' }, [s`3`]],
      s`\n  `,
      ['<option>', { selected: '^somethingNull' }, [s`4`]],
      s`\n  `,
      ['<option>', { selected: '^somethingFalse' }, [s`5`]],
      s`\n`,
    ],
  ]
);

test('HTML comments', `<div><!-- Just passing through --></div>`, [
  '<div>',
  [c` Just passing through `],
]);

test('curlies in HTML comments', `<div><!-- {{foo}} --></div>`, ['<div>', [c` {{foo}} `]]);

test('complex curlies in HTML comments', `<div><!-- {{foo bar baz}} --></div>`, [
  '<div>',
  [c` {{foo bar baz}} `],
]);

test(
  'handlebars blocks in HTML comments',
  `<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>`,
  ['<div>', [c` {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} `]]
);

test('top-level comments', `<!-- {{foo}} -->`, c` {{foo}} `);

test('handlebars comments', `<div>{{! Better not break! }}content</div>`, ['<div>', [s`content`]]);

test('namespaced attribute', `<svg xlink:title='svg-title'>content</svg>`, [
  '<svg>',
  { 'xlink:title': s`svg-title` },
  [s`content`],
]);

test(
  'svg href attribute with quotation marks',
  `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="{{iconLink}}"></use></svg>`,
  [
    '<svg>',
    { 'xmlns:xlink': s`http://www.w3.org/1999/xlink` },
    [['<use>', { 'xlink:href': [Concat, '^iconLink'] }]],
  ]
);

test(
  'svg href attribute without quotation marks',
  `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href={{iconLink}}></use></svg>`,

  [
    '<svg>',
    { 'xmlns:xlink': s`http://www.w3.org/1999/xlink` },
    [['<use>', { 'xlink:href': '^iconLink' }]],
  ]
);

test('<svg> tag with case-sensitive attribute', '<svg viewBox="0 0 0 0"></svg>', [
  '<svg>',
  { viewBox: s`0 0 0 0` },
]);

{
  let d = 'M 0 0 L 100 100';

  test('nested element in the SVG namespace', `<svg><path d="${d}"></path></svg>`, [
    '<svg>',
    [['<path>', { d: s`${d}` }]],
  ]);
}

test(`<foreignObject> tag is case-sensitive`, `<svg><foreignObject>Hi</foreignObject></svg>`, [
  '<svg>',
  [['<foreignObject>', [s`Hi`]]],
]);

test('svg alongside non-svg', `<svg></svg><svg></svg><div></div>`, ['<svg>'], ['<svg>'], ['<div>']);

test('svg nested in a div', `<div><svg></svg></div><div></div>`, ['<div>', [['<svg>']]], ['<div>']);

test(
  'linearGradient preserves capitalization',
  `<svg><linearGradient id="gradient"></linearGradient></svg>`,
  ['<svg>', [['<linearGradient>', { id: s`gradient` }]]]
);

test('curlies separated by content whitespace', `{{a}} {{b}}`, '^a', s` `, '^b');

test('curlies right next to each other', `<div>{{a}}{{b}}{{c}}wat{{d}}</div>`, [
  '<div>',
  ['^a', '^b', '^c', s`wat`, '^d'],
]);

test('paths', `<div>{{model.foo.bar}}<span>{{model.foo.bar}}</span></div>`, [
  '<div>',
  ['^model.foo.bar', ['<span>', ['^model.foo.bar']]],
]);

test('whitespace', `Hello {{ foo }} `, s`Hello `, '^foo', s` `);

test('double curlies', `<div>{{title}}</div>`, ['<div>', ['^title']]);

test('triple curlies', `<div>{{{title}}}</div>`, ['<div>', [[Append, '^title', true]]]);

test(
  'triple curly helpers',
  `{{{unescaped "<strong>Yolo</strong>"}}} {{escaped "<strong>Yolo</strong>"}}`,
  [Append, ['(^unescaped)', [s`<strong>Yolo</strong>`]], true],
  s` `,
  [Append, ['(^escaped)', [s`<strong>Yolo</strong>`]]]
);

test('top level triple curlies', `{{{title}}}`, [Append, '^title', true]);

test('top level table', `<table>{{{title}}}</table>`, ['<table>', [[Append, '^title', true]]]);

test(
  'X-TREME nesting',
  `{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}`,
  '^foo',
  ['<span>', ['^bar', ['<a>', ['^baz', ['<em>', ['^boo', '^brew']], '^bat']]]],
  ['<span>', [['<span>', ['^flute']]]],
  '^argh'
);

test('simple blocks', `<div>{{#if admin}}<p>{{user}}</p>{{/if}}!</div>`, [
  '<div>',
  [['#^if', ['^admin'], [['<p>', ['^user']]]], s`!`],
]);

test('nested blocks', `<div>{{#if admin}}{{#if access}}<p>{{user}}</p>{{/if}}{{/if}}!</div>`, [
  '<div>',
  [['#^if', ['^admin'], [['#^if', ['^access'], [['<p>', ['^user']]]]]], s`!`],
]);

test(
  'loops',
  `<div>{{#each people key="handle" as |p|}}<span>{{p.handle}}</span> - {{p.name}}{{/each}}</div>`,
  [
    '<div>',
    [
      [
        '#^each',
        ['^people'],
        { key: s`handle`, as: 'p' },
        [['<span>', ['p.handle']], s` - `, 'p.name'],
      ],
    ],
  ]
);

test('simple helpers', `<div>{{testing title}}</div>`, [
  '<div>',
  [[Append, ['(^testing)', ['^title']]]],
]);

test('constant negative numbers', `<div>{{testing -123321}}</div>`, [
  '<div>',
  [['(^testing)', [-123321]]],
]);

test(
  'Large numeric literals (Number.MAX_SAFE_INTEGER)',
  '<div>{{testing 9007199254740991}}</div>',
  ['<div>', [['(^testing)', [9007199254740991]]]]
);

test('Constant float numbers can render', `<div>{{testing 0.123}}</div>`, [
  '<div>',
  [['(^testing)', [0.123]]],
]);

test(
  'GH#13999 The compiler can handle simple helpers with inline null parameter',
  `<div>{{say-hello null}}</div>`,
  ['<div>', [['(^say-hello)', [null]]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with inline string literal null parameter',
  `<div>{{say-hello "null"}}</div>`,
  ['<div>', [['(^say-hello)', [s`null`]]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with inline undefined parameter',
  `<div>{{say-hello undefined}}</div>`,
  ['<div>', [['(^say-hello)', [undefined]]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with inline undefined string literal parameter',
  `<div>{{say-hello "undefined"}}</div>`,
  ['<div>', [['(^say-hello)', [s`undefined`]]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with undefined named arguments',
  `<div>{{say-hello foo=undefined}}</div>`,
  ['<div>', [['(^say-hello)', { foo: undefined }]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with undefined string named arguments',
  `<div>{{say-hello foo="undefined"}}</div>`,
  ['<div>', [['(^say-hello)', { foo: s`undefined` }]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with null named arguments',
  `<div>{{say-hello foo=null}}</div>`,
  ['<div>', [['(^say-hello)', { foo: null }]]]
);

test(
  'GH#13999 The compiler can handle simple helpers with null string named arguments',
  `<div>{{say-hello foo="null"}}</div>`,
  ['<div>', [['(^say-hello)', { foo: s`null` }]]]
);

test('Null curly in attributes', `<div class="foo {{null}}">hello</div>`, [
  '<div>',
  { class: [Concat, s`foo `, null] },
  [s`hello`],
]);

test('Null as a block argument', `{{#if null}}NOPE{{else}}YUP{{/if}}`, [
  '#^if',
  [null],
  { default: [s`NOPE`], else: [s`YUP`] },
]);

test('Sexp expressions', `<div>{{testing (testing "hello")}}</div>`, [
  '<div>',
  [['(^testing)', [['(^testing)', [s`hello`]]]]],
]);

test(
  'Multiple invocations of the same sexp',
  `<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>`,
  [
    '<div>',
    [
      [
        '(^testing)',
        [
          ['(^testing)', [s`hello`, '^foo']],
          ['(^testing)', [['(^testing)', ['^bar', s`lol`]], '^baz']],
        ],
      ],
    ],
  ]
);

test('hash arguments', `<div>{{testing first="one" second="two"}}</div>`, [
  '<div>',
  [['(^testing)', { first: s`one`, second: s`two` }]],
]);

test('params in concat attribute position', `<a href="{{testing url}}">linky</a>`, [
  '<a>',
  { href: [Concat, ['(^testing)', ['^url']]] },
  [s`linky`],
]);

test('named args in concat attribute position', `<a href="{{testing path=url}}">linky</a>`, [
  '<a>',
  { href: [Concat, ['(^testing)', { path: '^url' }]] },
  [s`linky`],
]);

test(
  'multiple helpers in concat position',
  `<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>`,
  [
    '<a>',
    {
      href: [
        Concat,
        s`http://`,
        '^foo',
        s`/`,
        ['(^testing)', ['^bar']],
        s`/`,
        ['(^testing)', [s`baz`]],
      ],
    },
    [s`linky`],
  ]
);

test('elements inside a yielded block', `{{#identity}}<div id="test">123</div>{{/identity}}`, [
  '#^identity',
  [['<div>', { id: s`test` }, [s`123`]]],
]);

test('a simple block helper with inverse', `{{#identity}}test{{else}}not shown{{/identity}}`, [
  '#^identity',
  { default: [s`test`], else: [s`not shown`] },
]);

test(
  'a more involved block',
  `{{#render-else}}Nope{{else}}<div id="test">123</div>{{/render-else}}`,
  ['#^render-else', { default: [s`Nope`], else: [['<div>', { id: s`test` }, [s`123`]]] }]
);
