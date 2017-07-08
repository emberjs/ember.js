import { UpdatableReference } from "@glimmer/object-reference";
import { IteratorResult, RenderResult, Template } from "@glimmer/runtime";
import { BasicComponent, equalTokens, TestDynamicScope, TestEnvironment } from "@glimmer/test-helpers";
import { Opaque } from '@glimmer/util';
import { assert, module, test } from './support';

let env: TestEnvironment;
let root: HTMLElement;
let result: RenderResult;
let self: UpdatableReference<Opaque>;

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  env.registerBasicComponent('my-component', MyComponent, "<div>{{@arg1}}{{yield @yieldme}}{{@arg2}}</div>");
  root = document.createElement('div');
}

function render<T>(template: Template<T>, context = {}) {
  self = new UpdatableReference(context);
  env.begin();
  let templateIterator = template.render({ self, parentNode: root, dynamicScope: new TestDynamicScope() });
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  assertInvariants(result);
  return result;
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
}

function assertInvariants(result: RenderResult) {
  assert.strictEqual(result.firstNode(), root.firstChild, "The firstNode of the result is the same as the root's firstChild");
  assert.strictEqual(result.lastNode(), root.lastChild, "The lastNode of the result is the same as the root's lastChild");
}

module("[glimmer-runtime] Simple Components", hooks => {
  hooks.beforeEach(() => commonSetup());

  test('creating a new component', () => {
    let template = compile("<my-component color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red' });

    equalTokens(root, "<div color='red'>hello!</div>");
    rerender({ color: 'green' });
    equalTokens(root, "<div color='green'>hello!</div>");
  });

  test('creating a new component passing args', () => {
    let template = compile("<my-component @arg1='hello - ' color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red' });

    equalTokens(root, "<div color='red'>hello - hello!</div>");
    rerender({ color: 'green' });
    equalTokens(root, "<div color='green'>hello - hello!</div>");
  });

  test('creating a new component passing dynamic args', () => {
    let template = compile("<my-component @arg1={{left}} color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red', left: 'left - ' });

    equalTokens(root, "<div color='red'>left - hello!</div>");
    rerender({ color: 'green', left: 'LEFT - ' });
    equalTokens(root, "<div color='green'>LEFT - hello!</div>");
  });

  test('creating a new component yielding values', () => {
    let template = compile("<my-component @arg1={{left}} @yieldme='yield me' color='{{color}}' as |yielded|>hello! {{yielded}}</my-component>");
    render(template, { color: 'red', left: 'left - ' });

    equalTokens(root, "<div color='red'>left - hello! yield me</div>");
    rerender({ color: 'green', left: 'LEFT - ' });
    equalTokens(root, "<div color='green'>LEFT - hello! yield me</div>");
  });
});

class MyComponent extends BasicComponent {
  public attrs: { color: string };

  constructor(attrs: { color: string }) {
    super(attrs);
    this.attrs = attrs;
  }

  get testing() {
    if (this.attrs.color === 'red') {
      return '123';
    } else {
      return '456';
    }
  }
}
