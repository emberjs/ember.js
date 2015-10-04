import { compile as defaultCompile } from "htmlbars-compiler";
import { DOMHelper, Template, RenderResult, manualElement } from "htmlbars-runtime";
import { equalTokens } from "htmlbars-test-helpers";
import { TestEnvironment } from "./support";

let env: TestEnvironment, root: Element, result: RenderResult;

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function compile(template: string) {
  return defaultCompile(template, { disableComponentGeneration: false });
}

function commonSetup() {
  env = new TestEnvironment(window.document); // TODO: Support SimpleDOM
  env.registerComponent('my-component', MyComponent, compile("<div>{{yield}}</div>"))
  root = rootElement();
}

function render(template: Template, context={}) {
  result = template.render(context, env, { appendTo: root });
  assertInvariants(result);
  return result;
}

function rerender(context: Object={}) {
  result.scope.updateSelf(context);
  result.rerender();
}

function assertInvariants(result) {
  strictEqual(result.firstNode(), root.firstChild, "The firstNode of the result is the same as the root's firstChild");
  strictEqual(result.lastNode(), root.lastChild, "The lastNode of the result is the same as the root's lastChild");
}

QUnit.module("Components", {
  beforeEach: commonSetup
});

class MyComponent {
  public attrs: { color: string };

  constructor(attrs: { color: string }) {
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

QUnit.test('creating a new component', assert => {
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  render(template, { color: 'red' });

  equalTokens(root, "<div color='red'>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'>hello!</div>");
});

QUnit.test('the component class is its context', assert => {
  env.registerComponent('my-component', MyComponent, compile('<div><p>{{testing}}</p>{{yield}}</div>'))
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  render(template, { color: 'red' });

  equalTokens(root, "<div color='red'><p>123</p>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'><p>456</p>hello!</div>");
});

QUnit.test('attrs are available in the layout', assert => {
  env.registerComponent('my-component', MyComponent, compile('<div><p>{{attrs.color}}</p>{{yield}}</div>'))
  let template = compile("<my-component color='{{color}}'>hello!</my-component>");
  let result = render(template, { color: 'red' });

  equalTokens(root, "<div color='red'><p>red</p>hello!</div>");
  rerender({ color: 'green' });
  equalTokens(root, "<div color='green'><p>green</p>hello!</div>");
});

function testError(layout: string, expected: RegExp) {
  QUnit.test(`'${layout}' produces an error like ${expected}`, assert => {
    env.registerComponent('my-component', MyComponent, compile(layout));
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