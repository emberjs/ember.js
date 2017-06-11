import { preprocess as parse, Walker, Syntax, AST } from '@glimmer/syntax';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('AST plugins can be provided to the compiler', assert => {
  assert.expect(1);

  class Plugin {
    syntax: Syntax;

    transform(program: AST.Program): AST.Program {
      assert.ok(true, 'transform was called!');
      return program;
    }
  }

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('provides syntax package as `syntax` prop if value is null', assert => {
  assert.expect(1);

  class Plugin {
    syntax: Syntax;
    transform(program: AST.Program): AST.Program {
      assert.equal(this.syntax.Walker, Walker);
      return program;
    }
  }

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('AST plugins can modify the AST', assert => {
  assert.expect(1);

  class Plugin {
    syntax: Syntax;
    transform(): AST.Program {
      return {
        type: 'Program',
        body: [],
        blockParams: [],
        isSynthetic: true,
        loc: {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 1 }
        }
      } as AST.Program;
    }
  }

  let ast = parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });

  assert.ok(ast['isSynthetic'], 'return value from AST transform is used');
});

test('AST plugins can be chained', assert => {
  assert.expect(2);

  class Plugin {
    syntax: Syntax;
    transform(): AST.Program {
      return {
        type: 'Program',
        body: [],
        blockParams: [],
        isFromFirstPlugin: true,
        loc: {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 1 }
        }
      } as AST.Program;
    }
  }

  class SecondaryPlugin {
    syntax: Syntax;
    transform(program: AST.Program) {
      assert.equal(program['isFromFirstPlugin'], true, 'AST from first plugin is passed to second');
      return {
        type: 'Program',
        body: [],
        blockParams: [],
        isFromSecondPlugin: true,
        loc: {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 1 }
        }
      } as AST.Program;
    }
  }

  let ast = parse('<div></div>', {
    plugins: {
      ast: [
        Plugin,
        SecondaryPlugin
      ]
    }
  });

  assert.equal(ast['isFromSecondPlugin'], true, 'return value from last AST transform is used');
});
