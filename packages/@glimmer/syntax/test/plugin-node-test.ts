import { preprocess as parse, Walker } from '@glimmer/syntax';

const { test } = QUnit;

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('AST plugins can be provided to the compiler', assert => {
  assert.expect(1);

  function Plugin() { }
  Plugin.prototype.transform = function() {
    assert.ok(true, 'transform was called!');
  };

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('provides syntax package as `syntax` prop if value is null', assert => {
  assert.expect(1);

  function Plugin() { }
  Plugin.prototype.transform = function() {
    assert.equal(this.syntax.Walker, Walker);
  };

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('AST plugins can modify the AST', assert => {
  assert.expect(1);

  let expected = "OOOPS, MESSED THAT UP!";

  function Plugin() { }
  Plugin.prototype.transform = function() {
    return expected;
  };

  let ast = parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });

  assert.equal(ast, expected, 'return value from AST transform is used');
});

test('AST plugins can be chained', assert => {
  assert.expect(2);

  let expected = "OOOPS, MESSED THAT UP!";

  function Plugin() { }
  Plugin.prototype.transform = function() {
    return expected;
  };

  function SecondaryPlugin() { }
  SecondaryPlugin.prototype.transform = function(ast: any) {
    assert.equal(ast, expected, 'return value from AST transform is used');

    return 'BOOM!';
  };

  let ast = parse('<div></div>', {
    plugins: {
      ast: [
        Plugin,
        SecondaryPlugin
      ]
    }
  });

  assert.equal(ast, 'BOOM!', 'return value from last AST transform is used');
});
