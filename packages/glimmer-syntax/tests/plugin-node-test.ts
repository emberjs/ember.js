import { parse, Walker } from 'glimmer-syntax';

QUnit.module('[glimmer-syntax] Plugins - AST Transforms');

test('AST plugins can be provided to the compiler', function() {
  expect(1);

  function Plugin() { }
  Plugin.prototype.transform = function() {
    ok(true, 'transform was called!');
  };

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('provides syntax package as `syntax` prop if value is null', function() {
  expect(1);

  function Plugin() { }
  Plugin.prototype.transform = function() {
    equal(this.syntax.Walker, Walker);
  };

  parse('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('AST plugins can modify the AST', function() {
  expect(1);

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

  equal(ast, expected, 'return value from AST transform is used');
});

test('AST plugins can be chained', function() {
  expect(2);

  let expected = "OOOPS, MESSED THAT UP!";

  function Plugin() { }
  Plugin.prototype.transform = function() {
    return expected;
  };

  function SecondaryPlugin() { }
  SecondaryPlugin.prototype.transform = function(ast) {
    equal(ast, expected, 'return value from AST transform is used');

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

  equal(ast, 'BOOM!', 'return value from last AST transform is used');
});
