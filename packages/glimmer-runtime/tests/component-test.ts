import { Template, RenderResult } from "glimmer-runtime";
import { BasicComponent, TestEnvironment, TestDynamicScope, equalTokens } from "glimmer-test-helpers";
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
  env.registerBasicComponent('my-component', MyComponent, "<div>{{yield}}</div>");
  root = rootElement();
}

function render(template: Template, context={}) {
  self = new UpdatableReference(opaque(context));
  result = template.render(self, env, { appendTo: root, dynamicScope: new TestDynamicScope(null) });
  assertInvariants(result);
  return result;
}

function rerender(context: Object={}) {
  self.update(opaque(context));
  result.rerender();
}

function assertInvariants(result) {
  strictEqual(result.firstNode(), root.firstChild, "The firstNode of the result is the same as the root's firstChild");
  strictEqual(result.lastNode(), root.lastChild, "The lastNode of the result is the same as the root's lastChild");
}

QUnit.module("Components", {
  setup: commonSetup
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

QUnit.skip('creating a new component', assert => {
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  render(template, { color: 'red' });

  equalTokens(root, "<div color='red'>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'>hello!</div>");
});

QUnit.skip('the component class is its context', assert => {
  env.registerBasicComponent('my-component', MyComponent, '<div><p>{{testing}}</p>{{yield}}</div>');
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  render(template, { color: 'red' });

  equalTokens(root, "<div color='red'><p>123</p>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'><p>456</p>hello!</div>");
});

QUnit.skip('attrs are available in the layout', assert => {
  env.registerBasicComponent('my-component', MyComponent, '<div><p>{{attrs.color}}</p>{{yield}}</div>');
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  render(template, { color: 'red' });

  equalTokens(root, "<div color='red'><p>red</p>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'><p>green</p>hello!</div>");
});

function testError(layout: string, expected: RegExp) {
  QUnit.skip(`'${layout}' produces an error like ${expected}`, assert => {
    env.registerBasicComponent('my-component', MyComponent, layout);
    let template = compile("<my-component>hello!</my-component>");
    assert.throws(() => render(template), expected);
  });
}

testError("<div>{{yield}}</div>nope", /non-whitespace text/);
testError("<div>{{yield}}</div><div></div>", /multiple root elements/);
testError("<div>{{yield}}</div>{{color}}", /cannot have curlies/);
testError("{{color}}", /cannot have curlies/);
testError("nope", /non-whitespace text/);
testError("", /single root element/);
