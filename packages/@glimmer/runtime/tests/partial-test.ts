import { Simple, Template, RenderResult } from "@glimmer/runtime";
import {
  BasicComponent,
  EmberishCurlyComponent,
  TestEnvironment,
  TestDynamicScope,
  equalTokens,
  equalSnapshots,
  generateSnapshot,
  strip
} from "@glimmer/test-helpers";
import { UpdatableReference } from "@glimmer/object-reference";
import { Opaque } from '@glimmer/util';

let env: TestEnvironment, root: Simple.Element, result: RenderResult, self: UpdatableReference<Opaque>;

function rootElement() {
  return env.getDOM().createElement('div');
}

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
}

function render<T>(template: Template<T>, context={}) {
  self = new UpdatableReference(context);
  env.begin();
  result = template.render(self, root, new TestDynamicScope());
  env.commit();
  assertInvariants(result);
  return result;
}

interface RerenderParams {
  assertStable: Boolean;
}

function rerender(context: any = null, params: RerenderParams = { assertStable: false }) {
  let snapshot;
  if (params.assertStable) {
    snapshot = generateSnapshot(root);
  }
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
  if (params.assertStable) {
    equalSnapshots(generateSnapshot(root), snapshot);
  }
}

function assertInvariants(result) {
  strictEqual(result.firstNode(), root.firstChild, "The firstNode of the result is the same as the root's firstChild");
  strictEqual(result.lastNode(), root.lastChild, "The lastNode of the result is the same as the root's lastChild");
}

QUnit.module("Partials", {
  setup: commonSetup
});

QUnit.test('static partial with static content', assert => {
  let template = compile(`Before {{partial 'test'}} After`);

  env.registerPartial('test', `<div>Testing</div>`);
  render(template);

  equalTokens(root, `Before <div>Testing</div> After`);
  rerender(null, { assertStable: true });
  equalTokens(root, `Before <div>Testing</div> After`);
});

QUnit.test('static partial with self reference', assert => {
  let template = compile(`{{partial 'birdman'}}`);

  env.registerPartial('birdman', `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`);
  render(template, { item: 'name' });

  rerender(null, { assertStable: true });

  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ item: 'name' }, { assertStable: true });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('static partial with local reference', assert => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial 'test'}}. {{/each}}`);

  env.registerPartial('test', `You {{quality.value}}`);
  render(template, { qualities: [{id: 1, value: 'smaht'}, {id: 2, value: 'loyal'}] });

  rerender(null, { assertStable: true });

  equalTokens(root, `You smaht. You loyal. `);
  rerender({ qualities: [{id: 1, value: 'smaht'}, {id: 2, value: 'loyal'}] }, { assertStable: true });
  equalTokens(root, `You smaht. You loyal. `);
});

QUnit.test('static partial with named arguments', assert => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>{{@foo}}-{{partial 'test'}}</p>`);

  let template = compile(`<foo-bar @foo={{foo}} @bar={{bar}} />`);

  env.registerPartial('test', `{{@foo}}-{{@bar}}`);
  render(template, { foo: 'foo', bar: 'bar' });
  equalTokens(root, `<p>foo-foo-bar</p>`);

  rerender(null, { assertStable: true });

  rerender({ foo: 'FOO', bar: 'BAR' }, { assertStable: true });
  equalTokens(root, `<p>FOO-FOO-BAR</p>`);

  rerender({ foo: 'foo', bar: 'bar' }, { assertStable: true });
  equalTokens(root, `<p>foo-foo-bar</p>`);
});

QUnit.test('static partial with has-block in basic component', assert => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  env.registerBasicComponent('foo-bar-baz', BasicComponent, `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`);
  env.registerPartial('test', `{{has-block}}-{{has-block 'inverse'}}`);

  render(compile(strip`
    <foo-bar>a block</foo-bar>
    <foo-bar />
    <foo-bar-baz>a block</foo-bar-baz>
    <foo-bar-baz />
  `));

  equalTokens(root, strip`
    <p>true-false</p>
    <p>true-false</p>
    <p>true-false-true-false</p>
    <p>true-false-true-false</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block in curly component', assert => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  env.registerEmberishCurlyComponent('foo-bar', TaglessComponent as any, `<p>{{partial 'test'}}</p>`);
  env.registerEmberishCurlyComponent('foo-bar-baz', TaglessComponent as any, `<p>{{partial 'test'}}-{{has-block}}-{{has-block 'inverse'}}</p>`);
  env.registerPartial('test', `{{has-block}}-{{has-block 'inverse'}}`);

  render(compile(strip`
    {{#foo-bar}}a block{{/foo-bar}}
    {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz}}a block{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `));

  equalTokens(root, strip`
    <p>true-false</p>
    <p>true-true</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>true-true-true-true</p>
    <p>false-false-false-false</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block-params in basic component', assert => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  env.registerBasicComponent('foo-bar-baz', BasicComponent, `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`);
  env.registerPartial('test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

  render(compile(strip`
    <foo-bar as |x|>a block</foo-bar>
    <foo-bar>a block</foo-bar>
    <foo-bar />
    <foo-bar-baz as |x|>a block</foo-bar-baz>
    <foo-bar-baz>a block</foo-bar-baz>
    <foo-bar-baz />
  `));

  equalTokens(root, strip`
    <p>true-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with has-block-params in curly component', assert => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  env.registerEmberishCurlyComponent('foo-bar', TaglessComponent as any, `<p>{{partial 'test'}}</p>`);
  env.registerEmberishCurlyComponent('foo-bar-baz', TaglessComponent as any, `<p>{{partial 'test'}}-{{has-block-params}}-{{has-block-params "inverse"}}</p>`);
  env.registerPartial('test', `{{has-block-params}}-{{has-block-params "inverse"}}`);

  render(compile(strip`
    {{#foo-bar as |x|}}a block{{/foo-bar}}
    {{#foo-bar}}a block{{else}}inverse{{/foo-bar}}
    {{#foo-bar}}a block{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz as |x|}}a block{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{else}}inverse{{/foo-bar-baz}}
    {{#foo-bar-baz}}a block{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `));

  equalTokens(root, strip`
    <p>true-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>false-false</p>
    <p>true-false-true-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
    <p>false-false-false-false</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with yield in basic component', assert => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>{{partial 'test'}}</p>`);
  env.registerBasicComponent('foo-bar-baz', BasicComponent, `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`);
  env.registerPartial('test', `{{yield "partial"}}-{{yield to='inverse'}}`);

  render(compile(strip`
    <foo-bar as |source|>from {{source}}</foo-bar>
    <foo-bar />
    <foo-bar-baz as |source|>from {{source}}</foo-bar-baz>
    <foo-bar-baz />
  `));

  equalTokens(root, strip`
    <p>from partial-</p>
    <p>-</p>
    <p>from partial--from layout-</p>
    <p>---</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('static partial with yield in curly component', assert => {
  class TaglessComponent extends EmberishCurlyComponent {
    tagName = '';
  }

  env.registerEmberishCurlyComponent('foo-bar', TaglessComponent as any, `<p>{{partial 'test'}}</p>`);
  env.registerEmberishCurlyComponent('foo-bar-baz', TaglessComponent as any, `<p>{{partial 'test'}}-{{yield "layout"}}-{{yield to='inverse'}}</p>`);
  env.registerPartial('test', `{{yield "partial"}}-{{yield to='inverse'}}`);

  render(compile(strip`
    {{#foo-bar as |source|}}from {{source}}{{/foo-bar}}
    {{#foo-bar as |source|}}from {{source}}{{else}}inverse{{/foo-bar}}
    {{foo-bar}}
    {{#foo-bar-baz as |source|}}from {{source}}{{/foo-bar-baz}}
    {{#foo-bar-baz as |source|}}from {{source}}{{else}}inverse{{/foo-bar-baz}}
    {{foo-bar-baz}}
  `));

  equalTokens(root, strip`
    <p>from partial-</p>
    <p>from partial-inverse</p>
    <p>-</p>
    <p>from partial--from layout-</p>
    <p>from partial-inverse-from layout-inverse</p>
    <p>---</p>
  `);

  rerender(null, { assertStable: true });
});

QUnit.test('dynamic partial with static content', assert => {
  let template = compile(`Before {{partial name}} After`);

  env.registerPartial('test', `<div>Testing</div>`);
  render(template, { name: 'test' });

  equalTokens(root, `Before <div>Testing</div> After`);
  rerender({ name: 'test' }, { assertStable: true });
  equalTokens(root, `Before <div>Testing</div> After`);
});

QUnit.test('nested dynamic partial with dynamic content', assert => {
  let template = compile(`Before {{partial name}} After`);

  env.registerPartial('test', `<div>Testing {{wat}} {{partial nest}}</div>`);
  env.registerPartial('nested', `<div>Nested {{lol}}</div>`);

  render(template, { name: 'test', nest: 'nested', wat: 'wat are', lol: 'you doing?' });

  equalTokens(root, `Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
  rerender({ name: 'test', nest: 'nested', wat: 'wat are', lol: 'you doing?' }, { assertStable: true });
  equalTokens(root, `Before <div>Testing wat are <div>Nested you doing?</div></div> After`);
});

QUnit.test('dynamic partial with falsy value does not render', assert => {
  let template = compile(`Before {{partial name}} After`);

  render(template, { name: false });

  equalTokens(root, `Before <!----> After`);
  rerender({ name: false }, { assertStable: true });
  equalTokens(root, `Before <!----> After`);
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

QUnit.test('dynamic partial with can change from falsy to real template', assert => {
  let template = compile(`Before {{partial name}} After`);
  env.registerPartial('test', `<div>Testing</div>`);

  render(template, { name: false });

  equalTokens(root, `Before <!----> After`);
  rerender({ name: false }, { assertStable: true });

  rerender({ name: 'test' });
  equalTokens(root, `Before <div>Testing</div> After`);

  rerender({ name: false });
  equalTokens(root, `Before <!----> After`);

  rerender({ name: 'test' });
  equalTokens(root, `Before <div>Testing</div> After`);

  rerender({ name: null });
  equalTokens(root, `Before <!----> After`);

  rerender({ name: 'test' });
  equalTokens(root, `Before <div>Testing</div> After`);

  rerender({ name: undefined });
  equalTokens(root, `Before <!----> After`);
});

QUnit.test('dynamic partial with self reference', assert => {
  let template = compile(`{{partial name}}`);

  env.registerPartial('test', `I know {{item}}. I have the best {{item}}s.`);
  render(template, { name: 'test', item: 'partial' });

  equalTokens(root, `I know partial. I have the best partials.`);
  rerender({ name: 'test', item: 'partial' }, { assertStable: true });
  equalTokens(root, `I know partial. I have the best partials.`);
});

QUnit.test('changing dynamic partial with self reference', assert => {
  let template = compile(`{{partial name}}`);

  env.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
  env.registerPartial('birdman', `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`);
  render(template, { name: 'weezy', item: 'name' });

  equalTokens(root, `Ain't my birthday but I got my name on the cake.`);
  rerender({ name: 'birdman', item: 'name' });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', item: 'name' }, { assertStable: true });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('changing dynamic partial and changing reference values', assert => {
  let template = compile(`{{partial name}}`);

  env.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
  env.registerPartial('birdman', `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`);
  render(template, { name: 'weezy', item: 'partial' });

  equalTokens(root, `Ain't my birthday but I got my partial on the cake.`);
  rerender({ name: 'birdman', item: 'name' });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', item: 'name' }, { assertStable: true });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('changing dynamic partial and changing references', assert => {
  let template = compile(`{{partial name}}`);

  env.registerPartial('weezy', `Ain't my birthday but I got my {{item}} on the cake.`);
  env.registerPartial('birdman', `Respeck my {{noun}}. When my {{noun}} come up put some respeck on it.`);
  render(template, { name: 'weezy', item: 'partial' });

  equalTokens(root, `Ain't my birthday but I got my partial on the cake.`);
  rerender({ name: 'birdman', noun: 'name' });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ name: 'birdman', noun: 'name' }, { assertStable: true });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.skip('FIXME (bug?) dynamic partial with local reference', assert => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial name}}. {{/each}}`);

  env.registerPartial('test', `You {{quality}}`);
  render(template, { name: 'test', qualities: ['smaht', 'loyal'] });

  equalTokens(root, `You smaht. You loyal. `);
  rerender({ name: 'test', qualities: ['smaht', 'loyal'] }, { assertStable: true });
  equalTokens(root, `You smaht. You loyal. `);
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
