import type { AST, src } from '@glimmer/syntax';
import { preprocess as parse } from '@glimmer/syntax';
import { guardArray } from '@glimmer-workspace/test-utils';

QUnit.module('[glimmer-syntax] Parser - Location Info');

function assertNodeType<T extends keyof AST.Nodes>(node: unknown, type: T): node is AST.Nodes[T];
function assertNodeType<T extends keyof AST.SubNodes>(
  node: unknown,
  type: T
): node is AST.SubNodes[T];
function assertNodeType(node: unknown, type: string): boolean {
  let nodeType: unknown = undefined;

  try {
    nodeType = (node as { type?: unknown } | null | undefined)?.type;
  } catch {
    // no-op
  }

  QUnit.assert.strictEqual(nodeType, type, `expected node type to be ${type}`);
  return nodeType === type;
}

const { test } = QUnit;

function locEqual(
  node: AST.Node | AST.SubNode | src.SourceSpan | null | undefined,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
  message = JSON.stringify(node)
) {
  let expected: src.SourceLocation = {
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn },
  };

  let actual: src.SourceLocation | null | undefined;

  if (node && 'type' in node) {
    actual = node.loc.toJSON();
  } else if (node && 'toJSON' in node) {
    actual = node.toJSON();
  }

  QUnit.assert.deepEqual(actual, expected, message);
}

test('programs', () => {
  let ast = parse(`
  {{#if foo}}
    {{bar}}
       {{/if}}
    `);

  locEqual(ast, 1, 0, 5, 4, 'outer program');
  let statement = ast.body[1];
  if (assertNodeType(statement, 'BlockStatement')) {
    locEqual(statement.program, 2, 13, 4, 7, 'nested program');
  }
});

test('blocks', () => {
  let ast = parse(`
  {{#if foo}}
    {{#if bar}}
        test
        {{else}}
      test
  {{/if    }}
       {{/if
      }}
    `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let [, block] = ast.body as [any, AST.BlockStatement];
  let [nestedBlock] = block.program.body as [AST.BlockStatement];
  let [nestedBlockText] = nestedBlock.program.body;
  let nestedInverse = nestedBlock.inverse;

  locEqual(block, 2, 2, 9, 8, 'outer block');
  locEqual(nestedBlock, 3, 4, 7, 13, 'nested block');
  locEqual(nestedBlockText, 4, 0, 5, 0);
  locEqual(nestedInverse as AST.Node, 5, 16, 7, 2);
});

test('mustache', () => {
  let ast = parse(`
    {{foo}}
    {{#if foo}}
      bar: {{bar
        }}
    {{/if}}
  `);

  let [, foo, , innerBlock] = ast.body;

  if (assertNodeType(innerBlock, 'BlockStatement')) {
    let [barText, bar] = innerBlock.program.body;

    locEqual(foo, 2, 4, 2, 11, 'outer mustache');
    locEqual(barText, 4, 0, 4, 11);
    locEqual(bar, 4, 11, 5, 10, 'inner mustache');
  }
});

test('element modifier', () => {
  let ast = parse(`
    <div {{bind-attr
      foo
      bar=wat}}></div>
  `);

  let el = ast.body[1];
  if (assertNodeType(el, 'ElementNode')) {
    locEqual(el.modifiers[0], 2, 9, 4, 15, 'element modifier');
  }
});

test('html elements', (assert) => {
  let ast = parse(`
    <section>
      <br>
      <div>
        <hr />
      </div>
    </section>
  `);

  let [, section] = ast.body;

  if (assertNodeType(section, 'ElementNode')) {
    locEqual(section, 2, 4, 7, 14, 'section element');
    locEqual(section.path, 2, 5, 2, 12);
    locEqual(section.path.head, 2, 5, 2, 12);
    locEqual(section.openTag, 2, 4, 2, 13, '<section>');
    locEqual(section.closeTag, 7, 4, 7, 14, '</section>');

    let [, br, , div] = section.children;

    if (assertNodeType(br, 'ElementNode')) {
      locEqual(br, 3, 6, 3, 10, 'br element');
      locEqual(br.path, 3, 7, 3, 9);
      locEqual(br.path.head, 3, 7, 3, 9);
      locEqual(br.openTag, 3, 6, 3, 10, '<section>');
      assert.strictEqual(br.closeTag, null);
    }

    if (assertNodeType(div, 'ElementNode')) {
      locEqual(div, 4, 6, 6, 12, 'div element');

      locEqual(div, 4, 6, 6, 12, 'div element');
      locEqual(div.path, 4, 7, 4, 10);
      locEqual(div.path.head, 4, 7, 4, 10);
      locEqual(div.openTag, 4, 6, 4, 11, '<div>');
      locEqual(div.closeTag, 6, 6, 6, 12, '</div>');

      let [, hr] = div.children;

      if (assertNodeType(hr, 'ElementNode')) {
        locEqual(hr, 5, 8, 5, 14, 'hr element');
        locEqual(hr.path, 5, 9, 5, 11);
        locEqual(hr.path.head, 5, 9, 5, 11);
        locEqual(hr.openTag, 5, 8, 5, 14, '<hr />');
        assert.strictEqual(hr.closeTag, null);
      }
    }
  }
});

test('various html element paths', () => {
  let ast = parse(`
    <Foo />
    <Foo.bar.baz />
    <this />
    <this.foo.bar />
    <@Foo />
    <@Foo.bar.baz />
    <:foo />
  `);

  let [, Foo, , FooDotBar, , This, , ThisDotFoo, , AtFoo, , AtFooDotBar, , NamedBlock] = ast.body;

  if (assertNodeType(Foo, 'ElementNode')) {
    locEqual(Foo.path, 2, 5, 2, 8);
    locEqual(Foo.path.head, 2, 5, 2, 8);
  }

  if (assertNodeType(FooDotBar, 'ElementNode')) {
    locEqual(FooDotBar.path, 3, 5, 3, 16);
    locEqual(FooDotBar.path.head, 3, 5, 3, 8);
  }

  if (assertNodeType(This, 'ElementNode')) {
    locEqual(This.path, 4, 5, 4, 9);
    locEqual(This.path.head, 4, 5, 4, 9);
  }

  if (assertNodeType(ThisDotFoo, 'ElementNode')) {
    locEqual(ThisDotFoo.path, 5, 5, 5, 17);
    locEqual(ThisDotFoo.path.head, 5, 5, 5, 9);
  }

  if (assertNodeType(AtFoo, 'ElementNode')) {
    locEqual(AtFoo.path, 6, 5, 6, 9);
    locEqual(AtFoo.path.head, 6, 5, 6, 9);
  }

  if (assertNodeType(AtFooDotBar, 'ElementNode')) {
    locEqual(AtFooDotBar.path, 7, 5, 7, 17);
    locEqual(AtFooDotBar.path.head, 7, 5, 7, 9);
  }

  if (assertNodeType(NamedBlock, 'ElementNode')) {
    locEqual(NamedBlock.path, 8, 5, 8, 9);
    locEqual(NamedBlock.path.head, 8, 5, 8, 9);
  }
});

test('html elements with nested blocks', (assert) => {
  let ast = parse(`
    <div>
      {{#if isSingleError}}
        Single error here!
      {{else if errors}}
        Multiple errors here!
      {{else}}
        No errors found!
      {{/if}} <p>Hi there!</p>
    </div>
  `);

  let [, div] = ast.body;
  locEqual(div, 2, 4, 10, 10, 'div element');
  if (assertNodeType(div, 'ElementNode')) {
    let [, ifBlock, , p] = div.children;
    locEqual(ifBlock, 3, 6, 9, 13, 'outer if block');
    locEqual(p, 9, 14, 9, 30, 'p');
    if (assertNodeType(ifBlock, 'BlockStatement')) {
      let inverseBlock = ifBlock.inverse;
      locEqual(inverseBlock, 5, 24, 7, 6, 'inverse block');
      assert.step('inverse block');
      assert.ok(inverseBlock, 'has inverse block');
      if (inverseBlock) {
        let [nestedIfBlock] = inverseBlock.body;
        locEqual(nestedIfBlock, 5, 6, 9, 6, 'nested if block');
        if (assertNodeType(nestedIfBlock, 'BlockStatement')) {
          let nestedIfInverseBlock = nestedIfBlock.inverse;
          assert.step('nested inverse block');
          assert.ok(nestedIfInverseBlock, 'has nested inverse block');
          if (nestedIfInverseBlock) {
            locEqual(nestedIfInverseBlock, 7, 14, 9, 6, 'nested inverse block');
          }
        }
      }
    }
  }

  assert.verifySteps(['inverse block', 'nested inverse block']);
});

test('block + newline + element ', () => {
  let ast = parse(`
    {{#if stuff}}
    {{/if}}
    <p>Hi!</p>
  `);

  let [, ifBlock, , p] = ast.body;

  locEqual(ifBlock, 2, 4, 3, 11, 'if block');
  locEqual(p, 4, 4, 4, 14, 'p element');
});

test('mustache + newline + element ', () => {
  let ast = parse(`
    {{foo}}
    <p>Hi!</p>
  `);

  let [, fooMustache, , p] = ast.body;

  locEqual(fooMustache, 2, 4, 2, 11, 'if block');
  locEqual(p, 3, 4, 3, 14, 'p element');
});

test('block with block params', () => {
  let ast = parse(`
    {{#foo as |bar bat baz|}}
      {{bar}} {{bat}} {{baz}}
    {{/foo}}
  `);

  let statement = ast.body[1];
  if (assertNodeType(statement, 'BlockStatement')) {
    let block = statement.program;

    if (assertNodeType(block.params[0], 'VarHead')) {
      locEqual(block.params[0], 2, 15, 2, 18, 'bar');
    }

    if (assertNodeType(block.params[1], 'VarHead')) {
      locEqual(block.params[1], 2, 19, 2, 22, 'bat');
    }

    if (assertNodeType(block.params[2], 'VarHead')) {
      locEqual(block.params[2], 2, 23, 2, 26, 'baz');
    }
  }
});

test('block with block params edge case: multiline', () => {
  let ast = parse(`
    {{#foo as
|bar bat
      b
a
      z|}}
      {{bar}} {{bat}} {{baz}}
    {{/foo}}
  `);

  let statement = ast.body[1];
  if (assertNodeType(statement, 'BlockStatement')) {
    let block = statement.program;

    if (assertNodeType(block.params[0], 'VarHead')) {
      locEqual(block.params[0], 3, 1, 3, 4, 'bar');
    }

    if (assertNodeType(block.params[1], 'VarHead')) {
      locEqual(block.params[1], 3, 5, 3, 8, 'bat');
    }

    if (assertNodeType(block.params[2], 'VarHead')) {
      locEqual(block.params[2], 4, 6, 4, 7, 'b');
    }

    if (assertNodeType(block.params[3], 'VarHead')) {
      locEqual(block.params[3], 5, 0, 5, 1, 'a');
    }

    if (assertNodeType(block.params[4], 'VarHead')) {
      locEqual(block.params[4], 6, 6, 6, 7, 'z');
    }
  }
});

test('block with block params edge case: block-params like params', () => {
  let ast = parse(`
    {{#foo "as |bar bat baz|" as |bar bat baz|}}
      {{bar}} {{bat}} {{baz}}
    {{/foo}}
  `);

  let statement = ast.body[1];
  if (assertNodeType(statement, 'BlockStatement')) {
    let block = statement.program;

    if (assertNodeType(block.params[0], 'VarHead')) {
      locEqual(block.params[0], 2, 34, 2, 37, 'bar');
    }

    if (assertNodeType(block.params[1], 'VarHead')) {
      locEqual(block.params[1], 2, 38, 2, 41, 'bat');
    }

    if (assertNodeType(block.params[2], 'VarHead')) {
      locEqual(block.params[2], 2, 42, 2, 45, 'baz');
    }
  }
});

test('block with block params edge case: block-params like content', () => {
  let ast = parse(`
    {{#foo as |bar bat baz|}}as |bar bat baz|{{/foo}}
  `);

  let statement = ast.body[1];
  if (assertNodeType(statement, 'BlockStatement')) {
    let block = statement.program;

    if (assertNodeType(block.params[0], 'VarHead')) {
      locEqual(block.params[0], 2, 15, 2, 18, 'bar');
    }

    if (assertNodeType(block.params[1], 'VarHead')) {
      locEqual(block.params[1], 2, 19, 2, 22, 'bat');
    }

    if (assertNodeType(block.params[2], 'VarHead')) {
      locEqual(block.params[2], 2, 23, 2, 26, 'baz');
    }
  }
});

test('element with block params', () => {
  let ast = parse(`
    <Foo as |bar bat baz|>
      {{bar}} {{bat}} {{baz}}
    </Foo>
  `);

  let element = ast.body[1];
  if (assertNodeType(element, 'ElementNode')) {
    if (assertNodeType(element.params[0], 'VarHead')) {
      locEqual(element.params[0], 2, 13, 2, 16, 'bar');
    }

    if (assertNodeType(element.params[1], 'VarHead')) {
      locEqual(element.params[1], 2, 17, 2, 20, 'bat');
    }

    if (assertNodeType(element.params[2], 'VarHead')) {
      locEqual(element.params[2], 2, 21, 2, 24, 'baz');
    }
  }
});

test('element with block params edge case: multiline', () => {
  let ast = parse(`
    <Foo as
|bar bat
      b
a
      z|>
      {{bar}} {{bat}} {{baz}}
    </Foo>
  `);

  let element = ast.body[1];
  if (assertNodeType(element, 'ElementNode')) {
    if (assertNodeType(element.params[0], 'VarHead')) {
      locEqual(element.params[0], 3, 1, 3, 4, 'bar');
    }

    if (assertNodeType(element.params[1], 'VarHead')) {
      locEqual(element.params[1], 3, 5, 3, 8, 'bat');
    }

    if (assertNodeType(element.params[2], 'VarHead')) {
      locEqual(element.params[2], 4, 6, 4, 7, 'b');
    }

    if (assertNodeType(element.params[3], 'VarHead')) {
      locEqual(element.params[3], 5, 0, 5, 1, 'a');
    }

    if (assertNodeType(element.params[4], 'VarHead')) {
      locEqual(element.params[4], 6, 6, 6, 7, 'z');
    }
  }
});

test('elment with block params edge case: block-params like attribute names', () => {
  let ast = parse(`
    <Foo as="a" async="b" as |bar bat baz|>
      {{bar}} {{bat}} {{baz}}
    </Foo>
  `);

  let element = ast.body[1];
  if (assertNodeType(element, 'ElementNode')) {
    if (assertNodeType(element.params[0], 'VarHead')) {
      locEqual(element.params[0], 2, 30, 2, 33, 'bar');
    }

    if (assertNodeType(element.params[1], 'VarHead')) {
      locEqual(element.params[1], 2, 34, 2, 37, 'bat');
    }

    if (assertNodeType(element.params[2], 'VarHead')) {
      locEqual(element.params[2], 2, 38, 2, 41, 'baz');
    }
  }
});

test('elment with block params edge case: block-params like attribute values', () => {
  let ast = parse(`
    <Foo foo="as |bar bat baz|" as |bar bat baz|>
      {{bar}} {{bat}} {{baz}}
    </Foo>
  `);

  let element = ast.body[1];
  if (assertNodeType(element, 'ElementNode')) {
    if (assertNodeType(element.params[0], 'VarHead')) {
      locEqual(element.params[0], 2, 36, 2, 39, 'bar');
    }

    if (assertNodeType(element.params[1], 'VarHead')) {
      locEqual(element.params[1], 2, 40, 2, 43, 'bat');
    }

    if (assertNodeType(element.params[2], 'VarHead')) {
      locEqual(element.params[2], 2, 44, 2, 47, 'baz');
    }
  }
});

test('element with block params edge case: block-params like content', () => {
  let ast = parse(`
    <Foo as |bar bat baz|>as |bar bat baz|</Foo>
  `);

  let element = ast.body[1];
  if (assertNodeType(element, 'ElementNode')) {
    if (assertNodeType(element.params[0], 'VarHead')) {
      locEqual(element.params[0], 2, 13, 2, 16, 'bar');
    }

    if (assertNodeType(element.params[1], 'VarHead')) {
      locEqual(element.params[1], 2, 17, 2, 20, 'bat');
    }

    if (assertNodeType(element.params[2], 'VarHead')) {
      locEqual(element.params[2], 2, 21, 2, 24, 'baz');
    }
  }
});

test('blocks with nested html elements', () => {
  let ast = parse(`
    {{#foo-bar}}<div>Foo</div>{{/foo-bar}} <p>Hi!</p>
  `);

  let block = ast.body[1];
  if (assertNodeType(block, 'BlockStatement')) {
    let [div] = block.program.body;
    locEqual(div, 2, 16, 2, 30, 'div element');
  }

  let p = ast.body[3];
  locEqual(p, 2, 43, 2, 53, 'p element');
});

test('html elements after mustache', () => {
  let ast = parse(`
    {{foo-bar}} <p>Hi!</p>
  `);

  let [, mustache, , p] = ast.body;

  locEqual(mustache, 2, 4, 2, 15, '{{foo-bar}}');
  locEqual(p, 2, 16, 2, 26, 'div element');
});

test('text', () => {
  let ast = parse(`
    foo!
    <div>blah</div>
  `);

  let [fooText, div] = ast.body;

  locEqual(fooText, 1, 0, 3, 4);
  if (assertNodeType(div, 'ElementNode')) {
    let [blahText] = div.children;
    locEqual(blahText, 3, 9, 3, 13);
  }
});

test('comment', () => {
  let ast = parse(`
    <div><!-- blah blah blah blah -->
      <!-- derp herky --><div></div>
    </div>
  `);

  let [, div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [comment1, , comment2, trailingDiv] = div.children;

    locEqual(comment1, 2, 9, 2, 37);
    locEqual(comment2, 3, 6, 3, 25);
    locEqual(trailingDiv, 3, 25, 3, 36);
  }
});

test('handlebars comment', () => {
  let ast = parse(`
    <div>{{!-- blah blah blah blah --}}
      {{!-- derp herky --}}<div></div>
    </div>
    <span {{! derpy }}></span>
  `);

  let [, div, , span] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [comment1, , comment2, trailingDiv] = div.children;
    locEqual(comment1, 2, 9, 2, 39);
    locEqual(comment2, 3, 6, 3, 27);
    locEqual(trailingDiv, 3, 27, 3, 38);
    if (assertNodeType(span, 'ElementNode')) {
      let [comment3] = span.comments;
      locEqual(span, 5, 4, 5, 30);
      locEqual(comment3, 5, 10, 5, 22);
    }
  }
});

test('element attribute', () => {
  let ast = parse(`
    <div data-foo="blah"
      data-derp="lolol"
data-barf="herpy"
  data-qux=lolnoquotes
        data-something-boolean
    data-hurky="some {{thing}} here">
      Hi, fivetanley!
    </div>
  `);

  let [, div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [dataFoo, dataDerp, dataBarf, dataQux, dataSomethingBoolean, dataHurky] = guardArray(
      { attributes: div.attributes },
      { min: 6 }
    );

    locEqual(dataFoo, 2, 9, 2, 24, 'data-foo');
    locEqual(dataDerp, 3, 6, 3, 23, 'data-derp');
    locEqual(dataBarf, 4, 0, 4, 17, 'data-barf');
    locEqual(dataQux, 5, 2, 5, 22, 'data-qux');
    locEqual(dataSomethingBoolean, 6, 8, 7, 4, 'data-something-boolean');

    locEqual(dataFoo.value, 2, 18, 2, 24, 'data-foo value');
    locEqual(dataDerp.value, 3, 16, 3, 23, 'data-derp value');
    locEqual(dataBarf.value, 4, 10, 4, 17, 'data-barf value');
    locEqual(dataQux.value, 5, 11, 5, 22, 'data-qux value');
    locEqual(dataHurky.value, 7, 15, 7, 36, 'data-hurky value');
  }
});

test('element dynamic attribute', () => {
  let ast = parse(`<img src={{blah}}>`);

  let [img] = ast.body;
  if (assertNodeType(img, 'ElementNode')) {
    let [src] = guardArray({ attributes: img.attributes }, { min: 1 });
    locEqual(src, 1, 5, 1, 17);
    let { value } = src;
    locEqual(value, 1, 9, 1, 17);
  }
});

test('concat statement', () => {
  let ast = parse(`
    <div data-foo="{{if foo
        "active"
    "inactive"
  }}
derp"
  data-bar="
foo"
  data-derp="foo
{{concat ''}}
    huzzah"
  data-qux="{{zomg}} static"
    ></div>
  `);

  let [, div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [dataFoo, dataBar, dataDerp, dataQux] = guardArray(
      { attributes: div.attributes },
      { min: 4 }
    );
    let dataFooValue = dataFoo.value;
    let dataBarValue = dataBar.value;
    let dataDerpValue = dataDerp.value;
    let dataQuxValue = dataQux.value;
    locEqual(dataFoo, 2, 9, 6, 5);
    locEqual(dataBar, 7, 2, 8, 4);
    locEqual(dataQux, 12, 2, 12, 28);
    locEqual(dataBarValue, 7, 11, 8, 4);
    locEqual(dataDerpValue, 9, 12, 11, 11);
    locEqual(dataFooValue, 2, 18, 6, 5);
    locEqual(dataQuxValue, 12, 11, 12, 28);

    if (assertNodeType(dataFooValue, 'ConcatStatement')) {
      let [inlineIf, staticDerpText] = dataFooValue.parts;
      locEqual(inlineIf, 2, 19, 5, 4);
      locEqual(staticDerpText, 5, 4, 6, 4);
    }

    if (assertNodeType(dataDerpValue, 'ConcatStatement')) {
      let [fooStaticText, concat, huzzahStaticText] = dataDerpValue.parts;
      locEqual(fooStaticText, 9, 13, 10, 0);
      locEqual(concat, 10, 0, 10, 13);
      locEqual(huzzahStaticText, 10, 13, 11, 10);
    }

    if (assertNodeType(dataQuxValue, 'ConcatStatement')) {
      let [mustacheZomg, staticStatic] = dataQuxValue.parts;
      locEqual(mustacheZomg, 12, 12, 12, 20);
      locEqual(staticStatic, 12, 20, 12, 27);
    }
  }
});

test('char references', () => {
  let ast = parse(`
    &gt;<div>&lt;<p>
      Hi, danmcclain &excl;</p>
    </div>
  `);

  let [, div] = ast.body;

  locEqual(div, 2, 8, 4, 10);
  if (assertNodeType(div, 'ElementNode')) {
    let [text1, p] = div.children;
    locEqual(text1, 2, 13, 2, 17);
    locEqual(p, 2, 17, 3, 31);

    if (assertNodeType(p, 'ElementNode')) {
      let [text2] = p.children;
      locEqual(text2, 2, 20, 3, 27);
    }
  }
});

test('whitespace control - trailing', () => {
  let ast = parse(`
  {{#if foo~}}
    <div></div>
  {{else~}}
    {{bar}}
  {{/if}}`);

  let [, ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 9, 'if block');

  if (assertNodeType(ifBlock, 'BlockStatement')) {
    let [div] = ifBlock.program.body;
    locEqual(div, 3, 4, 3, 15, 'div inside truthy if block');
  }
});

test("whitespace control - 'else if' trailing", () => {
  let ast = parse(`
  {{#if foo}}
    {{bar}}
  {{else if baz~}}
    <div></div>
  {{/if}}`);

  let [, ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 9, 'if block');
  if (assertNodeType(ifBlock, 'BlockStatement') && assertNodeType(ifBlock.inverse, 'Block')) {
    let [nestedIfBlock] = ifBlock.inverse.body;
    if (
      assertNodeType(nestedIfBlock, 'BlockStatement') &&
      assertNodeType(nestedIfBlock.program, 'Block')
    ) {
      let [div] = nestedIfBlock.program.body;
      locEqual(div, 5, 4, 5, 15, 'div inside truthy else if block');
    }
  }
});

test('whitespace control - leading', () => {
  let ast = parse(`
  {{~#if foo}}
    <div></div>
  {{~else}}
    {{bar}}
  {{~/if}}`);

  let [ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 10, 'if block');
  if (assertNodeType(ifBlock, 'BlockStatement')) {
    let [, div] = ifBlock.program.body;
    locEqual(div, 3, 4, 3, 15, 'div inside truthy if block');
  }
});
