import {
  RenderResult,
  RichIteratorResult,
  SyntaxCompilationContext,
  Template,
} from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { clientBuilder, renderJitMain } from '@glimmer/runtime';
import {
  BasicComponent,
  EmberishCurlyComponent,
  equalSnapshots,
  equalTokens,
  generateSnapshot,
  JitTestContext,
  preprocess,
  registerBasicComponent,
  registerEmberishCurlyComponent,
  registerPartial,
  strip,
  TestContext,
  TestMacros,
} from '@glimmer/test-helpers';
import { SimpleNode } from '@simple-dom/interface';

let context: TestContext;
let result: RenderResult;
let self: UpdatableReference<unknown>;

function compile(template: string) {
  return preprocess(template);
}

function commonSetup() {
  context = JitTestContext();
}

function render(template: Template, state = {}) {
  self = new UpdatableReference(state);
  context.env.begin();
  let cursor = { element: context.root, nextSibling: null };

  let syntax: SyntaxCompilationContext = { program: context.program, macros: new TestMacros() };
  let compilable = template.asLayout();
  let handle = compilable.compile(syntax);

  let templateIterator = renderJitMain(
    context.runtime,
    syntax,
    self,
    clientBuilder(context.env, cursor),
    handle
  );

  let iteratorResult: RichIteratorResult<null, RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  context.env.commit();
  assertInvariants(result);
  return result;
}

interface RerenderParams {
  assertStable: Boolean;
}

function rerender(state: any = null, params: RerenderParams = { assertStable: false }) {
  let snapshot: SimpleNode[] | undefined;
  if (params.assertStable) {
    snapshot = generateSnapshot(context.root);
  }
  if (state !== null) self.update(state);
  context.env.begin();
  result.rerender();
  context.env.commit();
  if (snapshot !== undefined) {
    equalSnapshots(generateSnapshot(context.root), snapshot);
  }
}

function assertInvariants(result: RenderResult) {
  QUnit.assert.strictEqual(
    result.firstNode(),
    context.root.firstChild,
    "The firstNode of the result is the same as the context.root's firstChild"
  );
  QUnit.assert.strictEqual(
    result.lastNode(),
    context.root.lastChild,
    "The lastNode of the result is the same as the context.root's lastChild"
  );
}

QUnit.module('Partials', {
  beforeEach: commonSetup,
});

QUnit.test('static partial with static content', () => {
  let template = compile(`Before {{partial 'test'}} After`);

  registerPartial(context.registry, 'test', `<div>Testing</div>`);
  render(template);

  equalTokens(context.root, `Before <div>Testing</div> After`);
  rerender(null, { assertStable: true });
  equalTokens(context.root, `Before <div>Testing</div> After`);
});

QUnit.test('static partial with self reference', () => {
  let template = compile(`{{partial 'birdman'}}`);

  registerPartial(
    context.registry,
    'birdman',
    `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
  );
  render(template, { item: 'name' });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ item: 'name' }, { assertStable: true });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('static partial with local reference', () => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial 'test'}}. {{/each}}`);

  registerPartial(context.registry, 'test', `You {{quality.value}}`);
  render(template, { qualities: [{ id: 1, value: 'smaht' }, { id: 2, value: 'loyal' }] });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. `);
  rerender(
    { qualities: [{ id: 1, value: 'smaht' }, { id: 2, value: 'loyal' }] },
    { assertStable: true }
  );
  equalTokens(context.root, `You smaht. You loyal. `);
});

QUnit.test('static partial with local reference (unknown)', () => {
  let template = compile(
    `{{#each qualities key='@index' as |quality|}}{{partial 'test'}}. {{/each}}`
  );

  registerPartial(context.registry, 'test', `You {{quality}}`);
  render(template, { qualities: ['smaht', 'loyal'] });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. `);
  rerender({ qualities: ['smaht', 'loyal'] }, { assertStable: true });
  equalTokens(context.root, `You smaht. You loyal. `);
});

QUnit.test('static partial with named arguments', () => {
  registerBasicComponent(
    context.registry,
    'FooBar',
    BasicComponent,
    `<p>{{@foo}}-{{partial 'test'}}</p>`
  );

  let template = compile(`<FooBar @foo={{foo}} @bar={{bar}} />`);

  registerPartial(context.registry, 'test', `{{@foo}}-{{@bar}}`);
  render(template, { foo: 'foo', bar: 'bar' });
  equalTokens(context.root, `<p>foo-foo-bar</p>`);

  rerender(null, { assertStable: true });

  rerender({ foo: 'FOO', bar: 'BAR' }, { assertStable: true });
  equalTokens(context.root, `<p>FOO-FOO-BAR</p>`);

  rerender({ foo: 'foo', bar: 'bar' }, { assertStable: true });
  equalTokens(context.root, `<p>foo-foo-bar</p>`);
});

QUnit.test('static partial with has-block in basic component', () => {
  registerBasicComponent(context.registry, 'FooBar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  registerBasicComponent(
    context.registry,
    'FooBarBaz',
    BasicComponent,
    `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`
  );
  registerPartial(context.registry, 'test', `{{has-block}}-{{has-block 'inverse'}}`);

  render(
    compile(strip`
    <FooBar>a block</FooBar>
    <FooBar />
    <FooBarBaz>a block</FooBarBaz>
    <FooBarBaz />
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>true-false</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>false-false-false-false</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block in curly component', () => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar',
    TaglessComponent as any,
    `<p>{{partial 'test'}}</p>`
  );
  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar-baz',
    TaglessComponent as any,
    `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`
  );
  registerPartial(context.registry, 'test', `{{has-block}}-{{has-block 'inverse'}}`);

  render(
    compile(strip`
    {{#foo-bar}}a block{{/foo-bar}}
    {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz}}a block{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>true-false</p>
    <p>true-true</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>true-true-true-true</p>
    <p>false-false-false-false</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block-params in basic component', () => {
  registerBasicComponent(context.registry, 'FooBar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  registerBasicComponent(
    context.registry,
    'FooBarBaz',
    BasicComponent,
    `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`
  );
  registerPartial(context.registry, 'test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

  render(
    compile(strip`
    <FooBar as |x|>a block</FooBar>
    <FooBar>a block</FooBar>
    <FooBar />
    <FooBarBaz as |x|>a block</FooBarBaz>
    <FooBarBaz>a block</FooBarBaz>
    <FooBarBaz />
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>true-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block-params in curly component', () => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar',
    TaglessComponent as any,
    `<p>{{partial 'test'}}</p>`
  );
  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar-baz',
    TaglessComponent as any,
    `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`
  );
  registerPartial(context.registry, 'test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

  render(
    compile(strip`
    {{#foo-bar as |x|}}a block{{/foo-bar}}
    {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
    {{#foo-bar}}a block{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz as |x|}}a block{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>true-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with yield in basic component', () => {
  registerBasicComponent(context.registry, 'FooBar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  registerBasicComponent(
    context.registry,
    'FooBarBaz',
    BasicComponent,
    `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`
  );
  registerPartial(context.registry, 'test', `{{yield "partial"}}-{{yield to='inverse'}}`);

  render(
    compile(strip`
    <FooBar as |source|>from {{source}}</FooBar>
    <FooBar />
    <FooBarBaz as |source|>from {{source}}</FooBarBaz>
    <FooBarBaz />
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>from partial-</p>
    <p>-</p>
    <p>from partial--from layout-</p>
    <p>---</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with yield in curly component', () => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar',
    TaglessComponent as any,
    `<p>{{partial 'test'}}</p>`
  );
  registerEmberishCurlyComponent(
    context.registry,
    'foo-bar-baz',
    TaglessComponent as any,
    `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`
  );
  registerPartial(context.registry, 'test', `{{yield "partial"}}-{{yield to='inverse'}}`);

  render(
    compile(strip`
    {{#foo-bar as |source|}}from {{source}}{{/foo-bar}}
    {{#foo-bar as |source|}}from {{source}}{{else}}inverse{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz as |source|}}from {{source}}{{/foo-bar-baz}}
    {{#foo-bar-baz as |source|}}from {{source}}{{else}}inverse{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `)
  );

  equalTokens(
    context.root,
    strip`
    <p>from partial-</p>
    <p>from partial-inverse</p>
    <p>-</p>
    <p>from partial--from layout-</p>
    <p>from partial-inverse-from layout-inverse</p>
    <p>---</p>
  `
  );

  rerender(null, { assertStable: true });
});

QUnit.test('dynamic partial with static content', () => {
  let template = compile(`Before {{partial name}} After`);

  registerPartial(context.registry, 'test', `<div>Testing</div>`);
  render(template, { name: 'test' });

  equalTokens(context.root, `Before <div>Testing</div> After`);
  rerender({ name: 'test' }, { assertStable: true });
  equalTokens(context.root, `Before <div>Testing</div> After`);
});

QUnit.test('nested dynamic partial with dynamic content', () => {
  let template = compile(`Before {{partial name}} After`);

  registerPartial(context.registry, 'test', `<div>Testing {{wat}} {{partial nest}}</div>`);
  registerPartial(context.registry, 'nested', `<div>Nested {{lol}}</div>`);

  render(template, { name: 'test', nest: 'nested', wat: 'wat are', lol: 'you doing?' });

  equalTokens(context.root, `Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
  rerender(
    { name: 'test', nest: 'nested', wat: 'wat are', lol: 'you doing?' },
    { assertStable: true }
  );
  equalTokens(context.root, `Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
});

QUnit.test('nested partials within nested `{{#with}}` blocks', () => {
  let template = compile(
    `Hi {{person1}}. {{#with 'Sophie' as |person1|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person2-partial'}}{{/with}}`
  );

  registerPartial(
    context.registry,
    'person2-partial',
    `{{#with 'Ben' as |person2|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person3-partial'}}{{/with}}`
  );
  registerPartial(
    context.registry,
    'person3-partial',
    `{{#with 'Alex' as |person3|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}. {{partial 'person4-partial'}}{{/with}}`
  );
  registerPartial(
    context.registry,
    'person4-partial',
    `{{#with 'Sarah' as |person4|}}Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}.{{/with}}`
  );

  render(template, {
    person1: 'Context1',
    person2: 'Context2',
    person3: 'Context3',
    person4: 'Context4',
    age: 0,
  });

  equalTokens(
    context.root,
    `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
  );

  rerender(
    {
      person1: 'Context1',
      person2: 'Context2',
      person3: 'Context3',
      person4: 'Context4',
      age: 0,
    },
    { assertStable: true }
  );

  equalTokens(
    context.root,
    `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
  );

  rerender({
    person1: 'UpdatedContext1',
    person2: 'UpdatedContext2',
    person3: 'UpdatedContext3',
    person4: 'UpdatedContext4',
    age: 1,
  });

  equalTokens(
    context.root,
    `Hi UpdatedContext1. Hi Sophie (aged 1), UpdatedContext2, UpdatedContext3 and UpdatedContext4. Hi Sophie (aged 1), Ben, UpdatedContext3 and UpdatedContext4. Hi Sophie (aged 1), Ben, Alex and UpdatedContext4. Hi Sophie (aged 1), Ben, Alex and Sarah.`
  );

  rerender({
    person1: 'Context1',
    person2: 'Context2',
    person3: 'Context3',
    person4: 'Context4',
    age: 0,
  });

  equalTokens(
    context.root,
    `Hi Context1. Hi Sophie (aged 0), Context2, Context3 and Context4. Hi Sophie (aged 0), Ben, Context3 and Context4. Hi Sophie (aged 0), Ben, Alex and Context4. Hi Sophie (aged 0), Ben, Alex and Sarah.`
  );
});

QUnit.test('dynamic partial with falsy value does not render', () => {
  let template = compile(`Before {{partial name}} After`);

  render(template, { name: false });

  equalTokens(context.root, `Before <!----> After`);
  rerender({ name: false }, { assertStable: true });
  equalTokens(context.root, `Before <!----> After`);
});

QUnit.test('static partial that does not exist asserts', assert => {
  let template = compile(`Before {{partial 'test'}} After`);

  assert.throws(() => {
    render(template);
  }, /Could not find a partial named "test"/);
});

QUnit.test('dynamic partial that does not exist does not render', assert => {
  let template = compile(`Before {{partial name}} After`);

  assert.throws(() => {
    render(template, { name: 'illuminati' });
  }, /Could not find a partial named "illuminati"/);
});

QUnit.test('dynamic partial with can change from falsy to real template', () => {
  let template = compile(`Before {{partial name}} After`);
  registerPartial(context.registry, 'test', `<div>Testing</div>`);

  render(template, { name: false });

  equalTokens(context.root, `Before <!----> After`);
  rerender({ name: false }, { assertStable: true });

  rerender({ name: 'test' });
  equalTokens(context.root, `Before <div>Testing</div> After`);

  rerender({ name: false });
  equalTokens(context.root, `Before <!----> After`);

  rerender({ name: 'test' });
  equalTokens(context.root, `Before <div>Testing</div> After`);

  rerender({ name: null });
  equalTokens(context.root, `Before <!----> After`);

  rerender({ name: 'test' });
  equalTokens(context.root, `Before <div>Testing</div> After`);

  rerender({ name: undefined });
  equalTokens(context.root, `Before <!----> After`);
});

QUnit.test('dynamic partial with self reference', () => {
  let template = compile(`{{partial name}}`);

  registerPartial(context.registry, 'test', `I know {{item}}. I have the best {{item}}s.`);
  render(template, { name: 'test', item: 'partial' });

  equalTokens(context.root, `I know partial. I have the best partials.`);
  rerender({ name: 'test', item: 'partial' }, { assertStable: true });
  equalTokens(context.root, `I know partial. I have the best partials.`);
});

QUnit.test('changing dynamic partial with self reference', () => {
  let template = compile(`{{partial name}}`);

  registerPartial(
    context.registry,
    'weezy',
    `Ain't my birthday but I got my {{item}} on the cake.`
  );
  registerPartial(
    context.registry,
    'birdman',
    `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
  );
  render(template, { name: 'weezy', item: 'name' });

  equalTokens(context.root, `Ain't my birthday but I got my name on the cake.`);
  rerender({ name: 'birdman', item: 'name' });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', item: 'name' }, { assertStable: true });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('changing dynamic partial and changing reference values', () => {
  let template = compile(`{{partial name}}`);

  registerPartial(
    context.registry,
    'weezy',
    `Ain't my birthday but I got my {{item}} on the cake.`
  );
  registerPartial(
    context.registry,
    'birdman',
    `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`
  );
  render(template, { name: 'weezy', item: 'partial' });

  equalTokens(context.root, `Ain't my birthday but I got my partial on the cake.`);
  rerender({ name: 'birdman', item: 'name' });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', item: 'name' }, { assertStable: true });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('changing dynamic partial and changing references', () => {
  let template = compile(`{{partial name}}`);

  registerPartial(
    context.registry,
    'weezy',
    `Ain't my birthday but I got my {{item}} on the cake.`
  );
  registerPartial(
    context.registry,
    'birdman',
    `Respeck my {{noun}}. When my {{noun}} come up put some respeck on it.`
  );
  render(template, { name: 'weezy', item: 'partial' });

  equalTokens(context.root, `Ain't my birthday but I got my partial on the cake.`);
  rerender({ name: 'birdman', noun: 'name' });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', noun: 'name' }, { assertStable: true });
  equalTokens(context.root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('dynamic partial with local reference', () => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial name}}. {{/each}}`);

  registerPartial(context.registry, 'test', `You {{quality.value}}`);
  render(template, {
    name: 'test',
    qualities: [{ id: 1, value: 'smaht' }, { id: 2, value: 'loyal' }],
  });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. `);
  rerender(
    { name: 'test', qualities: [{ id: 1, value: 'smaht' }, { id: 2, value: 'loyal' }] },
    { assertStable: true }
  );
  equalTokens(context.root, `You smaht. You loyal. `);
});

QUnit.test('dynamic partial with local reference (unknown)', () => {
  let template = compile(
    `{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`
  );

  registerPartial(context.registry, 'test', `You {{quality}}`);
  render(template, { name: 'test', qualities: ['smaht', 'loyal'] });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. `);
  rerender({ name: 'test', qualities: ['smaht', 'loyal'] }, { assertStable: true });
  equalTokens(context.root, `You smaht. You loyal. `);
});

QUnit.test('partial with if statement on a simple local reference works as expected', () => {
  let template = compile(
    `{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`
  );

  registerPartial(
    context.registry,
    'test',
    `{{#if quality}}You {{quality}}{{else}}No quality{{/if}}`
  );
  render(template, { name: 'test', qualities: ['smaht', 'loyal', undefined] });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. No quality. `);
  rerender({ name: 'test', qualities: ['smaht', 'loyal', undefined] }, { assertStable: true });
  equalTokens(context.root, `You smaht. You loyal. No quality. `);
});

QUnit.test('partial with if statement on a path local reference works as expected', () => {
  let template = compile(
    `{{#each qualities key='@index' as |quality|}}{{partial name}}. {{/each}}`
  );

  registerPartial(
    context.registry,
    'test',
    `{{#if quality.name}}You {{quality.name}}{{else}}No quality{{/if}}`
  );
  render(template, {
    name: 'test',
    qualities: [{ name: 'smaht' }, { name: 'loyal' }, { name: undefined }],
  });

  rerender(null, { assertStable: true });

  equalTokens(context.root, `You smaht. You loyal. No quality. `);
  rerender(
    { name: 'test', qualities: [{ name: 'smaht' }, { name: 'loyal' }, { name: undefined }] },
    { assertStable: true }
  );
  equalTokens(context.root, `You smaht. You loyal. No quality. `);
});

QUnit.test('partial without arguments throws', assert => {
  assert.throws(function() {
    compile(`Before {{partial}} After`);
  }, strip`Partial found with no arguments. You must specify a template name.`);
});

QUnit.test('partial with more than one argument throws', assert => {
  assert.throws(function() {
    compile(`Before {{partial 'turnt' 'up'}} After`);
  }, strip`Partial found with more than one argument. You can only specify a single template.`);
});
