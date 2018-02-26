import { compile } from '../../index';

QUnit.module('ember-template-compiler: input type syntax');

QUnit.test('Can compile an {{input}} helper that has a sub-expression value as its type', function() {
  expect(0);

  compile(`{{input type=(if true 'password' 'text')}}`);
});

QUnit.test('Can compile an {{input}} helper with a string literal type', function() {
  expect(0);

  compile(`{{input type='text'}}`);
});

QUnit.test('Can compile an {{input}} helper with a type stored in a var', function() {
  expect(0);

  compile(`{{input type=_type}}`);
});
