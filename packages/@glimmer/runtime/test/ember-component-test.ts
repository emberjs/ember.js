import EmberObject, {
  alias
} from "@glimmer/object";
import { CLASS_META, setProperty as set, UpdatableReference } from '@glimmer/object-reference';
import {
  BasicComponent,
  classes,
  EmberishCurlyComponent,
  EmberishGlimmerComponent,
  equalsElement,
  equalTokens,
  inspectHooks,
  regex,
  stripTight,
  TestDynamicScope,
  TestEnvironment,
  TestModifierManager,
} from "@glimmer/test-helpers";
import { assign } from "@glimmer/util";
import { RenderResult, Template } from '../index';
import { assert, module as nestedModule } from './support';

export class EmberishRootView extends EmberObject {
  public element: Element;

  protected template: Template;
  protected result: RenderResult;

  private parent: Element;

  constructor(
    protected env: TestEnvironment,
    template: string,
    context?: Object
  ) {
    super(context);
    this.template = env.compile(template);
  }

  appendTo(selector: string) {
    let element = this.parent = document.querySelector(selector)!;
    let self = new UpdatableReference(this);
    let templateIterator = this.template.render({ env: this.env, self, parentNode: element, dynamicScope: new TestDynamicScope() });

    let result;
    do {
      result = templateIterator.next();
    } while (!result.done);

    this.result = result.value!;

    this.element = element.firstElementChild!;
  }

  rerender(context: Object | null = null) {
    if (context) {
      this.setProperties(context);
    }

    this.env.begin();
    this.result.rerender();
    this.env.commit();

    this.element = this.parent.firstElementChild!;
  }

  destroy() {
    super.destroy();
    if (this.result) {
      this.result.destroy();
    }
  }
}

EmberishRootView[CLASS_META].seal();

let view: EmberishRootView, env: TestEnvironment;

function module(name: string) {
  QUnit.module(`[components] ${name}`, {
    beforeEach() {
      env = new TestEnvironment();
    }
  });
}

function top<T>(stack: T[]): T {
  return stack[stack.length - 1];
}

let Glimmer: any;
let Curly: any;
let Dynamic: any;

nestedModule("Components", hooks => {
  hooks.beforeEach(() => env = new TestEnvironment());

  top(QUnit.config['moduleStack']);

  nestedModule("Glimmer", () => {
    Glimmer = top(QUnit.config['moduleStack']);
  });

  nestedModule("Curly", () => {
    Curly = top(QUnit.config['moduleStack']);
  });

  nestedModule("Component Helper", () => {
    Dynamic = top(QUnit.config['moduleStack']);
  });

});
// let Component = QUnit.config['moduleStack'].pop();

// module("Components - generic - props");

export function appendViewFor(template: string, context: Object = {}) {
  view = new EmberishRootView(env, template, context);

  env.begin();
  view.appendTo('#qunit-fixture');
  env.commit();

  return view;
}

export function assertAppended(content: string) {
  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), content);
}

function assertText(expected: string) {
  let rawText = (document.querySelector('#qunit-fixture') as HTMLElement).innerText;
  let text = rawText.split(/[\r\n]/g).map((part) => {
    let p = part.replace(/\s+/g, ' ');
    return p.trim();
  }).filter((part) => part !== '').join(' ');
  QUnit.assert.strictEqual(text, expected, `#qunit-fixture content should be: \`${expected}\``);
}

function assertFired(component: EmberishGlimmerComponent, name: string, count = 1) {
  let hooks = component['hooks'];

  if (!hooks) {
    throw new TypeError("Not hooked: " + component);
  }

  if (name in hooks) {
    assert.strictEqual(hooks[name], count, `The ${name} hook fired ${count} ${count === 1 ? 'time' : 'times'}`);
  } else {
    assert.ok(false, `The ${name} hook fired`);
  }
}

function assertEmberishElement(tagName: string, attrs: Object, contents: string): void;
function assertEmberishElement(tagName: string, attrs: Object): void;
function assertEmberishElement(tagName: string, contents: string): void;
function assertEmberishElement(tagName: string): void;
function assertEmberishElement(...args: any[]): void {
  let tagName, attrs, contents;
  if (args.length === 2) {
    if (typeof args[1] === 'string')[tagName, attrs, contents] = [args[0], {}, args[1]];
    else[tagName, attrs, contents] = [args[0], args[1], null];
  } else if (args.length === 1) {
    [tagName, attrs, contents] = [args[0], {}, null];
  } else {
    [tagName, attrs, contents] = args;
  }

  let fullAttrs = assign({ class: classes('ember-view'), id: regex(/^ember\d*$/) }, attrs);
  equalsElement(view.element, tagName, fullAttrs, contents);
}

export function assertElementIsEmberishElement(element: Element | null, tagName: string, attrs: Object, contents: string): void;
export function assertElementIsEmberishElement(element: Element | null, tagName: string, attrs: Object): void;
export function assertElementIsEmberishElement(element: Element | null, tagName: string, contents: string): void;
export function assertElementIsEmberishElement(element: Element | null, tagName: string): void;
export function assertElementIsEmberishElement(element: Element | null, ...args: any[]): void {
  let tagName, attrs, contents;
  if (args.length === 2) {
    if (typeof args[1] === 'string')[tagName, attrs, contents] = [args[0], {}, args[1]];
    else[tagName, attrs, contents] = [args[0], args[1], null];
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

    let beforeModule = QUnit.config['currentModule'];
    QUnit.config['moduleStack'].push(Curly);
    QUnit.config['currentModule'] = Curly;

    test(`curly: ${title}`, assert => {
      if (typeof layout !== 'string') throw new Error('Only string layouts are supported for curly tests');

      env.registerEmberishCurlyComponent('test-component', EmberishCurlyComponent, layout);
      let list = ['test-component'];

      Object.keys(attributes).forEach(() => {
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

    QUnit.config['moduleStack'].pop();
    QUnit.config['currentModule'] = beforeModule;
  }

  if (!kind || kind === 'curly' || kind === 'dynamic') {
    let test = skip === 'dynamic' ? QUnit.skip : QUnit.test;

    let beforeModule = QUnit.config['currentModule'];
    QUnit.config['moduleStack'].push(Dynamic);
    QUnit.config['currentModule'] = Dynamic;

    test(`curly - component helper: ${title}`, assert => {
      env.registerEmberishCurlyComponent('test-component', EmberishCurlyComponent, layout as string);
      env.registerEmberishCurlyComponent('test-component2', EmberishCurlyComponent, `${layout} -- 2`);

      let list = ['component', 'componentName'];

      Object.keys(attributes).forEach(() => {
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

    QUnit.config['moduleStack'].pop();
    QUnit.config['currentModule'] = beforeModule;
  }

  if (!kind || kind === 'glimmer') {
    let test = skip === 'glimmer' ? QUnit.skip : QUnit.test;

    let beforeModule = QUnit.config['currentModule'];
    QUnit.config['moduleStack'].push(Glimmer);
    QUnit.config['currentModule'] = Glimmer;

    test(`glimmer: ${title}`, assert => {
      let layoutOptions: TagOptions;

      if (typeof layout === 'string') {
        layoutOptions = { attributes: {}, args: {}, template: layout };
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
        assert.ok(true, `Updating with ${JSON.stringify(update)}`);
        view.rerender(update.context);
        assertExpected('aside', update.expected, attributes);
      });
    });

    QUnit.config['moduleStack'].pop();
    QUnit.config['currentModule'] = beforeModule;
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

[
  {
    value: 'true',
    output: 'true'
  }, {
    value: 'false',
    output: 'false'
  }, {
    value: 'null',
    output: ''
  }, {
    value: 'undefined',
    output: ''
  }, {
    value: '1',
    output: '1'
  }, {
    value: '"foo"',
    output: 'foo'
  }
].forEach(({ value, output }) => {
  testComponent(`yielding ${value}`, {
    layout: `{{yield ${value}}}`,

    invokeAs: {
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}'
    },

    expected: `${output}-`
  });
});

testComponent(`yielding a string and rendering its length`, {
  layout: `{{yield "foo"}}-{{yield ""}}`,

  invokeAs: {
    blockParams: ['yielded'],
    template: '{{yielded}}-{{yielded.length}}'
  },

  expected: `foo-3--0`
});

testComponent('use a non-existent block param', {
  skip: 'glimmer',
  layout: '{{yield someValue}}',

  invokeAs: {
    args: { someValue: '42' },
    blockParams: ['val1', 'val2'],
    template: '{{val1}} - {{val2}}'
  },

  expected: '42 - '
});

testComponent('yield to inverse', {
  skip: 'glimmer',
  layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    args: { predicate: 'activated', someValue: '42' },
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

module('Manager#create - hasBlock');

QUnit.test('when no block present', () => {
  class FooBar extends EmberishCurlyComponent {
    tagName = 'div';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `{{HAS_BLOCK}}`);

  appendViewFor(`{{foo-bar}}`);

  assertEmberishElement('div', {}, `false`);
});

QUnit.test('when block present', () => {
  class FooBar extends EmberishCurlyComponent {
    tagName = 'div';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `{{HAS_BLOCK}}`);

  appendViewFor(`{{#foo-bar}}{{/foo-bar}}`);

  assertEmberishElement('div', {}, `true`);
});

module('Dynamically-scoped variable accessors');

testComponent('Can get and set dynamic variable', {
  layout: '{{#-with-dynamic-vars myKeyword=@value}}{{yield}}{{/-with-dynamic-vars}}',
  invokeAs: {
    template: '{{-get-dynamic-var "myKeyword"}}',
    context: { value: "hello" },
    args: { value: 'value' }
  },
  expected: 'hello',
  updates: [{
    expected: 'hello'
  }, {
    context: { value: 'goodbye' },
    expected: 'goodbye'
  }]
});

testComponent('Can get and set dynamic variable with bound names', {
  layout: '{{#-with-dynamic-vars myKeyword=@value1 secondKeyword=@value2}}{{yield}}{{/-with-dynamic-vars}}',
  invokeAs: {
    template: '{{keyword}}-{{-get-dynamic-var keyword}}',
    context: { value1: "hello", value2: "goodbye", keyword: "myKeyword" },
    args: { value1: "value1", value2: "value2" }
  },
  expected: 'myKeyword-hello',
  updates: [{
    expected: 'myKeyword-hello'
  }, {
    context: { keyword: 'secondKeyword' },
    expected: 'secondKeyword-goodbye'
  }, {
    context: { value2: 'goodbye!' },
    expected: 'secondKeyword-goodbye!'
  }, {
    context: { value1: "hello", value2: "goodbye", keyword: "myKeyword" },
    expected: 'myKeyword-hello'
  }]
});

testComponent('Can shadow existing dynamic variable', {
  layout: '{{#-with-dynamic-vars myKeyword=@outer}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{#-with-dynamic-vars myKeyword=@inner}}{{yield}}{{/-with-dynamic-vars}}<div>{{-get-dynamic-var "myKeyword"}}</div>{{/-with-dynamic-vars}}',
  invokeAs: {
    template: '<div>{{-get-dynamic-var "myKeyword"}}</div>',
    context: { outer: 'original', inner: 'shadowed' },
    args: { outer: 'outer', inner: 'inner' }
  },
  expected: '<div>original</div><div>shadowed</div><div>original</div>',
  updates: [{
    expected: '<div>original</div><div>shadowed</div><div>original</div>'
  }, {
    context: { outer: 'original2', inner: 'shadowed' },
    expected: '<div>original2</div><div>shadowed</div><div>original2</div>'
  }, {
    context: { outer: 'original2', inner: 'shadowed2' },
    expected: '<div>original2</div><div>shadowed2</div><div>original2</div>'
  }]
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

QUnit.test('initially missing, then present, then missing', () => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>{{@arg1}}</p>`);

  appendViewFor(
    stripTight`
      <div>
        {{component something arg1="hello"}}
      </div>`,
    {
      something: undefined
    }
  );

  equalsElement(view.element, 'div', {}, '<!---->');

  set(view, 'something', 'foo-bar');
  rerender();

  equalsElement(view.element, 'div', {}, '<p>hello</p>');

  set(view, 'something', undefined);
  rerender();

  equalsElement(view.element, 'div', {}, '<!---->');
});

QUnit.test('initially present, then missing, then present', () => {
  env.registerBasicComponent('foo-bar', BasicComponent, `<p>foo bar baz</p>`);

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

QUnit.test('dynamic tagName', () => {
  class FooBar extends EmberishCurlyComponent {
    tagName = 'aside';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `Hello. It's me.`);

  appendViewFor(`{{foo-bar}}`);
  assertEmberishElement('aside', {}, `Hello. It's me.`);

  rerender();

  assertEmberishElement('aside', {}, `Hello. It's me.`);
});

QUnit.test('dynamic tagless component', () => {
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
  let fooBarInstance: FooBar | undefined;

  class FooBar extends EmberishCurlyComponent {
    attributeBindings = ['style'];
    style: string | null = null;

    constructor(attrs: any) {
      super(attrs);
      this.style = 'color: red;';
      fooBarInstance = this;
    }
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `Hello. It's me.`);

  appendViewFor(`{{foo-bar}}`);
  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);

  rerender();

  assert.ok(fooBarInstance, 'expected foo-bar to be set');

  if (fooBarInstance === undefined) { return; }

  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);

  fooBarInstance.style = 'color: green;';
  rerender();

  assertEmberishElement('div', { 'style': 'color: green;' }, `Hello. It's me.`);

  fooBarInstance.style = null;
  rerender();

  assertEmberishElement('div', {}, `Hello. It's me.`);

  fooBarInstance.style = 'color: red;';
  rerender();

  assertEmberishElement('div', { 'style': 'color: red;' }, `Hello. It's me.`);
});

module("Components - generic - attrs");

QUnit.test('using @value from emberish curly component', () => {
  class FooBar extends EmberishCurlyComponent {
    static positionalParams = ['foo'];
    tagName = 'div';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `{{@blah}}`);

  appendViewFor(`{{foo-bar first blah="derp"}}`);

  assertEmberishElement('div', {}, `derp`);
});

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

QUnit.test('correct scope - accessing local variable in yielded block (glimmer component)', () => {
  class FooBar extends BasicComponent { }

  env.registerBasicComponent('foo-bar', FooBar, `<div>[Layout: {{zomg}}][Layout: {{lol}}][Layout: {{@foo}}]{{yield}}</div>`);

  appendViewFor(
    stripTight`
      <div>
        [Outside: {{zomg}}]
        {{#with zomg as |lol|}}
          [Inside: {{zomg}}]
          [Inside: {{lol}}]
          <foo-bar @foo={{zomg}}>
            [Block: {{zomg}}]
            [Block: {{lol}}]
          </foo-bar>
        {{/with}}
      </div>`,
    { zomg: "zomg" }
  );

  equalsElement(view.element, 'div', {},
    stripTight`
        [Outside: zomg]
        [Inside: zomg]
        [Inside: zomg]
        <div>
          [Layout: ]
          [Layout: ]
          [Layout: zomg]
          [Block: zomg]
          [Block: zomg]
        </div>`
  );
});

QUnit.test('correct scope - accessing local variable in yielded block (curly component)', () => {
  class FooBar extends EmberishCurlyComponent {
    public tagName = '';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, `[Layout: {{zomg}}][Layout: {{lol}}][Layout: {{foo}}]{{yield}}`);

  appendViewFor(
    stripTight`
      <div>
        [Outside: {{zomg}}]
        {{#with zomg as |lol|}}
          [Inside: {{zomg}}]
          [Inside: {{lol}}]
          {{#foo-bar foo=zomg}}
            [Block: {{zomg}}]
            [Block: {{lol}}]
          {{/foo-bar}}
        {{/with}}
      </div>`,
    { zomg: "zomg" }
  );

  equalsElement(view.element, 'div', {},
    stripTight`
        [Outside: zomg]
        [Inside: zomg]
        [Inside: zomg]
        [Layout: ]
        [Layout: ]
        [Layout: zomg]
        [Block: zomg]
        [Block: zomg]`
  );
});

QUnit.test('correct scope - caller self can be threaded through (curly component)', () => {
  // demonstrates ability for Ember to know the target object of curly component actions
  class Base extends EmberishCurlyComponent {
    public tagName = '';
  }
  class FooBar extends Base {
    public name = 'foo-bar';
  }

  class QuxDerp extends Base {
    public name = 'qux-derp';
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, stripTight`
    [Name: {{name}} | Target: {{targetObject.name}}]
    {{#qux-derp}}
      [Name: {{name}} | Target: {{targetObject.name}}]
    {{/qux-derp}}
    [Name: {{name}} | Target: {{targetObject.name}}]
  `);

  env.registerEmberishCurlyComponent('qux-derp', QuxDerp, `[Name: {{name}} | Target: {{targetObject.name}}]{{yield}}`);

  appendViewFor(`<div>{{foo-bar}}</div>`, {
    name: 'outer-scope'
  });

  equalsElement(view.element, 'div', {},
    stripTight`
        [Name: foo-bar | Target: outer-scope]
        [Name: qux-derp | Target: foo-bar]
        [Name: foo-bar | Target: outer-scope]
        [Name: foo-bar | Target: outer-scope]
        `
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

QUnit.test('correct scope - simple', () => {
  env.registerBasicComponent('sub-item', BasicComponent,
    `<p>{{@name}}</p>`
  );

  let subitems = [{ id: 0 }, { id: 1 }, { id: 42 }];

  appendViewFor(
    stripTight`
      <div>
        {{#each items key="id" as |item|}}
          <sub-item @name={{item.id}} />
        {{/each}}
      </div>`
    , { items: subitems });

  equalsElement(view.element, 'div', {}, '<p>0</p><p>1</p><p>42</p>');
});

QUnit.test('correct scope - self lookup inside #each', () => {
  env.registerBasicComponent('sub-item', BasicComponent,
    `<p>{{@name}}</p>`
  );

  let subitems = [{ id: 0 }, { id: 1 }, { id: 42 }];

  appendViewFor(
    stripTight`
      <div>
        {{#each items key="id" as |item|}}
          <sub-item @name={{this.id}} />
          <sub-item @name={{id}} />
          <sub-item @name={{item.id}} />
        {{/each}}
      </div>`
    , { items: subitems, id: '(self)' });

  equalsElement(view.element, 'div', {}, stripTight`
    <p>(self)</p><p>(self)</p><p>0</p>
    <p>(self)</p><p>(self)</p><p>1</p>
    <p>(self)</p><p>(self)</p><p>42</p>`);
});

QUnit.test('correct scope - complex', () => {
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

QUnit.test('correct scope - complex yield', () => {
  env.registerEmberishCurlyComponent('item-list', EmberishCurlyComponent.extend() as any,
    stripTight`
      <ul>
        {{#each items key="id" as |item|}}
          <li>{{item.id}}: {{yield item}}</li>
        {{/each}}
      </ul>`
  );

  let items = [
    { id: '1', name: 'Foo', description: 'Foo!' },
    { id: '2', name: 'Bar', description: 'Bar!' },
    { id: '3', name: 'Baz', description: 'Baz!' }
  ];

  appendViewFor(
    stripTight`
      {{#item-list items=items as |item|}}
        {{item.name}}{{#if showDescription}} - {{item.description}}{{/if}}
      {{/item-list}}`
    , { items, showDescription: false }
  );

  assertEmberishElement('div',
    stripTight`
      <ul>
        <li>1: Foo<!----></li>
        <li>2: Bar<!----></li>
        <li>3: Baz<!----></li>
      </ul>`
  );

  view.rerender({ items, showDescription: true });

  assertEmberishElement('div',
    stripTight`
      <ul>
        <li>1: Foo - Foo!</li>
        <li>2: Bar - Bar!</li>
        <li>3: Baz - Baz!</li>
      </ul>`
  );
});

QUnit.test('correct scope - self', () => {
  class FooBar extends BasicComponent {
    public foo = 'foo';
    public bar = 'bar';
  }

  env.registerBasicComponent('foo-bar', FooBar, `<p>{{foo}} {{bar}} {{@baz}}</p>`);

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
        <p>foo bar </p>
        <p>foo bar zomg</p>`
  );
});

module('Curly Components - smoke test dynamicScope access');

QUnit.test('component has access to dynamic scope', function () {
  class SampleComponent extends EmberishCurlyComponent {
    static fromDynamicScope = ['theme'];
  }

  SampleComponent[CLASS_META].seal();

  env.registerEmberishCurlyComponent('sample-component', SampleComponent, '{{theme}}');

  appendViewFor('{{#-with-dynamic-vars theme="light"}}{{sample-component}}{{/-with-dynamic-vars}}');

  assertEmberishElement('div', 'light');
});

module('Curly Components - positional arguments');

QUnit.test('static named positional parameters', function () {
  class SampleComponent extends EmberishCurlyComponent {
    static positionalParams = ['person', 'age'];
  }

  SampleComponent[CLASS_META].seal();

  env.registerEmberishCurlyComponent('sample-component', SampleComponent, '{{person}}{{age}}');

  appendViewFor('{{sample-component "Quint" 4}}');

  assertEmberishElement('div', 'Quint4');
});

QUnit.test('dynamic named positional parameters', function () {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['person', 'age']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{person}}{{age}}');

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

QUnit.test('if a value is passed as a non-positional parameter, it takes precedence over the named one', assert => {
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

QUnit.test('static arbitrary number of positional parameters', function () {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each names key="@index" as |name|}}{{name}}{{/each}}');

  appendViewFor(
    stripTight`<div>{{sample-component "Foo" 4 "Bar"}}
      {{sample-component "Foo" 4 "Bar" 5 "Baz"}}
      {{!sample-component "Foo" 4 "Bar" 5 "Baz"}}</div>`);

  let first = <Element>view.element.firstChild;
  let second = <Element>first.nextSibling;
  // let third = <Element>second.nextSibling;

  assertElementIsEmberishElement(first, 'div', 'Foo4Bar');
  assertElementIsEmberishElement(second, 'div', 'Foo4Bar5Baz');
  // equalsElement(third, ...emberishElement('div', { id: 'helper' }, 'Foo4Bar5Baz'));
});

QUnit.test('arbitrary positional parameter conflict with hash parameter is reported', assert => {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each attrs.names key="@index" as |name|}}{{name}}{{/each}}');

  assert.throws(function () {
    appendViewFor('{{sample-component "Foo" 4 "Bar" names=numbers id="args-3"}}', {
      numbers: [1, 2, 3]
    });
  }, `You cannot specify positional parameters and the hash argument \`names\`.`);
});

QUnit.test('can use hash parameter instead of arbitrary positional param [GH #12444]', function () {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each names key="@index" as |name|}}{{name}}{{/each}}');

  appendViewFor('{{sample-component names=things}}', {
    things: ['Foo', 4, 'Bar']
  });

  assertEmberishElement('div', 'Foo4Bar');
});

QUnit.test('can use hash parameter instead of positional param', function () {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: ['first', 'second']
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{first}} - {{second}}');

  appendViewFor(`<div>
    {{sample-component "one" "two"}}
    {{sample-component "one" second="two"}}
    {{sample-component first="one" second="two"}}</div>
  `, {
      things: ['Foo', 4, 'Bar']
    });

  let first = view.element.firstElementChild;
  let second = first && first.nextElementSibling;
  let third = second && second.nextElementSibling;

  assertElementIsEmberishElement(first, 'div', 'one - two');
  assertElementIsEmberishElement(second, 'div', 'one - two');
  assertElementIsEmberishElement(third, 'div', 'one - two');
});

QUnit.test('dynamic arbitrary number of positional parameters', function () {
  let SampleComponent = EmberishCurlyComponent.extend();

  SampleComponent.reopenClass({
    positionalParams: 'n'
  });

  env.registerEmberishCurlyComponent('sample-component', SampleComponent as any, '{{#each attrs.n key="@index" as |name|}}{{name}}{{/each}}');

  appendViewFor('<div>{{sample-component user1 user2}}{{!component "sample-component" user1 user2}}</div>', {
    user1: 'Foo',
    user2: 4
  });

  let first = view.element.firstElementChild;
  // let second = first.nextElementSibling;

  assertElementIsEmberishElement(first, 'div', 'Foo4');
  // assertElementIsEmberishElement(first, 'div', 'Foo4');

  set(view, 'user1', "Bar");
  set(view, 'user2', "5");
  rerender();

  assertElementIsEmberishElement(first, 'div', 'Bar5');
  // assertElementIsEmberishElement(second, 'div', 'Bar5');

  set(view, 'user2', '6');
  rerender();

  assertElementIsEmberishElement(first, 'div', 'Bar6');
  // assertElementIsEmberishElement(second, 'div', 'Bar6');
});

QUnit.test('{{component}} helper works with positional params', function () {
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

QUnit.skip('components in template of a yielding component should have the proper parentView', (assert) => {
  let outer: EmberishCurlyComponent | undefined;
  let innerTemplate: EmberishCurlyComponent | undefined;
  let innerLayout: EmberishCurlyComponent | undefined;

  let Outer = EmberishCurlyComponent.extend({
    init(this: EmberishCurlyComponent) {
      this._super(...arguments);
      outer = this;
    }
  }) as any;

  let InnerInTemplate = EmberishCurlyComponent.extend({
    init(this: EmberishCurlyComponent) {
      this._super(...arguments);
      innerTemplate = this;
    }
  }) as any;

  let InnerInLayout = EmberishCurlyComponent.extend({
    init(this: EmberishCurlyComponent) {
      this._super(...arguments);
      innerLayout = this;
    }
  }) as any;

  env.registerEmberishCurlyComponent('x-inner-in-layout', InnerInLayout, '');
  env.registerEmberishCurlyComponent('x-inner-in-template', InnerInTemplate, '');
  env.registerEmberishCurlyComponent('x-outer', Outer, `{{x-inner-in-layout}}{{yield}}`);

  appendViewFor('{{#x-outer}}{{#x-inner-in-template}}{{/x-inner-in-template}}{{/x-outer}}');

  assertEmberishElement('div');

  assert.ok(innerTemplate, 'expected inner to render');
  assert.ok(innerLayout, 'expected innerLayout to render');
  assert.ok(outer, 'expected outer to render');

  equalObject(innerTemplate!.parentView as any, outer as any, 'receives the wrapping component as its parentView in template blocks');
  equalObject(innerLayout!.parentView as any, outer as any, 'receives the wrapping component as its parentView in layout');
  equalObject(outer!.parentView as any, view as any, 'x-outer receives the ambient scope as its parentView');
});

function inspect(obj: EmberObject) {
  return obj && `<#Object:${obj._guid}>`;
}

function equalObject(actual: EmberObject, expected: EmberObject, msg: string) {
  QUnit.assert.strictEqual(inspect(actual), inspect(expected), msg);
}

QUnit.skip('newly-added sub-components get correct parentView', function () {
  let outer: EmberishCurlyComponent | undefined;
  let inner: EmberishCurlyComponent | undefined;

  let Outer = EmberishCurlyComponent.extend({
    init(this: EmberishCurlyComponent) {
      this._super(...arguments);
      outer = this;
    }
  });

  let Inner = EmberishCurlyComponent.extend({
    init(this: EmberishCurlyComponent) {
      this._super(...arguments);
      inner = this;
    }
  });

  env.registerEmberishCurlyComponent('x-outer', Outer as any, `{{yield}}`);
  env.registerEmberishCurlyComponent('x-inner', Inner as any, '');

  appendViewFor('{{#x-outer}}{{#if showInner}}{{x-inner}}{{/if}}{{/x-outer}}', { showInner: false });

  equalObject(outer!.parentView as any, view, 'x-outer receives the ambient scope as its parentView');

  set(view, 'showInner', true);
  rerender();

  equalObject(inner!.parentView as any, outer!, 'receives the wrapping component as its parentView in template blocks');
  equalObject(outer!.parentView as any, view, 'x-outer receives the ambient scope as its parentView');
});

module('Emberish closure components');

QUnit.test('component helper can handle aliased block components with args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, 'Hello {{arg1}} {{yield}}');

  appendViewFor(
    stripTight`
      {{#with (hash comp=(component 'foo-bar')) as |my|}}
        {{#component my.comp arg1="World!"}}Test1{{/component}} Test2
      {{/with}}
    `
  );

  assertText('Hello World! Test1 Test2');
});

QUnit.test('component helper can handle aliased block components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, 'Hello {{yield}}');

  appendViewFor(
    stripTight`
      {{#with (hash comp=(component 'foo-bar')) as |my|}}
        {{#component my.comp}}World!{{/component}} Test
      {{/with}}
    `
  );

  assertText('Hello World! Test');
});

QUnit.test('component helper can handle aliased inline components with args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, 'Hello {{arg1}}');

  appendViewFor(
    stripTight`
      {{#with (hash comp=(component 'foo-bar')) as |my|}}
        {{component my.comp arg1="World!"}} Test
      {{/with}}
    `
  );

  assertText('Hello World! Test');
});

QUnit.test('component helper can handle aliased inline components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, 'Hello');

  appendViewFor(
    stripTight`
      {{#with (hash comp=(component 'foo-bar')) as |my|}}
        {{component my.comp}} World!
      {{/with}}
    `
  );

  assertText('Hello World!');
});

QUnit.test('component helper can handle higher order inline components with args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, '{{yield (hash comp=(component "baz-bar"))}}');
  env.registerEmberishCurlyComponent('baz-bar', null, 'Hello {{arg1}}');

  appendViewFor(
    stripTight`
      {{#foo-bar as |my|}}
        {{component my.comp arg1="World!"}} Test
      {{/foo-bar}}
    `
  );

  assertText('Hello World! Test');
});

QUnit.test('component helper can handle higher order inline components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, '{{yield (hash comp=(component "baz-bar"))}}');
  env.registerEmberishCurlyComponent('baz-bar', null, 'Hello');

  appendViewFor(
    stripTight`
      {{#foo-bar as |my|}}
        {{component my.comp}} World!
      {{/foo-bar}}
    `
  );

  assertText('Hello World!');
});

QUnit.test('component helper can handle higher order block components with args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, '{{yield (hash comp=(component "baz-bar"))}}');
  env.registerEmberishCurlyComponent('baz-bar', null, 'Hello {{arg1}} {{yield}}');

  appendViewFor(
    stripTight`
      {{#foo-bar as |my|}}
        {{#component my.comp arg1="World!"}}Test1{{/component}} Test2
      {{/foo-bar}}
    `
  );

  assertText('Hello World! Test1 Test2');
});

QUnit.test('component helper can handle higher order block components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, '{{yield (hash comp=(component "baz-bar"))}}');
  env.registerEmberishCurlyComponent('baz-bar', null, 'Hello {{arg1}} {{yield}}');

  appendViewFor(
    stripTight`
      {{#foo-bar as |my|}}
        {{#component my.comp}}World!{{/component}} Test
      {{/foo-bar}}
    `
  );

  assertText('Hello World! Test');
});

QUnit.test('component deopt can handle aliased inline components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, 'Hello');

  appendViewFor(
    stripTight`
      {{#with (hash comp=(component 'foo-bar')) as |my|}}
        {{my.comp}} World!
      {{/with}}
    `
  );

  assertText('Hello World!');
});

QUnit.test('component deopt can handle higher order inline components without args', () => {
  env.registerEmberishCurlyComponent('foo-bar', null, '{{yield (hash comp=(component "baz-bar"))}}');
  env.registerEmberishCurlyComponent('baz-bar', null, 'Hello');

  appendViewFor(
    stripTight`
      {{#foo-bar as |my|}}
        {{my.comp}} World!
      {{/foo-bar}}
    `
  );

  assertText('Hello World!');
});

QUnit.test('component helper can curry arguments', () => {
  let FooBarComponent = EmberishCurlyComponent.extend();

  FooBarComponent.reopenClass({
    positionalParams: ["one", "two", "three", "four", "five", "six"]
  });

  env.registerEmberishCurlyComponent('foo-bar', FooBarComponent as any, stripTight`
    1. [{{one}}]
    2. [{{two}}]
    3. [{{three}}]
    4. [{{four}}]
    5. [{{five}}]
    6. [{{six}}]

    {{yield}}

    a. [{{a}}]
    b. [{{b}}]
    c. [{{c}}]
    d. [{{d}}]
    e. [{{e}}]
    f. [{{f}}]`);

  appendViewFor(
    stripTight`
      {{#with (component "foo-bar" "outer 1" "outer 2" a="outer a" b="outer b" c="outer c" e="outer e") as |outer|}}
        {{#with (component outer "inner 1" a="inner a" d="inner d" e="inner e") as |inner|}}
          {{#component inner "invocation 1" "invocation 2" a="invocation a" b="invocation b"}}---{{/component}}
        {{/with}}
      {{/with}}
    `

  );
  assertText(stripTight`
    1. [outer 1]
    2. [outer 2]
    3. [inner 1]
    4. [invocation 1]
    5. [invocation 2]
    6. []

    ---

    a. [invocation a]
    b. [invocation b]
    c. [outer c]
    d. [inner d]
    e. [inner e]
    f. []
  `);
});

module("Emberish Component - ids");

QUnit.test('emberish component should have unique IDs', assert => {
  env.registerEmberishCurlyComponent('x-curly', null, '');
  env.registerEmberishGlimmerComponent('x-glimmer', null, '<div />');

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

  assert.equal(Object.keys(IDs).length, 6, "Expected the components to each have a unique IDs");

  for (let id in IDs) {
    assert.equal(IDs[id], 1, `Expected ID ${id} to be unique`);
  }
});

module("Glimmer Component - shadowing");

testComponent('shadowing: normal outer attributes are reflected', {
  kind: 'glimmer',
  layout: 'In layout - someProp: {{@someProp}}',
  invokeAs: { args: { someProp: '"something here"' } },
  expected: { attrs: {}, content: 'In layout - someProp: something here' }
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
    args: { someProp: 'someProp' }
  },
  expected: { attrs: {}, content: 'In layout - someProp: something here' },
  updates: [{
    expected: { attrs: {}, content: 'In layout - someProp: something here' }
  }, {
    context: { someProp: 'something else' },
    expected: { attrs: {}, content: 'In layout - someProp: something else' }
  }, {
    context: { someProp: '' },
    expected: { attrs: {}, content: 'In layout - someProp: ' }
  }, {
    context: { someProp: 'something here' },
    expected: { attrs: {}, content: 'In layout - someProp: something here' }
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

QUnit.test(`Modifiers cannot be on the top-level element`, function () {
  env.registerModifier('foo', new TestModifierManager());
  env.registerEmberishGlimmerComponent('non-block', null, `<div {{foo bar}}>Should error</div>`);
  assert.throws(() => {
    appendViewFor('<non-block />');
  }, `Found modifier "foo" on the top-level element of "non-block". Modifiers cannot be on the top-level element.`);
});

let styles = [{
  name: 'a div',
  tagName: 'div',
  test: QUnit.test
}, {
  name: 'an identity element',
  tagName: 'non-block',
  test: QUnit.test
}, {
  name: 'a web component',
  tagName: 'not-an-ember-component',
  test: QUnit.test
}];

styles.forEach(style => {
  style.test(`non-block without attributes replaced with ${style.name}`, assert => {
    env.registerEmberishGlimmerComponent('non-block', null, `  <${style.tagName}>In layout</${style.tagName}>  `);

    appendViewFor('<non-block />');

    let node = view.element.firstChild;
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');

    rerender();

    assert.strictEqual(node, view.element.firstChild, 'The inner element has not changed');
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  style.test(`non-block with attributes replaced with ${style.name}`, function () {
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

    assert.strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  QUnit.skip(`non-block replaced with ${style.name} (regression with single element in the root element)`, function () {
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

    assert.strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');
  });

  QUnit.skip(`non-block with class replaced with ${style.name} merges classes`, function () {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `<${style.tagName} class="inner-class" />`);

    appendViewFor('<non-block class="{{outer}}" />', { outer: 'outer' });

    equalsElement(view.element, style.tagName, { class: classes('inner-class outer ember-view'), id: regex(/^ember\d*$/) }, '');

    set(view, 'outer', 'new-outer');
    rerender();

    equalsElement(view.element, style.tagName, { class: classes('inner-class new-outer ember-view'), id: regex(/^ember\d*$/) }, '');
  });

  QUnit.skip(`non-block with outer attributes replaced with ${style.name} shadows inner attributes`, function () {
    let component: MyComponent | undefined;

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

  QUnit.skip(`non-block replaced with ${style.name} should have correct scope`, function () {
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

  QUnit.skip(`non-block replaced with ${style.name} should have correct 'element'`, function () {
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

  QUnit.skip(`non-block replaced with ${style.name} should have inner attributes`, function () {
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

  QUnit.skip(`only text attributes are reflected on the underlying DOM element (${style.name})`, function () {
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

QUnit.test(`Ensure components can be invoked`, function () {
  env.registerEmberishGlimmerComponent('x-outer', null, `<x-inner></x-inner>`);
  env.registerEmberishGlimmerComponent('x-inner', null, `<div>hi!</div>`);

  appendViewFor('<x-outer />');
  equalsElement(view.element, 'div', { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'hi!');
});

QUnit.test(`Glimmer component with element modifier`, function (assert) {
  env.registerEmberishGlimmerComponent('non-block', null, `  <div>In layout</div>  `);

  assert.throws(() => {
    appendViewFor('<non-block {{action}} />');
  }, new Error("Compile Error: Element modifiers are not allowed in components"), "should throw error");
});

QUnit.skip('block without properties', function () {
  env.registerEmberishGlimmerComponent('with-block', EmberishGlimmerComponent, '<with-block>In layout - {{yield}}</with-block>');

  appendViewFor('<with-block>In template</with-block>');

  equalsElement(view.element, 'with-block', { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'In layout - In template');
});

QUnit.skip('attributes are not installed on the top level', assert => {
  let component: NonBlock | undefined;

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
  assert.equal(component!.attrs['text'], 'texting');
  assert.equal(component!.attrs['dynamic'], 'dynamic');
  assert.strictEqual(component!['text'], null);
  assert.strictEqual(component!['dynamic'], null);

  rerender();

  equalsElement(view.element, 'non-block', {
    class: classes('ember-view'),
    id: regex(/^ember\d*$/),
    text: 'texting'
  }, 'In layout - texting -- <!---->');
  assert.equal(component!.attrs['text'], 'texting');
  assert.equal(component!.attrs['dynamic'], 'dynamic');
  assert.strictEqual(component!['text'], null);
  assert.strictEqual(component!['dynamic'], null);
});

QUnit.skip('non-block with properties on attrs and component class', function () {
  env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, '<non-block>In layout - someProp: {{attrs.someProp}}</non-block>');

  appendViewFor('<non-block someProp="something here" />');

  assertEmberishElement('non-block', { someProp: 'something here' }, 'In layout - someProp: something here');
});

QUnit.skip('block with properties on attrs', function () {
  env.registerEmberishGlimmerComponent(
    'with-block',
    EmberishGlimmerComponent,
    '<with-block>In layout - someProp: {{attrs.someProp}} - {{yield}}</with-block>'
  );

  appendViewFor('<with-block someProp="something here">In template</with-block>');

  assertEmberishElement('with-block', { someProp: 'something here' }, 'In layout - someProp: something here - In template');
});

QUnit.skip('computed property alias on a static attr', function () {
  let ComputedAlias = <any>EmberishGlimmerComponent.extend({
    otherProp: alias('attrs.someProp')
  });

  env.registerEmberishGlimmerComponent('computed-alias', ComputedAlias, '<computed-alias>{{otherProp}}</computed-alias>');

  appendViewFor('<computed-alias someProp="value"></computed-alias>', {
    someProp: 'value'
  });

  assertEmberishElement('computed-alias', { someProp: 'value' }, 'value');
});

QUnit.skip('computed property alias on a dynamic attr', function () {
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

QUnit.skip('lookup of component takes priority over property', (assert) => {
  assert.expect(1);

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

QUnit.test('Curly component hooks (with attrs)', assert => {
  let instance: NonBlock | undefined;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{@someProp}}');

  appendViewFor('{{non-block someProp=someProp}}', { someProp: 'wycats' });

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

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

QUnit.test('Curly component hooks (attrs as self props)', function () {
  let instance: NonBlock | undefined;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{someProp}}');

  appendViewFor('{{non-block someProp=someProp}}', { someProp: 'wycats' });

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

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

QUnit.test('Setting value attributeBinding to null results in empty string value', function (assert) {
  let instance: InputComponent | undefined;

  class InputComponent extends EmberishCurlyComponent {
    tagName = 'input';
    attributeBindings = ['value'];
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('input-component', inspectHooks(InputComponent), 'input component');

  appendViewFor('{{input-component value=someProp}}', { someProp: null });

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

  let element: HTMLInputElement = instance.element as HTMLInputElement;

  assert.equal(element.value, '');

  set(view, 'someProp', 'wycats');
  rerender();

  assert.equal(element.value, 'wycats');

  set(view, 'someProp', null);
  rerender();

  assert.equal(element.value, '');
});

QUnit.test('Setting class attributeBinding does not clobber ember-view', assert => {
  let instance: FooBarComponent | undefined;

  class FooBarComponent extends EmberishCurlyComponent {
    attributeBindings = ['class'];
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBarComponent, 'FOO BAR');

  appendViewFor('{{foo-bar class=classes}}', { classes: "foo bar" });

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

  assertEmberishElement('div', { class: classes('ember-view foo bar') }, 'FOO BAR');

  rerender();

  assertEmberishElement('div', { class: classes('ember-view foo bar') }, 'FOO BAR');

  set(view, 'classes', 'foo bar baz');
  rerender();

  assertEmberishElement('div', { class: classes('ember-view foo bar baz') }, 'FOO BAR');

  set(view, 'classes', 'foo bar');
  rerender();

  assertEmberishElement('div', { class: classes('ember-view foo bar') }, 'FOO BAR');
});

QUnit.test('Curly component hooks (force recompute)', assert => {
  let instance: NonBlock | undefined;

  class NonBlock extends EmberishCurlyComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('non-block', inspectHooks(NonBlock), 'In layout - someProp: {{@someProp}}');

  appendViewFor('{{non-block someProp="wycats"}}');

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

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

QUnit.test('Glimmer component hooks', assert => {
  let instance: NonBlock | undefined;

  class NonBlock extends EmberishGlimmerComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishGlimmerComponent('non-block', inspectHooks(NonBlock), '<div>In layout - someProp: {{@someProp}}</div>');

  appendViewFor('<non-block @someProp={{someProp}} />', { someProp: 'wycats' });

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

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

QUnit.test('Glimmer component hooks (force recompute)', assert => {
  let instance: NonBlock | undefined;

  class NonBlock extends EmberishGlimmerComponent {
    init() {
      instance = this;
    }
  }

  env.registerEmberishGlimmerComponent('non-block', inspectHooks(NonBlock), '<div>In layout - someProp: {{@someProp}}</div>');

  appendViewFor('{{non-block someProp="wycats"}}');

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

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

module('Teardown');

QUnit.test('curly components are destroyed', function (assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
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

QUnit.test('glimmer components are destroyed', function (assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishGlimmerComponent.extend({
    destroy(this: EmberishGlimmerComponent) {
      this._super();
      destroyed++;
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me', DestroyMeComponent as any, '<div>destroy me!</div>');

  appendViewFor(`{{#if cond}}<destroy-me />{{/if}}`, { cond: true });

  assert.strictEqual(destroyed, 0, 'destroy should not be called');

  view.rerender({ cond: false });

  assert.strictEqual(destroyed, 1, 'destroy should be called exactly one');
});

QUnit.test('component helpers component are destroyed', function (assert) {
  let destroyed = 0;

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
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

QUnit.test('components inside a list are destroyed', function (assert) {
  let destroyed: number[] = [];

  let DestroyMeComponent = EmberishGlimmerComponent.extend({
    destroy(this: EmberishGlimmerComponent) {
      this._super();
      destroyed.push(this.attrs.item);
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me', DestroyMeComponent as any, '<div>destroy me!</div>');

  appendViewFor(`{{#each list key='@primitive' as |item|}}<destroy-me @item={{item}} />{{/each}}`, { list: [1, 2, 3, 4, 5] });

  assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

  view.rerender({ list: [1, 2, 3] });

  assert.deepEqual(destroyed, [4, 5], 'destroy should be called exactly twice');

  view.rerender({ list: [3, 2, 1] });

  assert.deepEqual(destroyed, [4, 5], 'destroy should be called exactly twice');

  view.rerender({ list: [] });

  assert.deepEqual(destroyed, [4, 5, 3, 2, 1], 'destroy should be called for each item');
});

QUnit.test('components that are "destroyed twice" are destroyed once', function (assert) {
  let destroyed: string[] = [];

  let DestroyMeComponent = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
      this._super();
      destroyed.push(this.attrs.from);
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
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

QUnit.test('deeply nested destructions', function (assert) {
  let destroyed: string[] = [];

  let DestroyMe1Component = EmberishGlimmerComponent.extend({
    destroy(this: EmberishGlimmerComponent) {
      this._super();
      destroyed.push(`destroy-me1: ${this.attrs.item}`);
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
      this._super();
      destroyed.push(`destroy-me2: ${this.attrs.from} - ${this.attrs.item}`);
    }
  });

  env.registerEmberishGlimmerComponent('destroy-me1', DestroyMe1Component as any, '<div>{{#destroy-me2 item=@item from="destroy-me1"}}{{yield}}{{/destroy-me2}}</div>');
  env.registerEmberishCurlyComponent('destroy-me2', DestroyMe2Component as any, 'Destroy me! {{yield}}');

  appendViewFor(`{{#each list key='@primitive' as |item|}}<destroy-me1 @item={{item}}>{{#destroy-me2 from="root" item=item}}{{/destroy-me2}}</destroy-me1>{{/each}}`, { list: [1, 2, 3, 4, 5] });

  assert.strictEqual(destroyed.length, 0, 'destroy should not be called');

  view.rerender({ list: [1, 2, 3] });

  assert.deepEqual(destroyed, [
    "destroy-me1: 4",
    "destroy-me2: destroy-me1 - 4",
    "destroy-me2: root - 4",
    "destroy-me1: 5",
    "destroy-me2: destroy-me1 - 5",
    "destroy-me2: root - 5"
  ], 'destroy should be called exactly twice');

  destroyed = [];

  view.rerender({ list: [3, 2, 1] });

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

QUnit.test('components inside the root are destroyed when the render result is destroyed', function (assert) {
  let glimmerDestroyed = false;
  let curlyDestroyed = false;

  let DestroyMe1Component = EmberishGlimmerComponent.extend({
    destroy(this: EmberishGlimmerComponent) {
      this._super();
      glimmerDestroyed = true;
    }
  });

  let DestroyMe2Component = EmberishCurlyComponent.extend({
    destroy(this: EmberishCurlyComponent) {
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

  assert.strictEqual(document.querySelector('#qunit-fixture')!.childElementCount, 0, 'root view was removed from DOM');
});

QUnit.test('tagless components render properly', () => {
  class FooBar extends BasicComponent { }

  env.registerStaticTaglessComponent('foo-bar', FooBar, `Michael Jordan says "Go Tagless"`);

  appendViewFor(`{{foo-bar}}`);
  assertAppended('Michael Jordan says "Go Tagless"');

  rerender();

  assertAppended('Michael Jordan says "Go Tagless"');
});

module('late bound layout');

QUnit.test('can bind the layout late', () => {
  class FooBar extends EmberishCurlyComponent {
    layout = env.registerTemplate('my-dynamic-layout', 'Swap - {{yield}}');
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, null);

  appendViewFor('{{#foo-bar}}YIELD{{/foo-bar}}');

  equalsElement(view.element, 'div', {
    class: classes('ember-view'),
    id: regex(/^ember\d*$/)
  }, 'Swap - YIELD');
});

module('appendable components');

QUnit.test('it does not work on optimized appends', () => {
  class FooBar extends EmberishCurlyComponent { }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  let definition = env.resolveComponentDefinition('foo-bar', {});

  appendViewFor('{{foo}}', { foo: definition });

  assertAppended('[object Object]');

  rerender();

  assertAppended('[object Object]');

  view.rerender({ foo: 'foo' });

  assertAppended('foo');

  view.rerender({ foo: definition });

  assertAppended('[object Object]');
});

QUnit.test('it works on unoptimized appends (dot paths)', () => {
  class FooBar extends EmberishCurlyComponent { }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  let definition = env.resolveComponentDefinition('foo-bar', {});

  appendViewFor('{{foo.bar}}', { foo: { bar: definition } });

  assertEmberishElement('div', {}, 'foo bar');

  rerender();

  assertEmberishElement('div', {}, 'foo bar');

  view.rerender({ foo: { bar: 'lol' } });

  assertAppended('lol');

  rerender();

  assertAppended('lol');

  view.rerender({ foo: { bar: 'omg' } });

  assertAppended('omg');

  view.rerender({ foo: { bar: definition } });

  assertEmberishElement('div', {}, 'foo bar');
});

QUnit.test('it works on unoptimized appends (this paths)', () => {
  class FooBar extends EmberishCurlyComponent { }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  let definition = env.resolveComponentDefinition('foo-bar', {});

  appendViewFor('{{this.foo}}', { foo: definition });

  assertEmberishElement('div', {}, 'foo bar');

  rerender();

  assertEmberishElement('div', {}, 'foo bar');

  view.rerender({ foo: 'lol' });

  assertAppended('lol');

  rerender();

  assertAppended('lol');

  view.rerender({ foo: 'omg' });

  assertAppended('omg');

  view.rerender({ foo: definition });

  assertEmberishElement('div', {}, 'foo bar');
});

QUnit.test('it works on unoptimized appends when initially not a component (dot paths)', () => {
  class FooBar extends EmberishCurlyComponent { }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  let definition = env.resolveComponentDefinition('foo-bar', {});

  appendViewFor('{{foo.bar}}', { foo: { bar: 'lol' } });

  assertAppended('lol');

  rerender();

  assertAppended('lol');

  view.rerender({ foo: { bar: definition } });

  assertEmberishElement('div', {}, 'foo bar');

  rerender();

  assertEmberishElement('div', {}, 'foo bar');

  view.rerender({ foo: { bar: 'lol' } });

  assertAppended('lol');
});

QUnit.test('it works on unoptimized appends when initially not a component (this paths)', () => {
  class FooBar extends EmberishCurlyComponent { }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  let definition = env.resolveComponentDefinition('foo-bar', {});

  appendViewFor('{{this.foo}}', { foo: 'lol' });

  assertAppended('lol');

  rerender();

  assertAppended('lol');

  view.rerender({ foo: definition });

  assertEmberishElement('div', {}, 'foo bar');

  rerender();

  assertEmberishElement('div', {}, 'foo bar');

  view.rerender({ foo: 'lol' });

  assertAppended('lol');
});

module('bounds tracking');

QUnit.test('it works for wrapped (curly) components', function (assert) {
  let instance: FooBar | undefined;

  class FooBar extends EmberishCurlyComponent {
    tagName = 'span';

    constructor() {
      super();
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, 'foo bar');

  appendViewFor('zomg {{foo-bar}} wow');

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

  assertEmberishElement('span', {}, 'foo bar');

  assert.equal(instance.bounds.parentElement(), document.querySelector('#qunit-fixture'));
  assert.equal(instance.bounds.firstNode(), instance.element);
  assert.equal(instance.bounds.lastNode(), instance.element);
});

QUnit.test('it works for tagless components', function (assert) {
  let instance: FooBar | undefined;

  class FooBar extends EmberishCurlyComponent {
    tagName = '';

    constructor() {
      super();
      instance = this;
    }
  }

  env.registerEmberishCurlyComponent('foo-bar', FooBar, '<span id="first-node">foo</span> <span id="before-last-node">bar</span>!');

  appendViewFor('zomg {{foo-bar}} wow');

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

  assertAppended('zomg <span id="first-node">foo</span> <span id="before-last-node">bar</span>! wow');

  assert.equal(instance.bounds.parentElement(), document.querySelector('#qunit-fixture'));
  assert.equal(instance.bounds.firstNode(), document.querySelector('#first-node'));
  assert.equal(instance.bounds.lastNode(), document.querySelector('#before-last-node')!.nextSibling);
});

QUnit.test('it works for unwrapped components', function (assert) {
  let instance: FooBar | undefined;

  class FooBar extends EmberishGlimmerComponent {
    constructor() {
      super();
      instance = this;
    }
  }

  env.registerEmberishGlimmerComponent('foo-bar', FooBar, '<!-- ohhh --><span>foo bar!</span>');

  appendViewFor('zomg <foo-bar /> wow');

  assert.ok(instance, 'instance is created');

  if (instance === undefined) {
    return;
  }

  assertEmberishElement('span', {}, 'foo bar!');

  assert.equal(instance.bounds.parentElement(), document.querySelector('#qunit-fixture'));
  assert.equal(instance.bounds.firstNode(), instance.element.previousSibling);
  assert.equal(instance.bounds.lastNode(), instance.element);
});
