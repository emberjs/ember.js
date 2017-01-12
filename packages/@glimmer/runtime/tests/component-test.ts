import { Simple, Template, RenderResult } from "../index";
import { BasicComponent, TestEnvironment, TestDynamicScope, equalTokens } from "@glimmer/test-helpers";
import { UpdatableReference } from "@glimmer/object-reference";
import { Opaque } from '@glimmer/util';
import { assert, module, test } from './support';

let env: TestEnvironment, root: Simple.Element, result: RenderResult, self: UpdatableReference<Opaque>;

function rootElement() {
  return env.getDOM().createElement('div');
}

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  env.registerBasicComponent('my-component', MyComponent, "<div>{{@arg1}}{{yield @yieldme}}{{@arg2}}</div>");
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

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
}

function assertInvariants(result) {
  assert.strictEqual(result.firstNode(), root.firstChild, "The firstNode of the result is the same as the root's firstChild");
  assert.strictEqual(result.lastNode(), root.lastChild, "The lastNode of the result is the same as the root's lastChild");
}

module("[glimmer-runtime] Simple Components", hooks => {
  hooks.beforeEach(() => commonSetup());

  test('creating a new component', assert => {
    let template = compile("<my-component color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red' });

    equalTokens(root, "<div color='red'>hello!</div>");
    rerender({ color: 'green' });
    equalTokens(root, "<div color='green'>hello!</div>");
  });

  test('creating a new component passing args', assert => {
    let template = compile("<my-component @arg1='hello - ' color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red' });

    equalTokens(root, "<div color='red'>hello - hello!</div>");
    rerender({ color: 'green' });
    equalTokens(root, "<div color='green'>hello - hello!</div>");
  });

  test('creating a new component passing dynamic args', assert => {
    let template = compile("<my-component @arg1={{left}} color='{{color}}'>hello!</my-component>");
    render(template, { color: 'red', left: 'left - ' });

    equalTokens(root, "<div color='red'>left - hello!</div>");
    rerender({ color: 'green', left: 'LEFT - ' });
    equalTokens(root, "<div color='green'>LEFT - hello!</div>");
  });

  test('creating a new component yielding values', assert => {
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

// class MyOtherComponent extends BasicComponent {}

// QUnit.test('creating a new component', assert => {
//   let template = compile("<my-component color='{{color}}'>hello!</my-component>");
//   render(template, { color: 'red' });

//   equalTokens(root, "<div color='red'>hello!</div>");
//   rerender({ color: 'green' });
//   equalTokens(root, "<div color='green'>hello!</div>");
// });

// QUnit.test('the component class is its context', assert => {
//   env.registerBasicComponent('my-component', MyComponent, '<div><p>{{testing}}</p>{{yield}}</div>');
//   let template = compile("<my-component @color={{color}} color='{{color}}'>hello!</my-component>");
//   render(template, { color: 'red' });

//   equalTokens(root, "<div color='red'><p>123</p>hello!</div>");
//   rerender({ color: 'green' });
//   equalTokens(root, "<div color='green'><p>456</p>hello!</div>");
// });

// QUnit.test('attrs are available in the layout', assert => {
//   env.registerBasicComponent('my-component', MyComponent, '<div><p>{{attrs.color}}</p>{{yield}}</div>');
//   let template = compile("<my-component color='{{color}}' @color={{color}}>hello!</my-component>");
//   render(template, { color: 'red' });

//   equalTokens(root, "<div color='red'><p>red</p>hello!</div>");
//   rerender({ color: 'green' });
//   equalTokens(root, "<div color='green'><p>green</p>hello!</div>");
// });

// QUnit.test('nested components', assert => {
//   env.registerBasicComponent('my-other-component', MyOtherComponent, '<p>{{yield}}</p>');
//   let template = compile('<my-component><my-other-component>{{color}}</my-other-component></my-component>');
//   render(template, { color: 'red' });

//   equalTokens(root, '<div><p>red</p></div>');
//   rerender({ color: 'green' });
//   equalTokens(root, '<div><p>green</p></div>');
// });

// function testError(layout: string, expected: RegExp) {
//   QUnit.skip(`'${layout}' produces an error like ${expected}`, assert => {
//     env.registerBasicComponent('my-component', MyComponent, layout);
//     let template = compile("<my-component>hello!</my-component>");
//     assert.throws(() => render(template), expected);
//   });
// }

// testError("<div>{{yield}}</div>nope", /non-whitespace text/);
// testError("<div>{{yield}}</div><div></div>", /multiple root elements/);
// testError("<div>{{yield}}</div>{{color}}", /cannot have curlies/);
// testError("{{color}}", /cannot have curlies/);
// testError("nope", /non-whitespace text/);
// testError("", /single root element/);
