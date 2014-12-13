import Walker from "../htmlbars-syntax/walker";
import { preprocess } from "../htmlbars-syntax/parser";

QUnit.module('Compiler plugins: AST');


test('AST plugins can be provided to the compiler', function() {
  expect(1);

  function Plugin() { }
  Plugin.prototype.transform = function() {
    ok(true, 'transform was called!');
  };

  preprocess('<div></div>', {
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

  preprocess('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });
});

test('AST plugins can modify the AST', function() {
  expect(1);

  var expected = "OOOPS, MESSED THAT UP!";

  function Plugin() { }
  Plugin.prototype.transform = function() {
    return expected;
  };

  var ast = preprocess('<div></div>', {
    plugins: {
      ast: [ Plugin ]
    }
  });

  equal(ast, expected, 'return value from AST transform is used');
});

test('AST plugins can be chained', function() {
  expect(2);

  var expected = "OOOPS, MESSED THAT UP!";

  function Plugin() { }
  Plugin.prototype.transform = function() {
    return expected;
  };

  function SecondaryPlugin() { }
  SecondaryPlugin.prototype.transform = function(ast) {
    equal(ast, expected, 'return value from AST transform is used');

    return 'BOOM!';
  };

  var ast = preprocess('<div></div>', {
    plugins: {
      ast: [ 
        Plugin,
        SecondaryPlugin
      ]
    }
  });

  equal(ast, 'BOOM!', 'return value from last AST transform is used');
});
