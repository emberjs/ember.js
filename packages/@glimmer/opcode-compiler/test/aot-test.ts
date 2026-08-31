/* eslint-disable @typescript-eslint/no-implied-eval -- the test evaluates printed source */
import type { EvaluationContext } from '@glimmer/interfaces';
import type { SimpleDocument } from '@simple-dom/interface';
import { precompileAot } from '@glimmer/opcode-compiler/lib/aot/precompile';
import * as aotTemplate from '@glimmer/opcode-compiler/lib/aot/template';
import * as stdlibData from '@glimmer/opcode-compiler/lib/opcode-builder/stdlib-data';
import * as componentOps from '@glimmer/runtime/lib/compiled/opcodes/component';
import * as contentOps from '@glimmer/runtime/lib/compiled/opcodes/content';
import * as domOps from '@glimmer/runtime/lib/compiled/opcodes/dom';
import * as expressionOps from '@glimmer/runtime/lib/compiled/opcodes/expressions';
import * as listOps from '@glimmer/runtime/lib/compiled/opcodes/lists';
import * as vmOps from '@glimmer/runtime/lib/compiled/opcodes/vm';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler/lib/program-context';
import { artifacts } from '@glimmer/program/lib/helpers';
import { RuntimeOpImpl } from '@glimmer/program/lib/opcode';
import { runtimeOptions } from '@glimmer/runtime/lib/environment';
import { unwrapTemplate } from '@glimmer/debug-util/lib/template';

QUnit.module('@glimmer/opcode-compiler - precompileAot');

const KEYWORDS = { mut: { keyword: 'mut' } };

const MODULES: Record<string, Record<string, unknown>> = {
  '@glimmer/opcode-compiler/lib/aot/template': aotTemplate,
  '@glimmer/opcode-compiler/lib/opcode-builder/stdlib-data': stdlibData,
  '@glimmer/runtime/lib/compiled/opcodes/component': componentOps,
  '@glimmer/runtime/lib/compiled/opcodes/content': contentOps,
  '@glimmer/runtime/lib/compiled/opcodes/dom': domOps,
  '@glimmer/runtime/lib/compiled/opcodes/expressions': expressionOps,
  '@glimmer/runtime/lib/compiled/opcodes/lists': listOps,
  '@glimmer/runtime/lib/compiled/opcodes/vm': vmOps,
  '@test/keywords': KEYWORDS,
};

function evaluate(source: string, scope: Record<string, unknown> = {}) {
  let { imports, expression, factory } = precompileAot(source, {
    strictMode: true,
    lexicalScope: (name: string) => name in scope,
    keywords: ['mut'],
    lexicalKeywords: { mut: { module: '@test/keywords', name: 'mut' } },
  });

  let names = [...imports.map((imp) => imp.local), ...Object.keys(scope)];
  let values = [
    ...imports.map((imp) => {
      let module = MODULES[imp.module];
      if (module === undefined) throw new Error(`unexpected import from ${imp.module}`);
      return module[imp.name];
    }),
    ...Object.values(scope),
  ];

  let build = new Function(...names, `return (${expression});`) as (
    ...args: unknown[]
  ) => aotTemplate.AotTemplate;

  return { aot: build(...values), imports, factory };
}

function context(): EvaluationContext {
  let sharedArtifacts = artifacts();
  let options = runtimeOptions(
    { document: document as unknown as SimpleDocument },
    { isInteractive: false, enableDebugTooling: false, onTransactionCommit() {} },
    sharedArtifacts,
    null
  );

  return new EvaluationContextImpl(sharedArtifacts, (heap) => new RuntimeOpImpl(heap), options);
}

QUnit.test('static text compiles to one program with no constants but the text', (assert) => {
  let { aot, factory } = evaluate('hi ');
  let [symbols, handlers, programs, constants] = aot.block;

  assert.strictEqual(factory.module, '@glimmer/opcode-compiler/lib/aot/template');
  assert.deepEqual(symbols, []);
  assert.strictEqual(programs.length, 1);
  assert.deepEqual(constants, [[aotTemplate.VALUE, 'hi ']]);
  assert.true(handlers.length > 0, 'the text handler is listed');
  assert.strictEqual(aot.scope, undefined, 'no scope without lexical values');
});

QUnit.test('the loaded program is a valid handle in a fresh context', (assert) => {
  let { aot } = evaluate('<div class="a">{{this.x}}</div>');
  let ctx = context();
  let template = unwrapTemplate(aotTemplate.default(aot)());
  let handle = template.asLayout().compile(ctx);

  assert.strictEqual(typeof handle, 'number');
  assert.true(ctx.program.heap.entries() > 0, 'words were copied into the heap');
});

QUnit.test('nested blocks become block constants that load before their parent', (assert) => {
  let { aot } = evaluate('{{#if this.a}}yes{{else}}no{{/if}}');

  assert.true(aot.block[2].length >= 3, 'the two branches and the root are programs');
  let ctx = context();
  let handle = unwrapTemplate(aotTemplate.default(aot)()).asLayout().compile(ctx);
  assert.strictEqual(typeof handle, 'number');
});

QUnit.test('lexical scope and strict keywords are scope entries', (assert) => {
  let Foo = {};
  let { aot, imports } = evaluate('<Foo @x={{mut this.y}} />', { Foo });
  let constants = aot.block[3];
  let scope = aot.scope?.() ?? {};

  assert.deepEqual(
    constants.filter((entry) => entry[0] === aotTemplate.SCOPE),
    [
      [aotTemplate.SCOPE, 0],
      [aotTemplate.SCOPE, 1],
    ],
    'the scope entries are referenced by position'
  );
  assert.strictEqual(scope['Foo'], Foo, 'the scope value is in scope');
  assert.strictEqual(scope['mut'], KEYWORDS.mut, 'the keyword is bound to its import');
  assert.true(
    imports.some((imp) => imp.module === '@test/keywords' && imp.name === 'mut'),
    'the keyword import is listed'
  );
});

QUnit.test('a scope value that is an array stays one constant', (assert) => {
  let items = [5, 7];
  let { aot } = evaluate('{{#each items as |item|}}{{item}}{{/each}}', { items });

  assert.true(
    aot.block[3].some((entry) => entry[0] === aotTemplate.SCOPE && entry[1] === 0),
    'the array is a scope entry'
  );

  let ctx = context();
  unwrapTemplate(aotTemplate.default(aot)()).asLayout().compile(ctx);
  let pool = ctx.program.constants;
  let handle = pool.value(items);

  assert.strictEqual(pool.getValue(handle), items, 'the loader interned the array as one value');
});
