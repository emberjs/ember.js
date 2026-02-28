import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTemplateCompiler } from './helpers/load-template-compiler.js';

test('template compiler exports are available', async () => {
  const templateCompiler = await loadTemplateCompiler();

  assert.equal(typeof templateCompiler.precompile, 'function');
  assert.equal(typeof templateCompiler._buildCompileOptions, 'function');
  assert.equal(typeof templateCompiler._preprocess, 'function');
  assert.equal(typeof templateCompiler._print, 'function');
});

test('template compiler precompile returns string', async () => {
  const templateCompiler = await loadTemplateCompiler();
  let result = templateCompiler.precompile('<h1>Hello</h1>');

  assert.equal(typeof result, 'string');
});
