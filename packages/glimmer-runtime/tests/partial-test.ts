import { Template, RenderResult } from "glimmer-runtime";
import {
  TestEnvironment,
  TestDynamicScope,
  equalTokens,
  equalSnapshots,
  generateSnapshot,
  strip
} from "glimmer-test-helpers";
import { UpdatableReference } from "glimmer-object-reference";
import { Opaque, opaque } from 'glimmer-util';

let env: TestEnvironment, root: Element, result: RenderResult, self: UpdatableReference<Opaque>;

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
}

function render(template: Template, context={}) {
  self = new UpdatableReference(opaque(context));
  result = template.render(self, env, { appendTo: root, dynamicScope: new TestDynamicScope(null) });
  assertInvariants(result);
  return result;
}

interface RerenderParams {
  assertStable: Boolean;
}

function rerender(context: Object = {}, params: RerenderParams = { assertStable: false }) {
  let snapshot;
  if (params.assertStable) {
    snapshot = generateSnapshot(root);
  }
  self.update(opaque(context));
  result.rerender();
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
  rerender({}, { assertStable: true });
  equalTokens(root, `Before <div>Testing</div> After`);
});

QUnit.test('static partial with self reference', assert => {
  let template = compile(`{{partial 'birdman'}}`);

  env.registerPartial('birdman', `Respeck my {{item}}. When my {{item}} come up put some respeck on it.`);
  render(template, { item: 'name' });

  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
  rerender({ item: 'name' }, { assertStable: true });
  equalTokens(root, `Respeck my name. When my name come up put some respeck on it.`);
});

QUnit.test('static partial with local reference', assert => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial 'test'}}. {{/each}}`);

  env.registerPartial('test', `You {{quality.value}}`);
  render(template, { qualities: [{id: 1, value: 'smaht'}, {id: 2, value: 'loyal'}] });

  equalTokens(root, `You smaht. You loyal. `);
  rerender({ qualities: [{id: 1, value: 'smaht'}, {id: 2, value: 'loyal'}] }, { assertStable: true });
  equalTokens(root, `You smaht. You loyal. `);
});

QUnit.test('dynamic partial with static content', assert => {
  let template = compile(`Before {{partial name}} After`);

  env.registerPartial('test', `<div>Testing</div>`);
  render(template, { name: 'test' });

  equalTokens(root, `Before <div>Testing</div> After`);
  rerender({ name: 'test' }, { assertStable: true });
  equalTokens(root, `Before <div>Testing</div> After`);
});

QUnit.test('dynamic partial with falsy value does not render', assert => {
  let template = compile(`Before {{partial name}} After`);

  render(template, { name: false });

  equalTokens(root, `Before <!----> After`);
  rerender({ name: false }, { assertStable: true });
  equalTokens(root, `Before <!----> After`);
});

QUnit.test('static partial that does not exist does not render', assert => {
  let template = compile(`Before {{partial 'test'}} After`);

  render(template);
  equalTokens(root, `Before <!----> After`);
  rerender({}, { assertStable: true });
  equalTokens(root, `Before <!----> After`);
});

QUnit.test('dynamic partial that does not exist does not render', assert => {
  let template = compile(`Before {{partial name}} After`);

  render(template, { name: 'illuminati' });

  equalTokens(root, `Before <!----> After`);
  rerender({ name: false });
  equalTokens(root, `Before <!----> After`);
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

QUnit.test('dynamic partial with local reference', assert => {
  let template = compile(`{{#each qualities key='id' as |quality|}}{{partial name}}. {{/each}}`);

  env.registerPartial('test', `You {{quality}}`);
  render(template, { name: 'test', qualities: ['smaht', 'loyal'] });

  equalTokens(root, `You smaht. You loyal. `);
  rerender({ name: 'test', qualities: ['smaht', 'loyal'] }, { assertStable: true });
  equalTokens(root, `You smaht. You loyal. `);
});

QUnit.test('partial without arguments throws', assert => {
  let template = compile(`Before {{partial}} After`);

  assert.throws(function() {
    render(template);
  }, strip`Partial found with no arguments. You must specify a template.`);
});

QUnit.test('partial with more than one argument throws', assert => {
  let template = compile(`Before {{partial 'turnt' 'up'}} After`);

  assert.throws(function() {
    render(template);
  }, strip`Partial found with more than one argument. You can only specify a single template.`);
});
