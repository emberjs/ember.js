import EmberObject, {
  alias
} from "glimmer-object";

import {
  Template,
  Environment,
  RenderResult,
} from "glimmer-runtime";

import {
  Attrs,
  BasicComponent,
  EmberishCurlyComponent,
  EmberishGlimmerComponent,
  TestEnvironment,
  TestDynamicScope,
  equalsElement,
  inspectHooks,
  regex,
  classes
 } from "glimmer-test-helpers";

import { assign } from "glimmer-util";

import { equalTokens, stripTight } from "glimmer-test-helpers";

import { CLASS_META, UpdatableReference, setProperty as set } from 'glimmer-object-reference';

class EmberishRootView extends EmberObject {
  private parent: Element;
  protected _result: RenderResult;
  protected template: Template;
  protected env: Environment;
  public element: Element; // provided by the component definition

  appendTo(selector: string) {
    let element = this.parent = document.querySelector(selector);
    let self = new UpdatableReference(this);
    this._result = this.template.render(self, this.env, { appendTo: element, dynamicScope: new TestDynamicScope(self) });
    this.element = element.firstElementChild;
  }

  rerender(context: Object = null) {
    if (context) {
      this.setProperties(context);
    }

    this._result.rerender();

    this.element = this.parent.firstElementChild;
  }

  destroy() {
    super.destroy();
    if (this._result) {
      this._result.destroy();
    }
  }
}

let view: EmberishRootView, env: TestEnvironment;

function module(name: string) {
  QUnit.module(`[components] ${name}`, {
    setup() {
      env = new TestEnvironment();
    }
  });
}

module("Components - generic - props");

function appendViewFor(template: string, context: Object = {}) {
  class MyRootView extends EmberishRootView {
    protected env = env;
    protected template = env.compile(template);
  }

  MyRootView[CLASS_META].seal();

  view = new MyRootView(context);

  env.begin();
  view.appendTo('#qunit-fixture');
  env.commit();

  return view;
}

function assertAppended(content: string) {
  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), content);
}

function assertFired(component: EmberishGlimmerComponent, name: string, count=1) {
  let hooks = component['hooks'];

  if (!hooks) {
    throw new TypeError("Not hooked: " + component);
  }

  if (name in hooks) {
    strictEqual(hooks[name], count, `The ${name} hook fired ${count} ${count === 1 ? 'time' : 'times'}`);
  } else {
    ok(false, `The ${name} hook fired`);
  }
}

function assertComponentElement(tagName: string, attrs: Object, contents: string);
function assertComponentElement(tagName: string, attrs: Object);
function assertComponentElement(tagName: string, contents: string);
function assertComponentElement(tagName: string);

function assertComponentElement(...args) {
  let tagName, attrs, contents;
  if (args.length === 2) {
    if (typeof args[1] === 'string') [tagName, attrs, contents] = [args[0], {}, args[1]];
    else [tagName, attrs, contents] = [args[0], args[1], null];
  } else if (args.length === 1) {
    [tagName, attrs, contents] = [args[0], {}, null];
  } else {
    [tagName, attrs, contents] = args;
  }

  equalsElement(view.element, tagName, attrs, contents);
}

function assertEmberishElement(tagName: string, attrs: Object, contents: string);
function assertEmberishElement(tagName: string, attrs: Object);
function assertEmberishElement(tagName: string, contents: string);
function assertEmberishElement(tagName: string);

function assertEmberishElement(...args) {
  let tagName, attrs, contents;
  if (args.length === 2) {
    if (typeof args[1] === 'string') [tagName, attrs, contents] = [args[0], {}, args[1]];
    else [tagName, attrs, contents] = [args[0], args[1], null];
  } else if (args.length === 1) {
    [tagName, attrs, contents] = [args[0], {}, null];
  } else {
    [tagName, attrs, contents] = args;
  }

  let fullAttrs = assign({ class: classes('ember-view'), id: regex(/^ember\d*$/) }, attrs);
  equalsElement(view.element, tagName, fullAttrs, contents);
}

function assertElementIsEmberishElement(element: Element, tagName: string, attrs: Object, contents: string);
function assertElementIsEmberishElement(element: Element, tagName: string, attrs: Object);
function assertElementIsEmberishElement(element: Element, tagName: string, contents: string);
function assertElementIsEmberishElement(element: Element, tagName: string);

function assertElementIsEmberishElement(element: Element, ...args) {
  let tagName, attrs, contents;
  if (args.length === 2) {
    if (typeof args[1] === 'string') [tagName, attrs, contents] = [args[0], {}, args[1]];
    else [tagName, attrs, contents] = [args[0], args[1], null];
  } else if (args.length === 1) {
    [tagName, attrs, contents] = [args[0], {}, null];
  } else {
    [tagName, attrs, contents] = args;
  }

  let fullAttrs = assign({ class: classes('ember-view'), id: regex(/^ember\d*$/) }, attrs);
  equalsElement(element, tagName, fullAttrs, contents);
}

function rerender() {
  view.rerender();
}

interface ComponentUpdatingTestOptions {
  context?: Object;
  expected: string | Expected;
}

interface ComponentTestOptions {
  kind?: string;
  layout: TagOptions | string;
  invokeAs?: InvokeAsOptions;
  skip?: boolean | string;
  expected: string | Expected;
  updates?: ComponentUpdatingTestOptions[];
}

interface TagOptions {
  attributes?: Object;
  args?: Object;
  blockParams?: string[];
  template?: string;
}

interface InvokeAsOptions extends TagOptions {
  context?: Object;
  inverse?: string;
}

interface Expected {
  content: string;
  attrs: Object;
};

function isExpected(expected: string | Expected): expected is Expected {
  return typeof expected === 'object';
}

// Glimmer                Curly
// foo="bar"              foo=(attr "bar")
// foo="{{bar}}"          foo=(attr bar)
// foo="bar{{baz}}bat"    foo=(attr "bar" baz "bat")
// foo="{{foo bar}}"      foo=(attr (foo bar))
// foo={{foo bar}}        foo=(foo bar)                        { glimmer: "foo bar", curly: "(foo bar)" }
// foo={{"bar"}}          foo="bar"                            '"bar"'
// foo={{bar}}            foo=bar                              "bar"
// foo={{null}}           foo=null                             "null"
// foo={{1}}              foo=1                                "1"

function testComponent(title: string, { kind, layout, invokeAs = {}, expected, skip, updates = [] }: ComponentTestOptions) {
  if (skip === true) return;

  let { attributes = {}, args = {}, context, blockParams, template, inverse } = invokeAs;

  if (!kind || kind === 'curly') {
    let test = skip === 'curly' ? QUnit.skip : QUnit.test;

    test(`curly: ${title}`, assert => {
      if (typeof layout !== 'string') throw new Error('Only string layouts are supported for curly tests');

      env.registerEmberishCurlyComponent('test-component', EmberishCurlyComponent, layout as string);
      let list = ['test-component'];

      Object.keys(attributes).forEach(key => {
        throw new Error("Cannot use attrs in a curly component test");
        // list.push(`${key}="${attrs[key]}"`);
      });

      Object.keys(args).forEach(key => {
        list.push(`${key}=${toCurly(args[key])}`);
      });

      if (blockParams) list.push(`as |${blockParams.join(' ')}|`);
      let tag = list.join(' ');
      let syntax;

      if (typeof template === 'string') {
        let inv = typeof inverse === 'string' ? `{{else}}${inverse}` : '';
        syntax = `{{#${tag}}}${template}${inv}{{/test-component}}`;
      } else {
        syntax = `{{${tag}}}`;
      }

      assert.ok(true, `generated invocation: ${syntax}`);
      let view = appendViewFor(syntax, context || {});
      assertExpected('div', expected);

      updates.forEach(update => {
        view.rerender(update.context);
        assertExpected('div', update.expected);
      });
    });
  }

  if (!kind || kind === 'curly' || kind === 'dynamic') {
    let test = skip === 'dynamic' ? QUnit.skip : QUnit.test;

    test(`curly - component helper: ${title}`, assert => {
      env.registerEmberishCurlyComponent('test-component', EmberishCurlyComponent, layout as string);
      env.registerEmberishCurlyComponent('test-component2', EmberishCurlyComponent, `${layout} -- 2`);

      let list = ['component', 'componentName'];

      Object.keys(attributes).forEach(key => {
        throw new Error("Cannot use attrs in a curly component test");
        // list.push(`${key}="${attrs[key]}"`);
      });

      Object.keys(args).forEach(key => {
        list.push(`${key}=${toCurly(args[key])}`);
      });

      if (blockParams) list.push(`as |${blockParams.join(' ')}|`);
      let tag = list.join(' ');
      let syntax;

      if (typeof template === 'string') {
        let inv = typeof inverse === 'string' ? `{{else}}${inverse}` : '';
        syntax = `{{#${tag}}}${template}${inv}{{/component}}`;
      } else {
        syntax = `{{${tag}}}`;
      }

      assert.ok(true, `generated invocation: ${syntax}`);

      let creation = assign(context || {}, { componentName: 'test-component' });
      let view = appendViewFor(syntax, creation);

      assertExpected('div', expected);

      view.rerender({ componentName: 'test-component2' });

      if (isExpected(expected)) {
        assertExpected('div', assign({}, expected, { content: `${expected.content} -- 2` }));
      } else {
        assertExpected('div', `${expected} -- 2`);
      }

      updates.forEach(update => {
        let { context, expected } = update;

        view.rerender(assign({}, context || {}, { componentName: 'test-component' }));

        assertExpected('div', expected);

        view.rerender({ componentName: 'test-component2' });

        if (isExpected(expected)) {
          assertExpected('div', assign({}, expected, { content: `${expected.content} -- 2` }));
        } else {
          assertExpected('div', `${expected} -- 2`);
        }
      });
    });
  }

  if (!kind || kind === 'glimmer') {
    let test = skip === 'glimmer' ? QUnit.skip : QUnit.test;

    test(`glimmer: ${title}`, assert => {
      eval('');
      let layoutOptions: TagOptions;

      if (typeof layout === 'string') {
        layoutOptions = { attributes: {}, args: {}, template: layout as string };
      } else {
        layoutOptions = layout;
      }

      let layoutBody = glimmerTag('aside', layoutOptions);

      env.registerEmberishGlimmerComponent('test-component', EmberishGlimmerComponent, ` ${layoutBody}<!-- hi -->`);

      let invocation = glimmerTag('test-component', invokeAs);

      assert.ok(true, `generated layout: ${layoutBody}`);
      assert.ok(true, `generated invocation: ${invocation}`);

      appendViewFor(invocation, context || {});

      assertExpected('aside', expected, attributes);

      updates.forEach(update => {
        ok(true, `Updating with ${JSON.stringify(update)}`);
        view.rerender(update.context);
        assertExpected('aside', update.expected, attributes);
      });
    });
  }
}

function glimmerTag(tagName: string, { blockParams = null, attributes = {}, args = {}, template = null }: TagOptions) {
  let list = [tagName];

  Object.keys(attributes).forEach(key => {
    list.push(`${key}="${attributes[key]}"`);
  });

  Object.keys(args).forEach(key => {
    list.push(`@${key}={{${toGlimmer(args[key])}}}`);
  });

  if (blockParams) list.push(`as |${blockParams.join(' ')}|`);

  let tag = list.join(" ");

  if (typeof template === 'string') {
    return `<${tag}>${template}</${tagName}>`;
  } else {
    return `<${tag} />`;
  }
}

function assertExpected(tagName: string, expected: string | Expected, defaultAttrs: Object = {}) {
  let attrs: Object;
  let content: string;

  if (typeof expected === 'string') {
    attrs = defaultAttrs;
    content = expected;
  } else {
    attrs = expected.attrs;
    content = expected.content;
  }

  assertEmberishElement(tagName, attrs, content);
}

function toGlimmer(obj: any): string {
  if (obj && obj.glimmer) return obj.glimmer;
  else return String(obj);
}

function toCurly(obj: any): string {
  if (obj && obj.curly) return obj.curly;
  else return String(obj);
}

testComponent('non-block without properties', {
  layout: 'In layout',
  expected: 'In layout'
});

testComponent('block without properties', {
  layout: 'In layout -- {{yield}}',
  invokeAs: { template: 'In template' },
  expected: 'In layout -- In template'
});

testComponent('yield inside a conditional on the component', {
  layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
  invokeAs: {
    template: 'In template',
    args: { predicate: 'predicate' },
    context: { predicate: true }
  },
  expected: {
    attrs: {},
    content: 'In layout -- In template'
  },
  updates: [{
    expected: 'In layout -- In template'
  }, {
    context: { predicate: false },
    expected: 'In layout -- <!---->'
  }, {
    context: { predicate: true },
    expected: 'In layout -- In template'
  }]
});

testComponent('non-block with properties on attrs', {
  layout: 'In layout - someProp: {{@someProp}}',
  invokeAs: { args: { someProp: '"something here"' } },
  expected: 'In layout - someProp: something here'
});

testComponent('block with properties on attrs', {
  layout: 'In layout - someProp: {{@someProp}} - {{yield}}',
  invokeAs: { template: 'In template', args: { someProp: '"something here"' } },
  expected: 'In layout - someProp: something here - In template',
});

testComponent('with ariaRole specified', {
  skip: true,
  kind: 'curly',
  layout: 'Here!',
  invokeAs: { attributes: { id: '"aria-test"', ariaRole: '"main"' } },
  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', role: '"main"' }
  }
});

testComponent('with ariaRole and class specified', {
  skip: true,
  kind: 'curly',
  layout: 'Here!',
  invokeAs: { attributes: { id: '"aria-test"', class: '"foo"', ariaRole: '"main"' } },
  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' }
  }
});

testComponent('with ariaRole specified as an outer binding', {
  skip: true,
  kind: 'curly',
  layout: 'Here!',

  invokeAs: {
    attributes: { id: '"aria-test"', class: '"foo"', ariaRole: 'ariaRole' },
    context: { ariaRole: 'main' },
  },

  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' }
  }
});

testComponent('glimmer component with role specified as an outer binding and copied', {
  skip: true,
  kind: 'glimmer',
  layout: 'Here!',
  invokeAs: {
    attributes: { id: '"aria-test"', role: '"{{myRole}}"' },
    context: { myRole: 'main' }
  },

  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', role: '"main"' }
  }
});

testComponent('yielding to an non-existent block', {
  layout: 'Before-{{yield}}-After',
  expected: 'Before--After'
});

testComponent('yield', {
  skip: 'glimmer',
  layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    args: { predicate: 'activated', someValue: '42' },
    context: { activated: true, outer: "outer" },
    blockParams: ['result'],
    template: 'Hello{{result}}{{outer}}',
    inverse: 'Goodbye{{outer}}'
  },

  expected: 'Yes:Hello42outer'
});

testComponent('yield to inverse', {
  skip: 'glimmer',
  layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    args: { predicate: 'activated', someValue: '42'},
    context: { activated: false, outer: "outer" },
    blockParams: ['result'],
    template: 'Hello{{result}}{{outer}}',
    inverse: 'Goodbye{{outer}}'
  },

  expected: 'No:Goodbyeouter'
});

module('Components - has-block helper');

testComponent('parameterized has-block (subexpr, inverse) when inverse supplied', {
  kind: 'curly',
  layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: 'Yes'
});

testComponent('parameterized has-block (subexpr, inverse) when inverse not supplied', {
  layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
  invokeAs: { template: 'block here' },
  expected: 'No'
});

testComponent('parameterized has-block (subexpr, default) when block supplied', {
  layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
  invokeAs: { template: 'block here' },
  expected: 'Yes'
});

testComponent('parameterized has-block (subexpr, default) when block not supplied', {
  kind: 'curly',
  layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
  expected: 'No'
});

testComponent('parameterized has-block (content, inverse) when inverse supplied', {
  kind: 'curly',
  layout: '{{has-block "inverse"}}',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: 'true'
});

testComponent('parameterized has-block (content, inverse) when inverse not supplied', {
  layout: '{{has-block "inverse"}}',
  invokeAs: { template: 'block here' },
  expected: 'false'
});

testComponent('parameterized has-block (content, default) when block supplied', {
  layout: '{{has-block}}',
  invokeAs: { template: 'block here' },
  expected: 'true'
});

testComponent('parameterized has-block (content, default) when block not supplied', {
  kind: 'curly',
  layout: '{{has-block}}',
  expected: 'false'
});

testComponent('parameterized has-block (prop, inverse) when inverse supplied', {
  kind: 'curly',
  layout: '<button name={{has-block "inverse"}}></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button name="true"></button>'
});

testComponent('parameterized has-block (prop, inverse) when inverse not supplied', {
  layout: '<button name={{has-block "inverse"}}></button>',
  invokeAs: { template: 'block here' },
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block (prop, default) when block supplied', {
  layout: '<button name={{has-block}}></button>',
  invokeAs: { template: 'block here' },
  expected: '<button name="true"></button>'
});

testComponent('parameterized has-block (prop, default) when block not supplied', {
  kind: 'curly',
  layout: '<button name={{has-block}}></button>',
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block (attr, inverse) when inverse supplied', {
  kind: 'curly',
  layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button data-has-block="true"></button>'
});

testComponent('parameterized has-block (attr, inverse) when inverse not supplied', {
  layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block="false"></button>'
});

testComponent('parameterized has-block (attr, default) when block supplied', {
  layout: '<button data-has-block="{{has-block}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block="true"></button>'
});

testComponent('parameterized has-block (attr, default) when block not supplied', {
  kind: 'curly',
  layout: '<button data-has-block="{{has-block}}"></button>',
  expected: '<button data-has-block="false"></button>'
});

testComponent('parameterized has-block (concatted attr, inverse) when inverse supplied', {
  kind: 'curly',
  layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button data-has-block="is-true"></button>'
});

testComponent('parameterized has-block (concatted attr, inverse) when inverse not supplied', {
  layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block="is-false"></button>'
});

testComponent('parameterized has-block (concatted attr, default) when block supplied', {
  layout: '<button data-has-block="is-{{has-block}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block="is-true"></button>'
});

testComponent('parameterized has-block (concatted attr, default) when block not supplied', {
  kind: 'curly',
  layout: '<button data-has-block="is-{{has-block}}"></button>',
  expected: '<button data-has-block="is-false"></button>'
});

module('Components - has-block-params helper');

testComponent('parameterized has-block-params (subexpr, inverse) when inverse supplied without block params', {
  kind: 'curly',
  layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: 'No'
});

testComponent('parameterized has-block-params (subexpr, inverse) when inverse not supplied', {
  layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
  invokeAs: { template: 'block here' },
  expected: 'No'
});

testComponent('parameterized has-block-params (subexpr, default) when block supplied with block params', {
  kind: 'curly',
  layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
  invokeAs: {
    blockParams: ['param'],
    template: 'block here'
  },
  expected: 'Yes'
});

testComponent('parameterized has-block-params (subexpr, default) when block supplied without block params', {
  layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
  invokeAs: { template: 'block here' },
  expected: 'No'
});

testComponent('parameterized has-block-params (subexpr, default) when block not supplied', {
  kind: 'curly',
  layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
  expected: 'No'
});

testComponent('parameterized has-block-params (content, inverse) when inverse supplied without block params', {
  kind: 'curly',
  layout: '{{has-block-params "inverse"}}',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: 'false'
});

testComponent('parameterized has-block-params (content, inverse) when inverse not supplied', {
  layout: '{{has-block-params "inverse"}}',
  invokeAs: { template: 'block here' },
  expected: 'false'
});

testComponent('parameterized has-block-params (content, default) when block supplied with block params', {
  kind: 'curly',
  layout: '{{has-block-params}}',
  invokeAs: {
    blockParams: ['param'],
    template: 'block here'
  },
  expected: 'true'
});

testComponent('parameterized has-block-params (content, default) when block supplied without block params', {
  layout: '{{has-block-params}}',
  invokeAs: { template: 'block here' },
  expected: 'false'
});

testComponent('parameterized has-block-params (content, default) when block not supplied', {
  kind: 'curly',
  layout: '{{has-block-params}}',
  expected: 'false'
});

testComponent('parameterized has-block-params (prop, inverse) when inverse supplied without block params', {
  kind: 'curly',
  layout: '<button name={{has-block-params "inverse"}}></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block-params (prop, inverse) when inverse not supplied', {
  layout: '<button name={{has-block-params "inverse"}}></button>',
  invokeAs: { template: 'block here' },
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block-params (prop, default) when block supplied with block params', {
  kind: 'curly',
  layout: '<button name={{has-block-params}}></button>',
  invokeAs: {
    blockParams: ['param'],
    template: 'block here'
  },
  expected: '<button name="true"></button>'
});

testComponent('parameterized has-block-params (prop, default) when block supplied without block params', {
  layout: '<button name={{has-block-params}}></button>',
  invokeAs: { template: 'block here' },
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block-params (prop, default) when block not supplied', {
  kind: 'curly',
  layout: '<button name={{has-block-params}}></button>',
  expected: '<button name="false"></button>'
});

testComponent('parameterized has-block-params (attr, inverse) when inverse supplied without block params', {
  kind: 'curly',
  layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button data-has-block-params="false"></button>'
});

testComponent('parameterized has-block-params (attr, inverse) when inverse not supplied', {
  layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block-params="false"></button>'
});

testComponent('parameterized has-block-params (attr, default) when block supplied with block params', {
  kind: 'curly',
  layout: '<button data-has-block-params="{{has-block-params}}"></button>',
  invokeAs: {
    blockParams: ['param'],
    template: 'block here'
  },
  expected: '<button data-has-block-params="true"></button>'
});

testComponent('parameterized has-block-params (attr, default) when block supplied without block params', {
  layout: '<button data-has-block-params="{{has-block-params}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block-params="false"></button>'
});

testComponent('parameterized has-block-params (attr, default) when block not supplied', {
  kind: 'curly',
  layout: '<button data-has-block-params="{{has-block-params}}"></button>',
  expected: '<button data-has-block-params="false"></button>'
});

testComponent('parameterized has-block-params (concatted attr, inverse) when inverse supplied without block params', {
  kind: 'curly',
  layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: '<button data-has-block-params="is-false"></button>'
});

testComponent('parameterized has-block-params (concatted attr, inverse) when inverse not supplied', {
  layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block-params="is-false"></button>'
});

testComponent('parameterized has-block-params (concatted attr, default) when block supplied with block params', {
  kind: 'curly',
  layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
  invokeAs: {
    blockParams: ['param'],
    template: 'block here'
  },
  expected: '<button data-has-block-params="is-true"></button>'
});

testComponent('parameterized has-block-params (concatted attr, default) when block supplied without block params', {
  layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
  invokeAs: { template: 'block here' },
  expected: '<button data-has-block-params="is-false"></button>'
});

testComponent('parameterized has-block-params (concatted attr, default) when block not supplied', {
  kind: 'curly',
  layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
  expected: '<button data-has-block-params="is-false"></button>'
});

module("Components - curlies - dynamic component");

QUnit.test('initially missing, then present, then missing', assert => {
  class FooBar extends BasicComponent {
    public foo = 'foo';
    public bar = 'bar';
    public baz = null;

    constructor(attrs: Attrs) {
      super(attrs);
      this.baz = attrs['baz'] || 'baz';
    }
  }

  env.registerBasicComponent('foo-bar', FooBar, `<p>{{foo}} {{bar}} {{baz}}</p>`);

  appendViewFor(
    stripTight`
      <div>
        {{component something}}
      </div>`,
    {
      something: undefined
    }
  );

  equalsElement(view.element, 'div', {}, '<!---->');

  set(view, 'something', 'foo-bar');
  rerender();

  equalsElement(view.element, 'div', {}, '<p>foo bar baz</p>');

  set(view, 'something', undefined);
  rerender();

  equalsElement(view.element, 'div', {}, '<!---->');
});

QUnit.test('initially present, then missing, then present', assert => {
  class FooBar extends BasicComponent {
    public foo = 'foo';
    public bar = 'bar';
    public baz = null;

    constructor(attrs: Attrs) {
      super(attrs);
      this.baz = attrs['baz'] || 'baz';
    }
  }

  env.registerBasicComponent('foo-bar', FooBar, `<p>{{foo}} {{bar}} {{baz}}</p>`);

  appendViewFor(
    stripTight`
      <div>
        {{component something}}
      </div>`,
    {
      something: "foo-bar"
    }
  );

  equalsElement(view.element, 'div', {}, '<p>foo bar baz</p>');

  set(view, 'something', undefined);
  rerender();

  equalsElement(view.element, 'div', {}, '<!---->');

  set(view, 'something', 'foo-bar');
  rerender();

  equalsElement(view.element, 'div', {}, '<p>foo bar baz</p>');
});

module("Components - curlies - dynamic customizations");

QUnit.test('dynamic tagName', assert => {
  class FooBar extends EmberishCurlyComponent {
    tagName = 'aside';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `Hello. It's me.`);

  appendViewFor(`{{foo-bar}}`);
  assertEmberishElement('aside', {}, `Hello. It's me.`);

  rerender();

  assertEmberishElement('aside', {}, `Hello. It's me.`);
});

QUnit.test('dynamic tagless component', assert => {
  class FooBar extends EmberishCurlyComponent {
    tagName = '';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `Michael Jordan says "Go Tagless"`);

  appendViewFor(`{{foo-bar}}`);
  assertAppended('Michael Jordan says "Go Tagless"');

  rerender();

  assertAppended('Michael Jordan says "Go Tagless"');
});

QUnit.test('dynamic attribute bindings', assert => {
  let fooBarInstance: FooBar = null;

  class FooBar extends EmberishCurlyComponent {
    attributeBindings = ['style'];
    style: string = null;

    constructor() {
      super();
      this.style = 'color: red;';
      fooBarInstance = this;
    }
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `Hello. It's me.`);

  appendViewFor(`{{foo-bar}}`);
  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);

  rerender();

  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);

  fooBarInstance.style = 'color: green;';
  rerender();

  assertEmberishElement('div', { 'style': 'color: green;' }, `Hello. It's me.`);

  fooBarInstance.style = null;
  rerender();

  assertEmberishElement('div', { }, `Hello. It's me.`);

  fooBarInstance.style = 'color: red;';
  rerender();

  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);
});

module("Components - generic - attrs");

module("Components - integration - scope");

testComponent('correct scope - conflicting local names', {
  layout: stripTight`{{#with @a as |item|}}{{@a}}: {{item}}, {{#with @b as |item|}}
                     {{@b}}: {{item}}, {{#with @c as |item|}}{{@c}}: {{item}}{{/with}}{{/with}}{{/with}}`,
  invokeAs: { args: { a: '"A"', b: '"B"', c: '"C"' } },
  expected: 'A: A, B: B, C: C'
});

testComponent('correct scope - conflicting block param and attr names', {
  layout: 'Outer: {{@conflict}} {{#with @item as |conflict|}}Inner: {{@conflict}} Block: {{conflict}}{{/with}}',
  invokeAs: { args: { item: '"from block"', conflict: '"from attr"' } },
  expected: 'Outer: from attr Inner: from attr Block: from block'
});

QUnit.test('correct scope - self', assert => {
  class FooBar extends BasicComponent {
    public foo = 'foo';
    public bar = 'bar';
    public baz = null;

    constructor(attrs: Attrs) {
      super(attrs);
      this.baz = attrs['baz'] || 'baz';
    }
  }

  env.registerBasicComponent('foo-bar', FooBar, `<p>{{foo}} {{bar}} {{baz}}</p>`);

  appendViewFor(
    stripTight`
      <div>
        <foo-bar />
        <foo-bar @baz={{zomg}} />
      </div>`,
    { zomg: "zomg" }
  );

  equalsElement(view.element, 'div', {},
      stripTight`
        <p>foo bar baz</p>
        <p>foo bar zomg</p>`
  );
});

QUnit.test('`false` class name do not render', assert => {
  appendViewFor('<div class={{isFalse}}>FALSE</div>', { isFalse: false });
  assert.strictEqual(view.element.getAttribute('class'), null);
  assert.strictEqual(view.element.className, '');
});

QUnit.test('`null` class name do not render', assert => {
  appendViewFor('<div class={{isNull}}>NULL</div>', { isNull: null });
  assert.strictEqual(view.element.getAttribute('class'), null);
  assert.strictEqual(view.element.className, '');
});

QUnit.test('`undefined` class name do not render', assert => {
  appendViewFor('<div class={{isUndefined}}>UNDEFINED</div>', { isUndefined: undefined });
  assert.strictEqual(view.element.getAttribute('class'), null);
  assert.strictEqual(view.element.className, '');
});

QUnit.test('`0` class names do render', assert => {
  appendViewFor('<div class={{isZero}}>ZERO</div>', { isZero: 0 });
  assert.strictEqual(view.element.getAttribute('class'), '0');
  assert.strictEqual(view.element.className, '0');
});

QUnit.test('component with slashed name', assert => {
  let SampleComponent = EmberishCurlyComponent.extend();

  env.registerEmberishCurlyComponent('fizz-bar/baz-bar', SampleComponent as any, '{{@hey}}');

  appendViewFor('{{fizz-bar/baz-bar hey="hello"}}');

  assert.equal(view.element.textContent, 'hello');
});

QUnit.test('correct scope - simple', assert => {
  env.registerBasicComponent('sub-item', BasicComponent,
    `<p>{{@name}}</p>`
  );

  let subitemId = 0;
  let subitems = [];

  for (let i = 0; i < 1; i++) {
    subitems.push({
      id: subitemId++
    });
  }

  appendViewFor(
    stripTight`
      {{#each items key="id" as |item|}}
        <sub-item @name={{item.id}} />
      {{/each}}`
    , { items: subitems });

   equalsElement(view.element, 'p', {}, '0');
});

QUnit.test('correct scope - complex', assert => {
  env.registerBasicComponent('sub-item', BasicComponent,
    `<p>{{@name}}</p>`
  );

  env.registerBasicComponent('my-item', BasicComponent,
    stripTight`
      <aside>{{@item.id}}:
        {{#if @item.visible}}
          {{#each @item.subitems key="id" as |subitem|}}
             <sub-item @name={{subitem.id}} />
          {{/each}}
        {{/if}}
      </aside>`);

    let itemId = 0;

    let items = [];

    for (let i = 0; i < 3; i++) {
      let subitems = [];
      let subitemId = 0;

      for (let j = 0; j < 2; j++) {
        subitems.push({
          id: `${itemId}.${subitemId++}`
        });
      }

      items.push({
        id: String(itemId++),
        visible: i % 2 === 0,
        subitems
      });
    }

    appendViewFor(
      stripTight`
        <article>{{#each items key="id" as |item|}}
          <my-item @item={{item}} />
        {{/each}}</article>`
      , { items });

    equalsElement(view.element, 'article', {},
      stripTight`
        <aside>0:<p>0.0</p><p>0.1</p></aside>
        <aside>1:<!----></aside>
        <aside>2:<p>2.0</p><p>2.1</p></aside>`
    );
});

QUnit.test('correct scope - self', assert => {
  class FooBar extends BasicComponent {
    public foo = 'foo';
    public bar = 'bar';
    public baz = null;

    constructor(attrs: Attrs) {
      super(attrs);
      this.baz = attrs['baz'] || 'baz';
    }
  }

  env.registerBasicComponent('foo-bar', FooBar, `<p>{{foo}} {{bar}} {{baz}}</p>`);

  appendViewFor(
    stripTight`
      <div>
        <foo-bar />
        <foo-bar @baz={{zomg}} />
      </div>`,
    { zomg: "zomg" }
  );

  equalsElement(view.element, 'div', {},
      stripTight`
        <p>foo bar baz</p>
        <p>foo bar zomg</p>`
  );
});

module('Curly Components - positional arguments');

QUnit.skip('static named positional parameters', function() {
  class SampleComponent extends EmberishCurlyComponent {
    static positionalParams = ['name', 'age'];
  }

  SampleComponent[CLASS_META].seal();

  env.registerEmberishCurlyComponent('sample-component', SampleComponent, '{{name}}{{age}}');

  appendViewFor('{{sample-component "Quint" 4}}');

  assertEmberishElement('div', 'Quint4');
});

QUnit.skip('dynamic named positional parameters', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{name}}{{age}}');

  appendViewFor('{{sample-component myName myAge}}', {
    myName: 'Quint',
    myAge: 4
  });

  assertEmberishElement('div', 'Quint4');

  set(view, 'myName', 'Edward');
  set(view, 'myAge', 5);
  rerender();

  assertEmberishElement('div', 'Edward5');
});

QUnit.skip('if a value is passed as a non-positional parameter, it takes precedence over the named one', assert => {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['name']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{name}}');

  assert.throws(() => {
    appendViewFor('{{sample-component notMyName name=myName}}', {
      myName: 'Quint',
      notMyName: 'Sergio'
    });
  }, "You cannot specify both a positional param (at position 0) and the hash argument `name`.");
});

QUnit.skip('static arbitrary number of positional parameters', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each names as |name|}}{{name}}{{/each}}');

  appendViewFor(
    stripTight`<div>{{sample-component "Foo" 4 "Bar" id="args-3"}}
      {{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}
      {{!sample-component "Foo" 4 "Bar" 5 "Baz" id="helper"}}</div>`);

  let first = <Element>view.element.firstChild;
  let second = <Element>first.nextSibling;
  // let third = <Element>second.nextSibling;

  assertElementIsEmberishElement(first, 'div', { id: 'args-3' }, 'Foo4Bar');
  assertElementIsEmberishElement(second, 'div', { id: 'args-5' }, 'Foo4Bar5Baz');
  // equalsElement(third, ...emberishElement('div', { id: 'helper' }, 'Foo4Bar5Baz'));
});

QUnit.skip('arbitrary positional parameter conflict with hash parameter is reported', assert => {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each attrs.names as |name|}}{{name}}{{/each}}');

  assert.throws(function() {
    appendViewFor('{{sample-component "Foo" 4 "Bar" names=numbers id="args-3"}}', {
      numbers: [1, 2, 3]
    });
  }, `You cannot specify positional parameters and the hash argument \`names\`.`);
});

QUnit.skip('can use hash parameter instead of arbitrary positional param [GH #12444]', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each names as |name|}}{{name}}{{/each}}');

  appendViewFor('{{sample-component names=things id="args-3"}}', {
    things: ['Foo', 4, 'Bar']
  });

  assertEmberishElement('div', { id: 'args-3' }, 'Foo4Bar');
});

QUnit.skip('can use hash parameter instead of positional param', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['first', 'second']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{first}} - {{second}}');

  appendViewFor(`<div>
    {{sample-component "one" "two" id="two-positional"}}
    {{sample-component "one" second="two" id="one-positional"}}
    {{sample-component first="one" second="two" id="no-positional"}}</div>
  `, {
    things: ['Foo', 4, 'Bar']
  });

  let first = view.element.firstElementChild;
  let second = first.nextElementSibling;
  let third = second.nextElementSibling;

  assertElementIsEmberishElement(first, 'div', { id: 'two-positional' }, 'one - two');
  assertElementIsEmberishElement(second, 'div', { id: 'one-positional' }, 'one - two');
  assertElementIsEmberishElement(third, 'div', { id: 'no-positional' }, 'one - two');
});

QUnit.skip('dynamic arbitrary number of positional parameters', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'n'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each attrs.n as |name|}}{{name}}{{/each}}');

  appendViewFor('<div>{{sample-component user1 user2 id="direct"}}{{!component "sample-component" user1 user2 id="helper"}}</div>', {
    user1: 'Foo',
    user2: 4
  });

  let first = view.element.firstElementChild;
  // let second = first.nextElementSibling;

  assertElementIsEmberishElement(first, 'div', { id: 'direct' }, 'Foo4');
  // assertElementIsEmberishElement(first, 'div', { id: 'helper' }, 'Foo4');

  set(view, 'user1', "Bar");
  set(view, 'user2', "5");
  rerender();

  assertElementIsEmberishElement(first, 'div', { id: 'direct' }, 'Bar5');
  // assertElementIsEmberishElement(second, 'div', { id: 'helper' }, 'Bar5');

  set(view, 'user2', '6');
  rerender();

  assertElementIsEmberishElement(first, 'div', { id: 'direct' }, 'Bar6');
  // assertElementIsEmberishElement(second, 'div', { id: 'helper' }, 'Bar6');
});

QUnit.test('{{component}} helper works with positional params', function() {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, `{{attrs.name}}{{attrs.age}}`);

  appendViewFor(`{{component "sample-component" myName myAge}}`, {
    myName: 'Quint',
    myAge: 4
  });

  assertEmberishElement('div', 'Quint4');

  set(view, 'myName', 'Edward');
  set(view, 'myAge', '5');
  rerender();

  assertEmberishElement('div', 'Edward5');

  set(view, 'myName', 'Quint');
  set(view, 'myAge', '4');
  rerender();

  assertEmberishElement('div', 'Quint4');
});

module("Emberish Components - parentView");

QUnit.skip('components in template of a yielding component should have the proper parentView', function() {
  let outer, innerTemplate, innerLayout;

  let Outer = EmberishCurlyComponent.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }) as any;

  let InnerInTemplate = EmberishCurlyComponent.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  }) as any;

  let InnerInLayout = EmberishCurlyComponent.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  }) as any;

  env.registerEmberishCurlyComponent('x-inner-in-layout', InnerInLayout, '');
  env.registerEmberishCurlyComponent('x-inner-in-template', InnerInTemplate, '');
  env.registerEmberishCurlyComponent('x-outer', Outer, `{{x-inner-in-layout}}{{yield}}`);

  appendViewFor('{{#x-outer}}{{#x-inner-in-template}}{{/x-inner-in-template}}{{/x-outer}}');

  assertEmberishElement('div');

  equalObject(innerTemplate.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equalObject(innerLayout.parentView, outer, 'receives the wrapping component as its parentView in layout');
  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

function inspect(obj: EmberObject) {
  return obj && `<#Object:${obj._guid}>`;
}

function equalObject(actual: EmberObject, expected: EmberObject, msg: string) {
  strictEqual(inspect(actual), inspect(expected), msg);
}

QUnit.skip('newly-added sub-components get correct parentView', function() {
  let outer, inner;

  let Outer = EmberishCurlyComponent.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  });

  let Inner = EmberishCurlyComponent.extend({
    init() {
      this._super(...arguments);
      inner = this;
    }
  });

  env.registerEmberishCurlyComponent('x-outer', Outer as any, `{{yield}}`);
  env.registerEmberishCurlyComponent('x-inner', Inner as any, '');

  appendViewFor('{{#x-outer}}{{#if showInner}}{{x-inner}}{{/if}}{{/x-outer}}', { showInner: false });

  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');

  set(view, 'showInner', true);
  rerender();

  equalObject(inner.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

module("Emberish Component - ids");

QUnit.test('emberish component should have unique IDs', assert => {
  env.registerEmberishCurlyComponent('x-curly', null, '');
  env.registerEmberishGlimmerComponent('x-glimmer', null, '<div></div>');

  appendViewFor(
    stripTight`
      <div>
        {{x-curly}}
        {{x-curly}}
        <x-glimmer />
        <x-glimmer />
        {{x-curly}}
        <x-glimmer />
      </div>`
  );

  equalsElement(view.element.childNodes[0] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');
  equalsElement(view.element.childNodes[1] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');
  equalsElement(view.element.childNodes[2] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');
  equalsElement(view.element.childNodes[3] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');
  equalsElement(view.element.childNodes[4] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');
  equalsElement(view.element.childNodes[5] as Element, 'div', { id: regex(/^ember\d*$/), class: 'ember-view' }, '');

  let IDs = {};

  function markAsSeen(element: Element) {
    IDs[element.id] = (IDs[element.id] || 0) + 1;
  }

  markAsSeen(view.element.childNodes[0] as Element);
  markAsSeen(view.element.childNodes[1] as Element);
  markAsSeen(view.element.childNodes[2] as Element);
  markAsSeen(view.element.childNodes[3] as Element);
  markAsSeen(view.element.childNodes[4] as Element);
  markAsSeen(view.element.childNodes[5] as Element);

  equal(Object.keys(IDs).length, 6, "Expected the components to each have a unique IDs");

  for (let id in IDs) {
    equal(IDs[id], 1, `Expected ID ${id} to be unique`);
  }
});

// QUnit.skip('non-block with each rendering child components', function() {
//   expect(2);

//   registry.register(
//     'template:components/non-block',
//     compile('In layout. {{#each attrs.items as |item|}}[{{child-non-block item=item}}]{{/each}}')
//   );
//   registry.register('template:components/child-non-block', compile('Child: {{attrs.item}}.'));

//   let items = emberA(['Tom', 'Dick', 'Harry']);

//   view = EmberView.extend({
//     template: compile('{{non-block items=view.items}}'),
//     container: container,
//     items: items
//   }).create();

//   runAppend(view);

//   equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

//   run(function() {
//     items.pushObject('James');
//   });

//   equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.][Child: James.]');
// });

// QUnit.skip('specifying classNames results in correct class', function(assert) {
//   expect(3);

//   let clickyThing;
//   registry.register('component:some-clicky-thing', Component.extend({
//     tagName: 'button',
//     classNames: ['foo', 'bar'],
//     init() {
//       this._super(...arguments);
//       clickyThing = this;
//     }
//   }));

//   view = EmberView.extend({
//     template: compile('{{#some-clicky-thing classNames="baz"}}Click Me{{/some-clicky-thing}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   let button = view.$('button');
//   ok(button.is('.foo.bar.baz.ember-view'), 'the element has the correct classes: ' + button.attr('class'));

//   let expectedClassNames = ['ember-view', 'foo', 'bar', 'baz'];
//   assert.deepEqual(clickyThing.get('classNames'),  expectedClassNames, 'classNames are properly combined');

//   let buttonClassNames = button.attr('class');
//   assert.deepEqual(buttonClassNames.split(' '), expectedClassNames, 'all classes are set 1:1 in DOM');
// });

// QUnit.skip('specifying custom concatenatedProperties avoids clobbering', function(assert) {
//   expect(1);

//   let clickyThing;
//   registry.register('component:some-clicky-thing', Component.extend({
//     concatenatedProperties: ['blahzz'],
//     blahzz: ['blark', 'pory'],
//     init() {
//       this._super(...arguments);
//       clickyThing = this;
//     }
//   }));

//   view = EmberView.extend({
//     template: compile('{{#some-clicky-thing blahzz="baz"}}Click Me{{/some-clicky-thing}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   assert.deepEqual(clickyThing.get('blahzz'),  ['blark', 'pory', 'baz'], 'property is properly combined');
// });

// // jscs:disable validateIndentation
// if (isEnabled('ember-glimmer-component-generation')) {
//   QUnit.module('component - invocation (angle brackets)', {
//     setup() {
//       commonSetup();
//     },

//     teardown() {
//       commonTeardown();
//     }
//   });

//   QUnit.skip('legacy components cannot be invoked with angle brackets', function() {
//     registry.register('template:components/non-block', compile('In layout'));
//     registry.register('component:non-block', Component.extend());

//     expectAssertion(function() {
//       view = appendViewFor('<non-block />');
//     }, /cannot invoke the 'non-block' component with angle brackets/);
//   });

//   QUnit.skip('using a text-fragment in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('In layout'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `The <non-block> template must have a single top-level element because it is a GlimmerComponent.`);
//   });

//   QUnit.skip('having multiple top-level elements in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div>This is a</div><div>fragment</div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `The <non-block> template must have a single top-level element because it is a GlimmerComponent.`);
//   });

//   QUnit.skip('using a modifier in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div {{action "foo"}}></div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `You cannot use {{action ...}} in the top-level element of the <non-block> template because it is a GlimmerComponent.`);
//   });

//   QUnit.skip('using triple-curlies in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div style={{{bar}}}>This is a</div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, strip`You cannot use triple curlies (e.g. style={{{ ... }}})
//       in the top-level element of the <non-block> template because it is a GlimmerComponent.`
//     );
//   });

module("Glimmer Component - shadowing");

testComponent('shadowing: normal outer attributes are reflected', {
  kind: 'glimmer',
  layout: 'In layout - someProp: {{@someProp}}',
  invokeAs: { attributes: { someProp: 'something here' } },
  expected: { attrs: { someProp: 'something here' }, content: 'In layout - someProp: something here' }
});

testComponent('shadowing - normal outer attributes clobber inner attributes', {
  kind: 'glimmer',
  layout: { attributes: { 'data-name': 'Godfrey', 'data-foo': 'foo' } },
  invokeAs: { attributes: { 'data-name': 'Godhuda', 'data-bar': 'bar' } },
  expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo', 'data-bar': 'bar' }, content: '' }
});

testComponent('shadowing: outer attributes with concat are reflected', {
  kind: 'glimmer',
  layout: 'In layout - someProp: {{@someProp}}',
  invokeAs: {
    context: { someProp: 'something here' },
    attributes: { someProp: '{{someProp}}' }
  },
  expected: { attrs: { someProp: 'something here' }, content: 'In layout - someProp: something here' },
  updates: [{
    expected: { attrs: { someProp: 'something here' }, content: 'In layout - someProp: something here' }
  }, {
    context: { someProp: 'something else' },
    expected: { attrs: { someProp: 'something else' }, content: 'In layout - someProp: something else' }
  }, {
    context: { someProp: '' },
    expected: { attrs: { someProp: '' }, content: 'In layout - someProp: ' }
  }, {
    context: { someProp: 'something here' },
    expected: { attrs: { someProp: 'something here' }, content: 'In layout - someProp: something here' }
  }]
});

testComponent('shadowing: outer attributes with concat clobber inner attributes', {
  kind: 'glimmer',
  layout: { attributes: { 'data-name': 'Godfrey', 'data-foo': 'foo' } },
  invokeAs: {
    context: { name: 'Godhuda', foo: 'foo' },
    attributes: { 'data-name': '{{name}}', 'data-foo': '{{foo}}-bar' }
  },
  expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' },
  updates: [{
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }, {
    context: { name: 'Yehuda', foo: 'baz' },
    expected: { attrs: { 'data-name': 'Yehuda', 'data-foo': 'baz-bar' }, content: '' }
  }, {
    context: { name: '', foo: '' },
    expected: { attrs: { 'data-name': '', 'data-foo': '-bar' }, content: '' }
  }, {
    context: { name: 'Godhuda', foo: 'foo' },
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }]
});

testComponent('shadowing: outer attributes clobber inner attributes with concat', {
  kind: 'glimmer',
  layout: { attributes: { 'data-name': '{{@name}}', 'data-foo': '{{@foo}}-bar' } },
  invokeAs: {
    context: { name: 'Godfrey', foo: 'foo' },
    args: { name: 'name', foo: 'foo' },
    attributes: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }
  },
  expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' },
  updates: [{
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }, {
    context: { name: 'Yehuda', foo: 'baz' },
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }, {
    context: { name: '', foo: '' },
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }, {
    context: { name: 'Godhuda', foo: 'foo' },
    expected: { attrs: { 'data-name': 'Godhuda', 'data-foo': 'foo-bar' }, content: '' }
  }]
});

module("Glimmer Component");

let styles = [{
  name: 'a div',
  tagName: 'div'
}, /*{
  name: 'an identity element',
  tagName: 'non-block'
},*/ {
  name: 'a web component',
  tagName: 'not-an-ember-component'
}];

styles.forEach(style => {
  QUnit.test(`non-block without attributes replaced with ${style.name}`, function() {
    env.registerEmberishGlimmerComponent('non-block', null, `  <${style.tagName}>In layout</${style.tagName}>  `);

    appendViewFor('<non-block />');

    let node = view.element.firstChild;
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');

    rerender();

    strictEqual(node, view.element.firstChild, 'The inner element has not changed');
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  QUnit.test(`non-block with attributes replaced with ${style.name}`, function() {
    env.registerEmberishGlimmerComponent(
      'non-block',
      null,
      `  <${style.tagName} such="{{@stability}}">In layout</${style.tagName}>  `
    );

    appendViewFor('<non-block @stability={{stability}} />', { stability: 'stability' });

    let node = view.element;
    equalsElement(node, style.tagName, { such: 'stability', class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');

    set(view, 'stability', 'changed!!!');
    rerender();

    strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  QUnit.skip(`non-block replaced with ${style.name} (regression with single element in the root element)`, function() {
    env.registerEmberishGlimmerComponent(
      'non-block',
      EmberishGlimmerComponent,
      `  <${style.tagName} such="{{attrs.stability}}"><p>In layout</p></${style.tagName}>  `
    );

    appendViewFor('<non-block stability={{view.stability}} />', { stability: 'stability' });

    let node = view.element;
    equalsElement(node, style.tagName, { such: 'stability', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');

    set(view, 'stability', 'changed!!!');
    rerender();

    strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');
  });

  QUnit.skip(`non-block with class replaced with ${style.name} merges classes`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `<${style.tagName} class="inner-class" />`);

    appendViewFor('<non-block class="{{outer}}" />', { outer: 'outer' });

    equalsElement(view.element, style.tagName, { class: classes('inner-class outer ember-view'), id: regex(/^ember\d*$/) }, '');

    set(view, 'outer', 'new-outer');
    rerender();

    equalsElement(view.element, style.tagName, { class: classes('inner-class new-outer ember-view'), id: regex(/^ember\d*$/) }, '');
  });

  QUnit.skip(`non-block with outer attributes replaced with ${style.name} shadows inner attributes`, function() {
    let component: MyComponent;

    class MyComponent extends EmberishGlimmerComponent {
      constructor(attrs: Object) {
        super(attrs);
        component = this;
      }
    }
    MyComponent[CLASS_META].seal();

    env.registerEmberishGlimmerComponent('non-block', MyComponent, `<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`);

    appendViewFor('<non-block data-static="outer" data-dynamic="outer" />');

    equalsElement(view.element, style.tagName, {
      class: classes('ember-view'),
      id: regex(/^ember\d*$/),
      'data-static': 'outer',
      'data-dynamic': 'outer'
    }, '');

    set(component, 'internal', 'changed');
    equalsElement(view.element, style.tagName, {
      class: classes('ember-view'),
      id: regex(/^ember\d*$/),
      'data-static': 'outer',
      'data-dynamic': 'outer'
    }, '');
  });

  QUnit.skip(`non-block replaced with ${style.name} should have correct scope`, function() {
    class NonBlock extends EmberishGlimmerComponent {
      init() {
        this._super(...arguments);
        set(this, 'internal', 'stuff');
      }
    }
    NonBlock[CLASS_META].seal();

    env.registerEmberishGlimmerComponent('non-block', NonBlock, `<${style.tagName}>{{internal}}</${style.tagName}>`);

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'stuff');
  });

  QUnit.skip(`non-block replaced with ${style.name} should have correct 'element'`, function() {
    let component: MyComponent;

    class MyComponent extends EmberishGlimmerComponent {
      constructor(attrs: Object) {
        super(attrs);
        component = this;
      }
    }
    MyComponent[CLASS_META].seal();

    env.registerEmberishGlimmerComponent('non-block', MyComponent, `<${style.tagName} />`);

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/) }, '');
  });

  QUnit.skip(`non-block replaced with ${style.name} should have inner attributes`, function() {
    class NonBlock extends EmberishGlimmerComponent {
      init() {
        this._super(...arguments);
        set(this, 'internal', 'stuff');
      }
    }
    NonBlock[CLASS_META].seal();

    env.registerEmberishGlimmerComponent('non-block', NonBlock, `<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`);

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, {
      class: classes('ember-view'),
      id: regex(/^ember\d*$/),
      'data-static': 'static',
      'data-dynamic': 'stuff'
    }, '');
  });

  QUnit.skip(`only text attributes are reflected on the underlying DOM element (${style.name})`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `<${style.tagName}>In layout</${style.tagName}>`);

    appendViewFor('<non-block static-prop="static text" concat-prop="{{view.dynamic}} text" dynamic-prop={{view.dynamic}} />', {
      dynamic: 'dynamic'
    });

    equalsElement(view.element, style.tagName, {
      class: classes('ember-view'),
      id: regex(/^ember\d*$/),
      'static-prop': 'static text',
      'concat-prop': 'dynamic text'
    }, 'In layout');
  });

});

QUnit.test(`Glimmer component with element modifier`, function(assert) {
  env.registerEmberishGlimmerComponent('non-block', null, `  <div>In layout</div>  `);

  assert.throws(() => {
    appendViewFor('<non-block {{action}} />');
  }, new Error("Compile Error: Element modifiers are not allowed in components"), "should throw error");
});

QUnit.skip('block without properties', function() {
  env.registerEmberishGlimmerComponent('with-block', EmberishGlimmerComponent, '<with-block>In layout - {{yield}}</with-block>');

  appendViewFor('<with-block>In template</with-block>');

  equalsElement(view.element, 'with-block', { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'In layout - In template');
});

QUnit.skip('attributes are not installed on the top level', function() {
  let component: NonBlock;

  class NonBlock extends EmberishGlimmerComponent {

    init() {
      this._super(...arguments);
      component = this;
    }
  }
  NonBlock[CLASS_META].seal();

  // This is specifically attempting to trigger a 1.x-era heuristic that only copied
  // attrs that were present as defined properties on the component.
  NonBlock.prototype['text'] = null;
  NonBlock.prototype['dynamic'] = null;

  env.registerEmberishGlimmerComponent('non-block', NonBlock, '<non-block>In layout - {{attrs.text}} -- {{text}}</non-block>');

  appendViewFor('<non-block text="texting" dynamic={{dynamic}} />', {
    dynamic: 'dynamic'
  });

  equalsElement(view.element, 'non-block', {
    class: classes('ember-view'),
    id: regex(/^ember\d*$/),
    text: 'texting'
  }, 'In layout - texting -- null');
  equal(component.attrs['text'], 'texting');
  equal(component.attrs['dynamic'], 'dynamic');
  strictEqual(component['text'], null);
  strictEqual(component['dynamic'], null);

  rerender();

  equalsElement(view.element, 'non-block', {
    class: classes('ember-view'),
    id: regex(/^ember\d*$/),
    text: 'texting'
  }, 'In layout - texting -- <!---->');
  equal(component.attrs['text'], 'texting');
  equal(component.attrs['dynamic'], 'dynamic');
  strictEqual(component['text'], null);
  strictEqual(component['dynamic'], null);
});

QUnit.skip('non-block with properties on attrs and component class', function() {
  env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, '<non-block>In layout - someProp: {{attrs.someProp}}</non-block>');

  appendViewFor('<non-block someProp="something here" />');

  assertEmberishElement('non-block', { someProp: 'something here' }, 'In layout - someProp: something here');
});

QUnit.skip('block with properties on attrs', function() {
  env.registerEmberishGlimmerComponent(
    'with-block',
    EmberishGlimmerComponent,
    '<with-block>In layout - someProp: {{attrs.someProp}} - {{yield}}</with-block>'
  );

  appendViewFor('<with-block someProp="something here">In template</with-block>');

  assertEmberishElement('with-block', { someProp: 'something here' }, 'In layout - someProp: something here - In template');
});

QUnit.skip('computed property alias on a static attr', function() {
  let ComputedAlias = <any>EmberishGlimmerComponent.extend({
    otherProp: alias('attrs.someProp')
  });

  env.registerEmberishGlimmerComponent('computed-alias', ComputedAlias, '<computed-alias>{{otherProp}}</computed-alias>');

  appendViewFor('<computed-alias someProp="value"></computed-alias>', {
    someProp: 'value'
  });

  assertEmberishElement('computed-alias', { someProp: 'value' }, 'value');
});

QUnit.skip('computed property alias on a dynamic attr', function() {
  let ComputedAlias = <any>EmberishGlimmerComponent.extend({
    otherProp: alias('attrs.someProp')
  });

  env.registerEmberishGlimmerComponent('computed-alias', ComputedAlias, '<computed-alias>{{otherProp}}</computed-alias>');

  appendViewFor('<computed-alias someProp="{{someProp}}"></computed-alias>', {
    someProp: 'value'
  });

  assertEmberishElement('computed-alias', { someProp: 'value' }, 'value');

  set(view, 'someProp', 'other value');
  rerender();

  assertEmberishElement('computed-alias', { someProp: 'other value' }, 'other value');
});

QUnit.skip('lookup of component takes priority over property', function() {
  expect(1);

  class MyComponent extends EmberishCurlyComponent {
    'some-component' = 'not-some-component';
    'some-prop' = 'some-prop';
  }

  class SomeComponent extends EmberishCurlyComponent {

  }

  env.registerEmberishCurlyComponent('my-component', MyComponent, '{{some-prop}} {{some-component}}');
  env.registerEmberishCurlyComponent('some-component', SomeComponent, 'some-component');

  appendViewFor('{{my-component}}');

  assertAppended('<div>some-prop <div>some-component</div></div>');
});

QUnit.test('Curly component hooks (with attrs)', function() {
  let instance;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{@someProp}}');

  appendViewFor('{{non-block someProp=someProp}}', { someProp: 'wycats' });

  assertFired(instance, 'didReceiveAttrs');
  assertFired(instance, 'willRender');
  assertFired(instance, 'didInsertElement');
  assertFired(instance, 'didRender');

  assertEmberishElement('div', 'In layout - someProp: wycats');

  set(view, 'someProp', 'tomdale');
  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 2);
  assertFired(instance, 'willUpdate');
  assertFired(instance, 'willRender', 2);
  assertFired(instance, 'didUpdate');
  assertFired(instance, 'didRender', 2);

  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 3);
  assertFired(instance, 'willUpdate', 2);
  assertFired(instance, 'willRender', 3);
  assertFired(instance, 'didUpdate', 2);
  assertFired(instance, 'didRender', 3);
});

QUnit.test('Curly component hooks (attrs as self props)', function() {
  let instance;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{someProp}}');

  appendViewFor('{{non-block someProp=someProp}}', { someProp: 'wycats' });

  assertFired(instance, 'didReceiveAttrs');
  assertFired(instance, 'willRender');
  assertFired(instance, 'didInsertElement');
  assertFired(instance, 'didRender');

  assertEmberishElement('div', 'In layout - someProp: wycats');

  set(view, 'someProp', 'tomdale');
  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 2);
  assertFired(instance, 'willUpdate');
  assertFired(instance, 'willRender', 2);
  assertFired(instance, 'didUpdate');
  assertFired(instance, 'didRender', 2);

  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 3);
  assertFired(instance, 'willUpdate', 2);
  assertFired(instance, 'willRender', 3);
  assertFired(instance, 'didUpdate', 2);
  assertFired(instance, 'didRender', 3);
});

QUnit.test('Setting value attributeBinding to null results in empty string value', function(assert) {
  let instance;

  class InputComponent extends EmberishCurlyComponent {
    tagName = 'input';
    attributeBindings = ['value'];
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('input-component', inspectHooks(InputComponent), 'input component');

  appendViewFor('{{input-component value=someProp}}', { someProp: null });

  assert.equal(instance.element.value, '');

  set(view, 'someProp', 'wycats');
  rerender();

  assert.equal(instance.element.value, 'wycats');

  set(view, 'someProp', null);
  rerender();

  assert.equal(instance.element.value, '');
});

QUnit.test('Curly component hooks (force recompute)', function() {
  let instance;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{@someProp}}');

  appendViewFor('{{non-block someProp="wycats"}}');

  assertFired(instance, 'didReceiveAttrs', 1);
  assertFired(instance, 'willRender', 1);
  assertFired(instance, 'didInsertElement', 1);
  assertFired(instance, 'didRender', 1);

  assertEmberishElement('div', 'In layout - someProp: wycats');

  rerender();

  assertEmberishElement('div', 'In layout - someProp: wycats');

  assertFired(instance, 'didReceiveAttrs', 1);
  assertFired(instance, 'willRender', 1);
  assertFired(instance, 'didRender', 1);

  instance.recompute();
  rerender();

  assertEmberishElement('div', 'In layout - someProp: wycats');

  assertFired(instance, 'didReceiveAttrs', 2);
  assertFired(instance, 'willUpdate', 1);
  assertFired(instance, 'willRender', 2);
  assertFired(instance, 'didUpdate', 1);
  assertFired(instance, 'didRender', 2);
});

QUnit.test('Glimmer component hooks', function() {
  let instance;

  class NonBlock extends EmberishGlimmerComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishGlimmerComponent('non-block', inspectHooks(NonBlock), '<div>In layout - someProp: {{@someProp}}</div>');

  appendViewFor('<non-block @someProp={{someProp}} />', { someProp: 'wycats' });

  assertFired(instance, 'didReceiveAttrs');
  assertFired(instance, 'willRender');
  assertFired(instance, 'didInsertElement');
  assertFired(instance, 'didRender');

  assertEmberishElement('div', 'In layout - someProp: wycats');

  set(view, 'someProp', 'tomdale');
  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 2);
  assertFired(instance, 'willUpdate');
  assertFired(instance, 'willRender', 2);
  assertFired(instance, 'didUpdate');
  assertFired(instance, 'didRender', 2);

  rerender();

  assertEmberishElement('div', 'In layout - someProp: tomdale');

  assertFired(instance, 'didReceiveAttrs', 3);
  assertFired(instance, 'willUpdate', 2);
  assertFired(instance, 'willRender', 3);
  assertFired(instance, 'didUpdate', 2);
  assertFired(instance, 'didRender', 3);
});

QUnit.test('Glimmer component hooks (force recompute)', function() {
  let instance;

  class NonBlock extends EmberishGlimmerComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishGlimmerComponent('non-block', inspectHooks(NonBlock), '<div>In layout - someProp: {{@someProp}}</div>');

  appendViewFor('{{non-block someProp="wycats"}}');

  assertFired(instance, 'didReceiveAttrs', 1);
  assertFired(instance, 'willRender', 1);
  assertFired(instance, 'didInsertElement', 1);
  assertFired(instance, 'didRender', 1);

  assertEmberishElement('div', 'In layout - someProp: wycats');

  rerender();

  assertEmberishElement('div', 'In layout - someProp: wycats');

  assertFired(instance, 'didReceiveAttrs', 1);
  assertFired(instance, 'willRender', 1);
  assertFired(instance, 'didRender', 1);

  instance.recompute();
  rerender();

  assertEmberishElement('div', 'In layout - someProp: wycats');

  assertFired(instance, 'didReceiveAttrs', 2);
  assertFired(instance, 'willUpdate', 1);
  assertFired(instance, 'willRender', 2);
  assertFired(instance, 'didUpdate', 1);
  assertFired(instance, 'didRender', 2);
});

// QUnit.skip('[DEPRECATED] non-block with properties on self', function() {
//   // TODO: attrs
//   // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

//   registry.register('template:components/non-block', compile('In layout - someProp: {{someProp}}'));

//   view = EmberView.extend({
//     template: compile('{{non-block someProp="something here"}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
// });

// QUnit.skip('[DEPRECATED] block with properties on self', function() {
//   // TODO: attrs
//   // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

//   registry.register('template:components/with-block', compile('In layout - someProp: {{someProp}} - {{yield}}'));

//   view = EmberView.extend({
//     template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
// });

//   QUnit.skip('moduleName is available on _renderNode when a layout is present', function() {
//     expect(1);

//     let layoutModuleName = 'my-app-name/templates/components/sample-component';
//     let sampleComponentLayout = compile('<sample-component>Sample Component - {{yield}}</sample-component>', {
//       moduleName: layoutModuleName
//     });
//     registry.register('template:components/sample-component', sampleComponentLayout);
//     registry.register('component:sample-component', GlimmerComponent.extend({
//       didInsertElement: function() {
//         equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
//       }
//     }));

//     view = EmberView.extend({
//       layout: compile('<sample-component />'),
//       container
//     }).create();

//     runAppend(view);
//   });

//   QUnit.skip('moduleName is available on _renderNode when no layout is present', function() {
//     expect(1);

//     let templateModuleName = 'my-app-name/templates/application';
//     registry.register('component:sample-component', Component.extend({
//       didInsertElement: function() {
//         equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
//       }
//     }));

//     view = EmberView.extend({
//       layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
//         moduleName: templateModuleName
//       }),
//       container
//     }).create();

//     runAppend(view);
//   });

// QUnit.skip('component without dash is not looked up', function() {
//   expect(1);

//   registry.register('template:components/somecomponent', compile('somecomponent'));

//   view = EmberView.extend({
//     template: compile('{{somecomponent}}'),
//     container: container,
//     context: {
//       'somecomponent': 'notsomecomponent'
//     }
//   }).create();

//   runAppend(view);

//   equal(jQuery('#qunit-fixture').text(), 'notsomecomponent');
// });

// QUnit.skip(`partials templates should not be treated like a component layout for ${style.name}`, function() {
//   registry.register('template:_zomg', compile(`<p>In partial</p>`));
//   registry.register('template:components/non-block', compile(`<${style.tagName}>{{partial "zomg"}}</${style.tagName}>`));

//   view = appendViewFor('<non-block />');

//   let el = view.$(style.tagName).find('p');
//   equal(el.length, 1, 'precond - the partial was rendered');
//   equal(el.text(), 'In partial');
//   strictEqual(el.attr('id'), undefined, 'the partial should not get an id');
//   strictEqual(el.attr('class'), undefined, 'the partial should not get a class');
// });

//   QUnit.skip('[FRAGMENT] non-block rendering a fragment', function() {
//     registry.register('template:components/non-block', compile('<p>{{attrs.first}}</p><p>{{attrs.second}}</p>'));

//     view = appendViewFor('<non-block first={{view.first}} second={{view.second}} />', {
//       first: 'first1',
//       second: 'second1'
//     });

//     equal(view.$().html(), '<p>first1</p><p>second1</p>', 'No wrapping element was created');

//     run(view, 'setProperties', {
//       first: 'first2',
//       second: 'second2'
//     });

//     equal(view.$().html(), '<p>first2</p><p>second2</p>', 'The fragment was updated');
//   });

// // TODO: When un-skipping, fix this so it handles all styles
// QUnit.skip('non-block recursive invocations with outer attributes replaced with a div shadows inner attributes', function() {
//   registry.register('template:components/non-block-wrapper', compile('<non-block />'));
//   registry.register('template:components/non-block', compile('<div data-static="static" data-dynamic="{{internal}}" />'));

//   view = appendViewFor('<non-block-wrapper data-static="outer" data-dynamic="outer" />');

//   equal(view.$('div').attr('data-static'), 'outer', 'the outer-most attribute wins');
//   equal(view.$('div').attr('data-dynamic'), 'outer', 'the outer-most attribute wins');

//   let component = view.childViews[0].childViews[0]; // HAX

//   run(() => component.set('internal', 'changed'));

//   equal(view.$('div').attr('data-static'), 'outer', 'the outer-most attribute wins');
//   equal(view.$('div').attr('data-dynamic'), 'outer', 'the outer-most attribute wins');
// });

// QUnit.skip('components should receive the viewRegistry from the parent view', function() {
//   let outer, innerTemplate, innerLayout;

//   let viewRegistry = {};

//   registry.register('component:x-outer', Component.extend({
//     init() {
//       this._super(...arguments);
//       outer = this;
//     }
//   }));

//   registry.register('component:x-inner-in-template', Component.extend({
//     init() {
//       this._super(...arguments);
//       innerTemplate = this;
//     }
//   }));

//   registry.register('component:x-inner-in-layout', Component.extend({
//     init() {
//       this._super(...arguments);
//       innerLayout = this;
//     }
//   }));

//   registry.register('template:components/x-outer', compile('{{x-inner-in-layout}}{{yield}}'));

//   view = EmberView.extend({
//     _viewRegistry: viewRegistry,
//     template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(innerTemplate._viewRegistry, viewRegistry);
//   equal(innerLayout._viewRegistry, viewRegistry);
//   equal(outer._viewRegistry, viewRegistry);
// });

// QUnit.skip('comopnent should rerender when a property is changed during children\'s rendering', function() {
//   expectDeprecation(/modified value twice in a single render/);

//   let outer, middle;

//   registry.register('component:x-outer', Component.extend({
//     value: 1,
//     grabReference: Ember.on('init', function() {
//       outer = this;
//     })
//   }));

//   registry.register('component:x-middle', Component.extend({
//     value: null,
//     grabReference: Ember.on('init', function() {
//       middle = this;
//     })
//   }));

//   registry.register('component:x-inner', Component.extend({
//     value: null,
//     pushDataUp: Ember.observer('value', function() {
//       middle.set('value', this.get('value'));
//     })
//   }));

//   registry.register('template:components/x-outer', compile('{{#x-middle}}{{x-inner value=value}}{{/x-middle}}'));
//   registry.register('template:components/x-middle', compile('<div id="middle-value">{{value}}</div>{{yield}}'));
//   registry.register('template:components/x-inner', compile('<div id="inner-value">{{value}}</div>'));

//   view = EmberView.extend({
//     template: compile('{{x-outer}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(view.$('#inner-value').text(), '1', 'initial render of inner');
//   equal(view.$('#middle-value').text(), '', 'initial render of middle (observers do not run during init)');

//   run(() => outer.set('value', 2));

//   equal(view.$('#inner-value').text(), '2', 'second render of inner');
//   equal(view.$('#middle-value').text(), '2', 'second render of middle');

//   run(() => outer.set('value', 3));

//   equal(view.$('#inner-value').text(), '3', 'third render of inner');
//   equal(view.$('#middle-value').text(), '3', 'third render of middle');
// });

// QUnit.skip('moduleName is available on _renderNode when a layout is present', function() {
//   expect(1);

//   let layoutModuleName = 'my-app-name/templates/components/sample-component';
//   let sampleComponentLayout = compile('Sample Component - {{yield}}', {
//     moduleName: layoutModuleName
//   });
//   registry.register('template:components/sample-component', sampleComponentLayout);
//   registry.register('component:sample-component', Component.extend({
//     didInsertElement: function() {
//       equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
//     }
//   }));

//   view = EmberView.extend({
//     layout: compile('{{sample-component}}'),
//     container
//   }).create();

//   runAppend(view);
// });

// QUnit.skip('moduleName is available on _renderNode when no layout is present', function() {
//   expect(1);

//   let templateModuleName = 'my-app-name/templates/application';
//   registry.register('component:sample-component', Component.extend({
//     didInsertElement: function() {
//       equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
//     }
//   }));

//   view = EmberView.extend({
//     layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
//       moduleName: templateModuleName
//     }),
//     container
//   }).create();

//   runAppend(view);
// });

// QUnit.skip('`template` specified in a component is overridden by block', function() {
//   expect(1);

//   registry.register('component:with-block', Component.extend({
//     layout: compile('{{yield}}'),
//     template: compile('Oh, noes!')
//   }));

//   view = EmberView.extend({
//     template: compile('{{#with-block}}Whoop, whoop!{{/with-block}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(view.$().text(), 'Whoop, whoop!', 'block provided always overrides template property');
// });

module('Teardown');

QUnit.test('curly components are destroyed', function(assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      destroyed++;
    }
  });

  env.registerEmberishCurlyComponent('destroy-me', DestroyMeComponent as any, 'destroy me!');

  appendViewFor(`{{#if cond}}{{destroy-me}}{{/if}}`, { cond: true });

  assert.strictEqual(destroyed, 0, 'destroy should not be called');

  view.rerender({ cond: false });

  assert.strictEqual(destroyed, 1, 'destroy should be called exactly one');
});

QUnit.test('glimmer components are destroyed', function(assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishGlimmerComponent.extend({
    destroy() {
      this._super();
      destroyed++;
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me', DestroyMeComponent as any, 'destroy me!');

  appendViewFor(`{{#if cond}}<destroy-me />{{/if}}`, { cond: true });

  assert.strictEqual(destroyed, 0, 'destroy should not be called');

  view.rerender({ cond: false });

  assert.strictEqual(destroyed, 1, 'destroy should be called exactly one');
});

QUnit.test('component helpers component are destroyed', function(assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      destroyed++;
    }
  });

  env.registerEmberishCurlyComponent('destroy-me', DestroyMeComponent as any, 'destroy me!');

  let AnotherComponent = EmberishCurlyComponent.extend();

  env.registerEmberishCurlyComponent('another-component', AnotherComponent as any, 'another thing!');

  appendViewFor(`{{component componentName}}`, { componentName: 'destroy-me' });

  assert.strictEqual(destroyed, 0, 'destroy should not be called');

  view.rerender({ componentName: 'another-component' });

  assert.strictEqual(destroyed, 1, 'destroy should be called exactly one');
});

QUnit.test('components inside a list are destroyed', function(assert) {
  let destroyed = [];

  let DestroyMeComponent = EmberishGlimmerComponent.extend({
    destroy() {
      this._super();
      destroyed.push(this.attrs.item);
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me', DestroyMeComponent as any, 'destroy me!');

  appendViewFor(`{{#each list key='@primitive' as |item|}}<destroy-me item={{item}} />{{/each}}`, { list: [1,2,3,4,5] });

  assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

  view.rerender({ list: [1,2,3] });

  assert.deepEqual(destroyed, [4,5], 'destroy should be called exactly twice');

  view.rerender({ list: [3,2,1] });

  assert.deepEqual(destroyed, [4,5], 'destroy should be called exactly twice');

  view.rerender({ list: [] });

  assert.deepEqual(destroyed, [4,5,3,2,1], 'destroy should be called for each item');
});

QUnit.test('components that are "destroyed twice" are destroyed once', function(assert) {
  let destroyed = [];

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      destroyed.push(this.attrs.from);
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      destroyed.push(this.attrs.from);
    }
  });

  env.registerEmberishCurlyComponent('destroy-me', DestroyMeComponent as any, '{{#if @cond}}{{destroy-me-inner from="inner"}}{{/if}}');
  env.registerEmberishCurlyComponent('destroy-me-inner', DestroyMe2Component as any, 'inner');

  appendViewFor(`{{#if cond}}{{destroy-me from="root" cond=child.cond}}{{/if}}`, { cond: true, child: { cond: true } });

  assert.deepEqual(destroyed, [], 'destroy should not be called');

  view.rerender({ cond: false, child: { cond: false } });

  assert.deepEqual(destroyed, ['root', 'inner'], 'destroy should be called exactly once per component');
});

QUnit.test('deeply nested destructions', function(assert) {
  let destroyed = [];

  let DestroyMe1Component = EmberishGlimmerComponent.extend({
    destroy() {
      this._super();
      destroyed.push(`destroy-me1: ${this.attrs.item}`);
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      destroyed.push(`destroy-me2: ${this.attrs.from} - ${this.attrs.item}`);
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me1', DestroyMe1Component as any, '<div>{{#destroy-me2 item=@item from="destroy-me1"}}{{yield}}{{/destroy-me2}}</div>');
  env.registerEmberishCurlyComponent('destroy-me2', DestroyMe2Component as any, 'Destroy me! {{yield}}');

  appendViewFor(`{{#each list key='@primitive' as |item|}}<destroy-me1 item={{item}}>{{#destroy-me2 from="root" item=item}}{{/destroy-me2}}</destroy-me1>{{/each}}`, { list: [1,2,3,4,5] });

  assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

  view.rerender({ list: [1,2,3] });

  assert.deepEqual(destroyed, [
    "destroy-me1: 4",
    "destroy-me2: destroy-me1 - 4",
    "destroy-me2: root - 4",
    "destroy-me1: 5",
    "destroy-me2: destroy-me1 - 5",
    "destroy-me2: root - 5"
  ], 'destroy should be called exactly twice');

  destroyed = [];

  view.rerender({ list: [3,2,1] });

  assert.deepEqual(destroyed, [], 'destroy should be called exactly twice');

  view.rerender({ list: [] });

  assert.deepEqual(destroyed, [
    "destroy-me1: 3",
    "destroy-me2: destroy-me1 - 3",
    "destroy-me2: root - 3",
    "destroy-me1: 2",
    "destroy-me2: destroy-me1 - 2",
    "destroy-me2: root - 2",
    "destroy-me1: 1",
    "destroy-me2: destroy-me1 - 1",
    "destroy-me2: root - 1"
  ], 'destroy should be called for each item');
});

QUnit.test('components inside the root are destroyed when the render result is destroyed', function(assert) {
  let glimmerDestroyed = false;
  let curlyDestroyed = false;

  let DestroyMe1Component = EmberishGlimmerComponent.extend({
    destroy() {
      this._super();
      glimmerDestroyed = true;
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy() {
      this._super();
      curlyDestroyed = true;
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me1', DestroyMe1Component as any, '<div>Destry me!</div>');
  env.registerEmberishCurlyComponent('destroy-me2', DestroyMe2Component as any, 'Destroy me too!');

  appendViewFor(`<destroy-me1 id="destroy-me1"/>{{destroy-me2 id="destroy-me2"}}`);

  assert.strictEqual(glimmerDestroyed, false, 'the glimmer component should not be destroyed');
  assert.strictEqual(curlyDestroyed, false, 'the curly component should not be destroyed');

  view.destroy();

  assert.strictEqual(glimmerDestroyed, true, 'the glimmer component destroy hook was called');
  assert.strictEqual(curlyDestroyed, true, 'the glimmer component destroy hook was called');

  assert.strictEqual(document.querySelectorAll('#destroy-me1').length, 0, 'component DOM node was removed from DOM');
  assert.strictEqual(document.querySelectorAll('#destroy-me2').length, 0, 'component DOM node was removed from DOM');

  assert.strictEqual(document.querySelector('#qunit-fixture').childElementCount, 0, 'root view was removed from DOM');
});

QUnit.test('tagless components render properly', function(assert) {
  class FooBar extends BasicComponent {}

  env.registerStaticTaglessComponent('foo-bar', FooBar, `Michael Jordan says "Go Tagless"`);

  appendViewFor(`{{foo-bar}}`);
  assertAppended('Michael Jordan says "Go Tagless"');

  rerender();

  assertAppended('Michael Jordan says "Go Tagless"');
});

module('late bound layout');

QUnit.test('can bind the layout late', function(assert) {
  class FooBar extends EmberishCurlyComponent {
    layout = 'Swap - {{yield}}';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, null);

  appendViewFor('{{#foo-bar}}YIELD{{/foo-bar}}');

  equalsElement(view.element, 'div', {
    class: classes('ember-view'),
    id: regex(/^ember\d*$/)
  }, 'Swap - YIELD');
});
