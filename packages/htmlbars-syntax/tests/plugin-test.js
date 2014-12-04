import { preprocess } from "../htmlbars-syntax/parser";

QUnit.module('Compiler plugins: AST');


test('AST plugins can be provided to the compiler', function() {
  expect(1);

  function transform() {
    ok(true, 'transform was called!');
  }

  preprocess('<div></div>', {
    plugins: {
      ast: [ transform ]
    }
  });
});

test('AST plugins can modify the AST', function() {
  expect(1);

  var expected = "OOOPS, MESSED THAT UP!";

  function transform() {
    return expected;
  }

  var ast = preprocess('<div></div>', {
    plugins: {
      ast: [ transform ]
    }
  });

  equal(ast, expected, 'return value from AST transform is used');
});

test('AST plugins can be chained', function() {
  expect(2);

  var expected = "OOOPS, MESSED THAT UP!";

  function transform() {
    return expected;
  }

  function secondaryTransform(ast) {
    equal(ast, expected, 'return value from AST transform is used');

    return 'BOOM!';
  }

  var ast = preprocess('<div></div>', {
    plugins: {
      ast: [ 
        transform,
        secondaryTransform
      ]
    }
  });

  equal(ast, 'BOOM!', 'return value from last AST transform is used');
});
