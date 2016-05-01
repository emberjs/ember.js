import { EvaluatedArgs, Template, RenderResult, SafeString, ValueReference } from "glimmer-runtime";
import { TestEnvironment, TestDynamicScope, equalTokens, stripTight } from "glimmer-test-helpers";
import { PathReference } from "glimmer-reference";
import { UpdatableReference } from "glimmer-object-reference";
import { Opaque } from "glimmer-util";

let hooks, root: Element;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
  root.setAttribute('debug-root', 'true');
}

function render(template: Template, context = {}, view: PathReference<Opaque> = null) {
  let options = { appendTo: root, dynamicScope: new TestDynamicScope(view) };
  self = new UpdatableReference(context);
  result = template.render(self, env, options);
  assertInvariants(result);
  return result;
}

function assertInvariants(result, msg?) {
  strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  result.rerender();
}

QUnit.module("Attributes", {
  setup: commonSetup
});

test("helpers shadow self", () => {
  env.registerHelper('foo', function() {
    return "hello";
  });

  let template = compile('<div data-test="{{foo}}"></div>');

  let context = { foo: 'bye' };
  render(template, context);

  equalTokens(root, '<div data-test="hello"></div>');

  rerender();

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bar' });

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bye' });

  equalTokens(root, '<div data-test="hello"></div>');
});
