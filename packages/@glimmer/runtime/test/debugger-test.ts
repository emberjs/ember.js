import { UpdatableReference } from "@glimmer/object-reference";
import {
  IteratorResult,
  RenderResult,
  resetDebuggerCallback,
  setDebuggerCallback,
  Template,
} from "@glimmer/runtime";
import {
  TestDynamicScope,
  TestEnvironment,
} from "@glimmer/test-helpers";
import { Opaque } from '@glimmer/util';

let env: TestEnvironment;
let root: HTMLElement;
let result: RenderResult;
let self: UpdatableReference<Opaque>;

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = document.createElement('div');
}

function render(template: Template, context={}) {
  self = new UpdatableReference(context);
  env.begin();
  let templateIterator = template.renderLayout({ env, self, cursor: { element: root, nextSibling: null }, dynamicScope: new TestDynamicScope() });
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  return result;
}

QUnit.module("Debugger", {
  beforeEach: commonSetup,
  afterEach() {
    resetDebuggerCallback();
  }
});

QUnit.test('basic debugger statement', assert => {
  let template = compile(`{{debugger}}`);

  setDebuggerCallback((context: any, get) => {
    assert.equal(context.foo, 'bar');
    assert.ok(context.a.b.c);
    assert.equal(get('foo'), 'bar');
    assert.ok(get('a.b.c'));
  });

  render(template, {
    foo: 'bar',
    a: {
      b: {
        c: true
      }
    }
  });
});

QUnit.test('can get locals', assert => {
  let template = compile(`{{#with foo as |bar|}}{{debugger}}{{/with}}`);

  setDebuggerCallback((context: any, get) => {
    assert.equal(get('foo'), 'woot');
    assert.equal(get('bar'), 'woot');
    assert.deepEqual(get('this'), context);
  });

  render(template, {
    foo: 'woot'
  });
});
