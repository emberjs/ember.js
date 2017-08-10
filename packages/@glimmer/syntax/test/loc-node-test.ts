import { preprocess as parse, AST } from "..";

QUnit.module("[glimmer-syntax] Parser - Location Info");

function assertNodeType<T extends keyof AST.Nodes>(node: AST.Node | null | undefined, type: T): node is AST.Nodes[T] {
  let nodeType = node && node.type;
  QUnit.assert.pushResult({
    result: nodeType === type,
    actual: nodeType,
    expected: type,
    message: `expected node type to be ${node} but was ${nodeType}`
  });
  return nodeType === type;
}

const { test } = QUnit;

function locEqual(node: AST.Node | null | undefined, startLine: number, startColumn: number, endLine: number, endColumn: number, message = JSON.stringify(node)) {

  let expected = {
    source: null,
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn }
  };

  QUnit.assert.deepEqual(node && node.loc, expected, message);
}

test("programs", () => {
  let ast = parse(`
  {{#if foo}}
    {{bar}}
       {{/if}}
    `);

  locEqual(ast, 1, 0, 5, 4, 'outer program');
  let statement = ast.body[1];
  if (assertNodeType(statement, "BlockStatement")) {
    locEqual(statement.program, 2, 13, 4, 7, 'nested program');
  }
});

test("blocks", function() {
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

  let [,block] = ast.body as [any, AST.BlockStatement];
  let [nestedBlock] = block.program.body as [AST.BlockStatement];
  let [nestedBlockText] = nestedBlock.program.body;
  let nestedInverse = nestedBlock.inverse;

  locEqual(block, 2, 2, 9, 8, 'outer block');
  locEqual(nestedBlock, 3, 4, 7, 13, 'nested block');
  locEqual(nestedBlockText, 4, 0, 5, 0);
  locEqual(nestedInverse as AST.Node, 5, 16, 7, 2);
});

test("mustache", function() {
  let ast = parse(`
    {{foo}}
    {{#if foo}}
      bar: {{bar
        }}
    {{/if}}
  `);

  let [,foo,,innerBlock] = ast.body;

  if (assertNodeType(innerBlock, "BlockStatement")) {
    let [barText, bar] = innerBlock.program.body;

    locEqual(foo, 2, 4, 2, 11, 'outer mustache');
    locEqual(barText, 4, 0, 4, 11);
    locEqual(bar, 4, 11, 5, 10, 'inner mustache');
  }
});

test("element modifier", function() {
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

test("html elements", function() {
  let ast = parse(`
    <section>
      <br>
      <div>
        <hr />
      </div>
    </section>
  `);

  let [,section] = ast.body;
  locEqual(section, 2, 4, 7, 14, 'section element');
  if (assertNodeType(section, 'ElementNode')) {
    let [,br,,div] = section.children;
    locEqual(br, 3, 6, 3, 10, 'br element');
    locEqual(div, 4, 6, 6, 12, 'div element');
    if (assertNodeType(div, 'ElementNode')) {
      let [,hr] = div.children;

      locEqual(hr, 5, 8, 5, 14, 'hr element');
    }
  }
});

test("html elements with nested blocks", (assert) => {
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

  let [,div] = ast.body;
  locEqual(div, 2, 4, 10, 10, 'div element');
  if (assertNodeType(div, 'ElementNode')) {
    let [,ifBlock,,p] = div.children;
    locEqual(ifBlock, 3, 6, 9, 13, 'outer if block');
    locEqual(p, 9, 14, 9, 30, 'p');
    if (assertNodeType(ifBlock, 'BlockStatement')) {
      let inverseBlock = ifBlock.inverse;
      locEqual(inverseBlock, 5, 24, 7, 6, 'inverse block');
      assert.ok(inverseBlock, 'has inverse block');
      if (inverseBlock) {
        let [nestedIfBlock] = inverseBlock.body;
        locEqual(nestedIfBlock, 5, 6, 9, 6, 'nested if block');
        if (assertNodeType(nestedIfBlock, 'BlockStatement')) {
          let nestedIfInverseBlock = nestedIfBlock.inverse;
          assert.ok(nestedIfInverseBlock, 'has nested inverse block');
          if (nestedIfInverseBlock) {
            locEqual(nestedIfInverseBlock, 7, 14, 9, 6, 'nested inverse block');
          }
        }
      }
    }
  }
});

test("block + newline + element ", function() {
  let ast = parse(`
    {{#if stuff}}
    {{/if}}
    <p>Hi!</p>
  `);

  let [,ifBlock,,p] = ast.body;

  locEqual(ifBlock, 2, 4, 3, 11, 'if block');
  locEqual(p, 4, 4, 4, 14, 'p element');
});

test("mustache + newline + element ", function() {
  let ast = parse(`
    {{foo}}
    <p>Hi!</p>
  `);

  let [,fooMustache,,p] = ast.body;

  locEqual(fooMustache, 2, 4, 2, 11, 'if block');
  locEqual(p, 3, 4, 3, 14, 'p element');
});

test("blocks with nested html elements", function() {
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

test("html elements after mustache", function() {
  let ast = parse(`
    {{foo-bar}} <p>Hi!</p>
  `);

  let [,mustache,,p] = ast.body;

  locEqual(mustache, 2, 4, 2, 15, '{{foo-bar}}');
  locEqual(p, 2, 16, 2, 26, 'div element');
});

test("text", function() {
  let ast = parse(`
    foo!
    <div>blah</div>
  `);

  let [fooText,div] = ast.body;

  locEqual(fooText, 1, 0, 3, 4);
  if (assertNodeType(div, 'ElementNode')) {
    let [blahText] = div.children;
    locEqual(blahText, 3, 9, 3, 13);
  }
});

test("comment", function() {
  let ast = parse(`
    <div><!-- blah blah blah blah -->
      <!-- derp herky --><div></div>
    </div>
  `);

  let [,div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [comment1,,comment2,trailingDiv] = div.children;

    locEqual(comment1, 2, 9, 2, 37);
    locEqual(comment2, 3, 6, 3, 25);
    locEqual(trailingDiv, 3, 25, 3, 36);
  }
});

test("handlebars comment", function() {
  let ast = parse(`
    <div>{{!-- blah blah blah blah --}}
      {{!-- derp herky --}}<div></div>
    </div>
    <span {{! derpy }}></span>
  `);

  let [,div,,span] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [comment1,,comment2,trailingDiv] = div.children;
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

test("element attribute", function() {
  let ast = parse(`
    <div data-foo="blah"
      data-derp="lolol"
data-barf="herpy"
  data-qux=lolnoquotes
    data-hurky="some {{thing}} here">
      Hi, fivetanley!
    </div>
  `);

  let [,div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [dataFoo,dataDerp,dataBarf, dataQux, dataHurky] = div.attributes;

    locEqual(dataFoo, 2, 9, 2, 24);
    locEqual(dataDerp, 3, 6, 3, 23);
    locEqual(dataBarf, 4, 0, 4, 17);
    locEqual(dataQux, 5, 2, 5, 22);

    locEqual(dataFoo.value, 2, 18, 2, 24);
    locEqual(dataDerp.value, 3, 16, 3, 23);
    locEqual(dataBarf.value, 4, 10, 4, 17);
    locEqual(dataQux.value, 5, 11, 5, 22);
    locEqual(dataHurky.value, 6, 15, 6, 36);
  }
});

test("element dynamic attribute", function() {
  let ast = parse(`<img src={{blah}}>`);

  let [img] = ast.body;
  if (assertNodeType(img, 'ElementNode')) {
    let [src] = img.attributes;
    locEqual(src, 1, 5, 1, 17);
    let { value } = src;
    locEqual(value, 1, 9, 1, 17);
  }
});

test("concat statement", function() {
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
    ></div>
  `);

  let [,div] = ast.body;
  if (assertNodeType(div, 'ElementNode')) {
    let [dataFoo, dataBar, dataDerp] = div.attributes;
    let dataFooValue = dataFoo.value;
    let dataBarValue = dataBar.value;
    let dataDerpValue = dataDerp.value;
    locEqual(dataFoo, 2, 9, 6, 5);
    locEqual(dataBar, 7, 2, 8, 4);
    locEqual(dataBarValue, 7, 11, 8, 4);
    locEqual(dataDerpValue, 9, 12, 11, 11);
    locEqual(dataFooValue, 2, 18, 6, 5);

    if (assertNodeType(dataFooValue, 'ConcatStatement')) {
      let [ inlineIf, staticDerpText ] = dataFooValue.parts;
      locEqual(inlineIf, 2, 19, 5, 4);
      locEqual(staticDerpText, 5, 4, 6, 4);
    }

    if (assertNodeType(dataDerpValue, 'ConcatStatement')) {
      let [ fooStaticText, concat, huzzahStaticText ] = dataDerpValue.parts;
      locEqual(fooStaticText, 9, 14, 10, 0);
      locEqual(concat, 10, 0, 10, 13);
      locEqual(huzzahStaticText, 10, 13, 11, 10);
    }
  }
});

test("char references", function() {
  let ast = parse(`
    &gt;<div>&lt;<p>
      Hi, danmcclain &excl;</p>
    </div>
  `);

  let [,div] = ast.body;

  locEqual(div, 2, 8, 4, 10);
  if (assertNodeType(div, 'ElementNode')) {
    let [text1,p] = div.children;
    locEqual(text1, 2, 13, 2, 17);
    locEqual(p, 2, 17, 3, 31);

    if (assertNodeType(p, 'ElementNode')) {
      let [text2] = p.children;
      locEqual(text2, 2, 20, 3, 27);
    }
  }
});

test("whitespace control - trailing", function() {
  let ast = parse(`
  {{#if foo~}}
    <div></div>
  {{else~}}
    {{bar}}
  {{/if}}`);

  let [,ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 9, 'if block');

  if (assertNodeType(ifBlock, 'BlockStatement')) {
    let [div] = ifBlock.program.body;
    locEqual(div, 3, 4, 3, 15, 'div inside truthy if block');
  }
});

test("whitespace control - 'else if' trailing", function() {
  let ast = parse(`
  {{#if foo}}
    {{bar}}
  {{else if baz~}}
    <div></div>
  {{/if}}`);

  let [,ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 9, 'if block');
  if (assertNodeType(ifBlock, 'BlockStatement') && assertNodeType(ifBlock.inverse, 'Program')) {
    let [nestedIfBlock] = ifBlock.inverse.body;
    if (assertNodeType(nestedIfBlock, 'BlockStatement') && assertNodeType(nestedIfBlock.program, 'Program')) {
      let [div] = nestedIfBlock.program.body;
      locEqual(div, 5, 4, 5, 15, 'div inside truthy else if block');
    }
  }
});

test("whitespace control - leading", function() {
  let ast = parse(`
  {{~#if foo}}
    <div></div>
  {{~else}}
    {{bar}}
  {{~/if}}`);

  let [ifBlock] = ast.body;
  locEqual(ifBlock, 2, 2, 6, 10, 'if block');
  if (assertNodeType(ifBlock, 'BlockStatement')) {
    let [,div] = ifBlock.program.body;
    locEqual(div, 3, 4, 3, 15, 'div inside truthy if block');
  }
});
