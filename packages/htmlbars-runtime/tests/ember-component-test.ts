import EmberObject, {
  HTMLBarsObjectFactory as EmberObjectFactory,
  alias
} from "htmlbars-object";

import {
  Template,
  ComponentClass,
  Environment,
  RenderResult,
  AttributeSyntax,
  GetSyntax,
  StaticAttr,
  DynamicAttr,
  EvaluatedRef,
  Frame
} from "htmlbars-runtime";

import {
  TestEnvironment,
  HookIntrospection,
  equalsElement,
  regex,
  classes,
  compile
 } from "./support";

import { Dict, dict, assign } from "htmlbars-util";

import { equalTokens } from "htmlbars-test-helpers";

import { ChainableReference, setProperty as set } from 'htmlbars-reference';

class Component extends EmberObject {
  private parent: Element;
  protected _result: RenderResult;
  protected template: Template;
  protected env: Environment<any>;
  public attrs: Object; // provided by the component definition
  public element: Element; // provided by the component definition

  appendTo(selector: string) {
    let element = this.parent = document.querySelector(selector);
    this._result = this.template.render(this, this.env, { appendTo: element, hostOptions: { component: this } });
    this.element = element.firstElementChild;
  }

  rerender() {
    this._result.rerender();
    this.element = this.parent.firstElementChild;
  }
}

class EmberishComponent extends Component {
  public attributeBindings = ['id', 'ariaRole:role'];
  public parentView: Component;
}

class GlimmerComponent extends Component {
}

class EmberishGlimmerComponent extends GlimmerComponent {
  public parentView: Component = null;
}

let view: Component, env: TestEnvironment;

QUnit.module("HTMLBarsComponent - invocation", {
  setup() {
    env = new TestEnvironment();

    env.registerHelper('if', function(params, hash, options) {
      if (!!params[0]) {
        return options.template.yield();
      } else if (options.inverse) {
        return options.inverse.yield();
      }
    });
  }
});

function appendViewFor(template: string, attrs: Object = {}) {
  class MyComponent extends Component {
    protected env = env;
    protected template = compile(template);
  }
  MyComponent._Meta.seal();

  view = new MyComponent(attrs);

  env.begin();
  view.appendTo('#qunit-fixture');
  env.commit();
}

function assertAppended(content: string) {
  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), content);
}

function assertFired(hooks: HookIntrospection, name: string, count=1) {
  if (name in hooks.hooks) {
    equal(hooks.hooks[name].length, count, `The ${name} hook fired ${count} ${count === 1 ? 'time' : 'times'}`);
  } else {
    ok(false, `The ${name} hook fired`);
  }
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
  env.begin();
  view.rerender();
  env.commit();
}

interface ComponentTestOptions {
  kind?: string;
  layout: string;
  invokeAs?: InvokeAs;
  block?: string;
  expected: string | Expected;
}

interface InvokeAs {
  attrs?: Object;
  context?: Object;
  blockParams?: string[];
  template?: string;
  inverse?: string;
}

interface Expected {
  content: string,
  attrs: Object
};

function testComponent(title: string, { kind, layout, invokeAs, block, expected: _expected }: ComponentTestOptions) {
  if (typeof block === 'string') invokeAs = { template: block };

  invokeAs = assign({
    attrs: {},
    context: {},
    blockParams: null,
    inverse: null
  }, invokeAs || <InvokeAs>{});

  let { attrs, context, blockParams, template, inverse } = invokeAs;

  if (!kind || kind === 'curly') {
    let expected: Expected;
    if (typeof _expected === 'string') {
      expected = {
        content: <string>_expected,
        attrs: {}
      }
    } else {
      expected = <Expected>_expected;
    }

    QUnit.test(`curly: ${title}`, () => {
      env.registerEmberishComponent('test-component', EmberishComponent, layout);

      let attrList: string[] = Object.keys(attrs).reduce((list, key) => {
        return list.concat(`${key}=${attrs[key]}`);
      }, <string[]>[]);

      if (typeof template === 'string') {
        let args = blockParams ? ` as |${blockParams.join(' ')}|` : '';
        let inv = typeof inverse === 'string' ? `{{else}}${inverse}` : '';
        appendViewFor(`{{#test-component ${attrList.join(' ')}${args}}}${template}${inv}{{/test-component}}`, context || {});
      } else {
        appendViewFor(`{{test-component ${attrList.join(' ')}}}`, context || {});
      }

      assertEmberishElement('div', expected.attrs, expected.content);
    });

    QUnit.test(`curly - component helper: ${title}`, () => {
      env.registerEmberishComponent('test-component', EmberishComponent, layout);
      env.registerEmberishComponent('test-component2', EmberishComponent, `${layout} -- 2`);

      let attrList: string[] = Object.keys(attrs).reduce((list, key) => {
        return list.concat(`${key}=${attrs[key]}`);
      }, <string[]>[]);

      let creation = assign({ componentName: 'test-component' }, context || {});

      if (typeof template === 'string') {
        let args = blockParams ? ` as |${blockParams.join(' ')}|` : '';
        let inv = typeof inverse === 'string' ? `{{else}}${inverse}` : '';
        appendViewFor(`{{#component componentName ${attrList.join(' ')}${args}}}${template}${inv}{{/component}}`, creation);
      } else {
        appendViewFor(`{{component componentName ${attrList.join(' ')}}}`, creation);
      }

      assertEmberishElement('div', expected.attrs, expected.content);

      set(view, 'componentName', 'test-component2');
      rerender();

      assertEmberishElement('div', expected.attrs, `${expected.content} -- 2`);
    });
  }

  let keys = Object.keys(attrs);

  if (!kind || kind === 'glimmer') {
    let expected: Expected;
    if (typeof _expected === 'string') {
      expected = {
        content: <string>_expected,
        attrs
      }
    } else {
      expected = <Expected>_expected;
    }

    QUnit.test(`glimmer: ${title}`, () => {
      env.registerEmberishGlimmerComponent('test-component', GlimmerComponent, ` <aside>${layout}</aside><!-- hi -->`);

      let attrList: string[] = keys.reduce((list, key) => {
        return list.concat(`${key}=${attrs[key]}`);
      }, <string[]>[]);

      if (typeof template === 'string') {
        let args = blockParams ? ` as |${blockParams.join(' ')}|` : '';
        appendViewFor(`<test-component ${attrList.join(' ')}${args}>${template}</test-component>`, context || {});
      } else {
        appendViewFor(`<test-component ${attrList.join(' ')} />`, context || {});
      }

      assertEmberishElement('aside', expected.attrs, expected.content)
    });
  }
}

  // TODO: <component>
  // QUnit.test(`glimmer - component helper: ${title}`, () => {
  //   env.registerGlimmerComponent('test-component', GlimmerComponent, layout);
  //   env.registerGlimmerComponent('test-component2', GlimmerComponent, layout2);

  //   let attrList: string[] = keys.reduce((list, key) => {
  //     return list.concat(`${key}=${attrs[key]}`);
  //   }, <string[]>[]);

  //   if (contents) {
  //     appendViewFor(`{{#component componentName ${attrList.join(' ')}}}${contents}{{/component}}`, { componentName: 'test-component' });
  //   } else {
  //     appendViewFor(`{{component componentName ${attrList.join(' ')}}}`, { componentName: 'test-component' });
  //   }

  //   assertAppended(expected);

  //   set(view, 'componentName', 'test-component2');
  //   rerender();

  //   assertAppended(expected2);
  // });

testComponent('non-block without properties', {
  layout: 'In layout',
  expected: 'In layout'
});

testComponent('block without properties', {
  layout: 'In layout -- {{yield}}',
  expected: 'In layout -- In template',
  block: 'In template'
});


testComponent('non-block with properties on attrs', {
  layout: 'In layout - someProp: {{attrs.someProp}}',
  invokeAs: { attrs: { someProp: '"something here"' } },
  expected: 'In layout - someProp: something here'
});

testComponent('block with properties on attrs', {
  layout: 'In layout - someProp: {{attrs.someProp}} - {{yield}}',
  invokeAs: { template: 'In template', attrs: { someProp: '"something here"' } },
  expected: 'In layout - someProp: something here - In template',
});

testComponent('with ariaRole specified', {
  kind: 'curly',
  layout: 'Here!',
  invokeAs: { attrs: { id: '"aria-test"', ariaRole: '"main"' } },
  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', role: '"main"' }
  }
});

testComponent('with ariaRole and class specified', {
  kind: 'curly',
  layout: 'Here!',
  invokeAs: { attrs: { id: '"aria-test"', class: '"foo"', ariaRole: '"main"' } },
  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' }
  }
});

testComponent('with ariaRole specified as an outer binding', {
  kind: 'curly',
  layout: 'Here!',

  invokeAs: {
    attrs: { id: '"aria-test"', class: '"foo"', ariaRole: 'ariaRole' },
    context: { ariaRole: 'main' },
  },

  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' }
  }
});

testComponent('glimmer component with role specified as an outer binding and copied', {
  kind: 'glimmer',
  layout: 'Here!',
  invokeAs: {
    attrs: { id: '"aria-test"', role: '"{{myRole}}"' },
    context: { myRole: 'main' }
  },

  expected: {
    content: 'Here!',
    attrs: { id: '"aria-test"', role: '"main"' }
  }
});

testComponent('hasBlock is true when block supplied', {
  layout: '{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}',
  block: 'In template',
  expected: 'In template'
});

testComponent('hasBlock is false when block supplied', {
  layout: '{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}',
  expected: 'No Block!'
});

testComponent('hasBlockParams is true when block param supplied', {
  layout: '{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block Param!{{/if}}',
  invokeAs: {
    blockParams: ['something'],
    template: 'In template'
  },
  expected: 'In template - In Component'
});

testComponent('hasBlockParams is false when no block param supplied', {
  layout: '{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} - No Block Param!{{/if}}',
  block: 'In template',
  expected: 'In template - No Block Param!'
});

testComponent('yield to inverse', {
  kind: 'curly',
  layout: '{{#if predicate}}Yes:{{yield someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    attrs: { predicate: 'activated', someValue: '42'},
    context: { activated: true },
    blockParams: ['result'],
    template: 'Hello{{result}}',
    inverse: 'Goodbye'
  },

  expected: 'Yes:Hello42'
});

testComponent('parameterized hasBlock (inverse) when inverse supplied', {
  kind: 'curly',
  layout: '{{#if (hasBlock "inverse")}}Yes{{else}}No{{/if}}',
  invokeAs: {
    template: 'block here',
    inverse: 'inverse here'
  },
  expected: 'Yes'
});

testComponent('parameterized hasBlock (inverse) when inverse not supplied', {
  layout: '{{#if (hasBlock "inverse")}}Yes{{else}}No{{/if}}',
  block: 'block here',
  expected: 'No'
});

testComponent('parameterized hasBlock (default) when block supplied', {
  layout: '{{#if (hasBlock)}}Yes{{else}}No{{/if}}',
  block: 'block here',
  expected: 'Yes'
});

testComponent('parameterized hasBlock (default) when block not supplied', {
  layout: '{{#if (hasBlock)}}Yes{{else}}No{{/if}}',
  expected: 'No'
});

testComponent('hasBlock keyword when block supplied', {
  layout: '{{#if hasBlock}}Yes{{else}}No{{/if}}',
  block: 'block here',
  expected: 'Yes'
});

testComponent('hasBlock keyword when block not supplied', {
  layout: '{{#if hasBlock}}Yes{{else}}No{{/if}}',
  expected: 'No'
});

QUnit.test('static named positional parameters', function() {
  class SampleComponent extends EmberishComponent {
    static positionalParams = ['name', 'age'];
  }
  SampleComponent._Meta.seal();

  env.registerEmberishComponent('sample-component', SampleComponent, '{{name}}{{age}}');

  appendViewFor('{{sample-component "Quint" 4}}')

  assertEmberishElement('div', 'Quint4');
});

QUnit.test('dynamic named positional parameters', function() {
  var SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{name}}{{age}}')

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
  let SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name']
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{name}}');

  assert.throws(() => {
    appendViewFor('{{sample-component notMyName name=myName}}', {
      myName: 'Quint',
      notMyName: 'Sergio'
    });
  }, "You cannot specify both a positional param (at position 0) and the hash argument `name`.");
});

QUnit.test('static arbitrary number of positional parameters', function() {
  let SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{#each names as |name|}}{{name}}{{/each}}')

  appendViewFor('<div>{{sample-component "Foo" 4 "Bar" id="args-3"}}{{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}{{!sample-component "Foo" 4 "Bar" 5 "Baz" id="helper"}}</div>');

  let first = <Element>view.element.firstChild;
  let second = <Element>first.nextSibling;
  // let third = <Element>second.nextSibling;

  assertElementIsEmberishElement(first, 'div', { id: 'args-3' }, 'Foo4Bar');
  assertElementIsEmberishElement(second, 'div', { id: 'args-5' }, 'Foo4Bar5Baz');
  // equalsElement(third, ...emberishElement('div', { id: 'helper' }, 'Foo4Bar5Baz'));
});

QUnit.test('arbitrary positional parameter conflict with hash parameter is reported', assert => {
  var SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{#each attrs.names as |name|}}{{name}}{{/each}}');

  assert.throws(function() {
    appendViewFor('{{sample-component "Foo" 4 "Bar" names=numbers id="args-3"}}', {
      numbers: [1, 2, 3]
    });
  }, `You cannot specify positional parameters and the hash argument \`names\`.`);
});

QUnit.test('can use hash parameter instead of arbitrary positional param [GH #12444]', function() {
  var SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{#each names as |name|}}{{name}}{{/each}}');

  appendViewFor('{{sample-component names=things id="args-3"}}', {
    things: ['Foo', 4, 'Bar']
  });

  assertEmberishElement('div', { id: 'args-3' }, 'Foo4Bar');
});

QUnit.test('can use hash parameter instead of positional param', function() {
  var SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['first', 'second']
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{first}} - {{second}}')

  appendViewFor(`<div>
    {{sample-component "one" "two" id="two-positional"}}
    {{sample-component "one" second="two" id="one-positional"}}
    {{sample-component first="one" second="two" id="no-positional"}}</div>
  `, {
    things: ['Foo', 4, 'Bar']
  })

  let first = view.element.firstElementChild;
  let second = first.nextElementSibling;
  let third = second.nextElementSibling;

  assertElementIsEmberishElement(first, 'div', { id: 'two-positional' }, 'one - two');
  assertElementIsEmberishElement(second, 'div', { id: 'one-positional' }, 'one - two');
  assertElementIsEmberishElement(third, 'div', { id: 'no-positional' }, 'one - two');
});

QUnit.test('dynamic arbitrary number of positional parameters', function() {
  var SampleComponent = <any>Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'n'
  });

  env.registerEmberishComponent('sample-component', SampleComponent, '{{#each attrs.n as |name|}}{{name}}{{/each}}');

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

// QUnit.test('{{component}} helper works with positional params', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: ['name', 'age']
//   });

//   registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{component "sample-component" myName myAge}}'),
//     container: container,
//     context: {
//       myName: 'Quint',
//       myAge: 4
//     }
//   }).create();

//   runAppend(view);
//   equal(jQuery('#qunit-fixture').text(), 'Quint4');
//   run(function() {
//     set(view.context, 'myName', 'Edward');
//     set(view.context, 'myAge', '5');
//   });

//   equal(jQuery('#qunit-fixture').text(), 'Edward5');
// });


QUnit.test('components in template of a yielding component should have the proper parentView', function() {
  var outer, innerTemplate, innerLayout;

  let Outer = <any>EmberishComponent.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  });

  let InnerInTemplate = <any>EmberishComponent.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  });

  let InnerInLayout = <any>EmberishComponent.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  });

  env.registerEmberishComponent('x-outer', Outer, `{{x-inner-in-layout}}{{yield}}`);
  env.registerEmberishComponent('x-inner-in-layout', InnerInLayout, '');
  env.registerEmberishComponent('x-inner-in-template', InnerInTemplate, '');

  appendViewFor('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}');

  assertEmberishElement('div');

  equalObject(innerTemplate.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equalObject(innerLayout.parentView, outer, 'receives the wrapping component as its parentView in layout');
  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

function equalObject(actual: EmberObject, expected: EmberObject, msg: string) {
  equal(actual._meta.identity(), expected._meta.identity(), msg);
}

QUnit.test('newly-added sub-components get correct parentView', function() {
  var outer, inner;

  var outer, innerTemplate, innerLayout;

  let Outer = <any>EmberishComponent.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  });

  let Inner = <any>EmberishComponent.extend({
    init() {
      this._super(...arguments);
      inner = this;
    }
  });

  env.registerEmberishComponent('x-outer', Outer, `{{x-inner-in-layout}}{{yield}}`);
  env.registerEmberishComponent('x-inner', Inner, '');

  appendViewFor('{{#x-outer}}{{#if showInner}}{{x-inner}}{{/if}}{{/x-outer}}', { showInner: false });

  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');

  set(view, 'showInner', true);
  rerender();

  equalObject(inner.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equalObject(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

// QUnit.test('non-block with each rendering child components', function() {
//   expect(2);

//   registry.register('template:components/non-block', compile('In layout. {{#each attrs.items as |item|}}[{{child-non-block item=item}}]{{/each}}'));
//   registry.register('template:components/child-non-block', compile('Child: {{attrs.item}}.'));

//   var items = emberA(['Tom', 'Dick', 'Harry']);

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

// QUnit.test('specifying classNames results in correct class', function(assert) {
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

// QUnit.test('specifying custom concatenatedProperties avoids clobbering', function(assert) {
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
// if (isEnabled('ember-htmlbars-component-generation')) {
//   QUnit.module('component - invocation (angle brackets)', {
//     setup() {
//       commonSetup();
//     },

//     teardown() {
//       commonTeardown();
//     }
//   });

//   QUnit.test('legacy components cannot be invoked with angle brackets', function() {
//     registry.register('template:components/non-block', compile('In layout'));
//     registry.register('component:non-block', Component.extend());

//     expectAssertion(function() {
//       view = appendViewFor('<non-block />');
//     }, /cannot invoke the 'non-block' component with angle brackets/);
//   });

//   QUnit.test('using a text-fragment in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('In layout'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `The <non-block> template must have a single top-level element because it is a GlimmerComponent.`);
//   });

//   QUnit.test('having multiple top-level elements in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div>This is a</div><div>fragment</div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `The <non-block> template must have a single top-level element because it is a GlimmerComponent.`);
//   });

//   QUnit.test('using a modifier in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div {{action "foo"}}></div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `You cannot use {{action ...}} in the top-level element of the <non-block> template because it is a GlimmerComponent.`);
//   });

//   QUnit.test('using triple-curlies in a GlimmerComponent layout gives an error', function() {
//     registry.register('template:components/non-block', compile('<div style={{{bar}}}>This is a</div>'));

//     expectAssertion(() => {
//       view = appendViewFor('<non-block />');
//     }, `You cannot use triple curlies (e.g. style={{{ ... }}}) in the top-level element of the <non-block> template because it is a GlimmerComponent.`);
//   });

let styles = [{
  name: 'a div',
  tagName: 'div'
}, {
  name: 'an identity element',
  tagName: 'non-block'
}, {
  name: 'a web component',
  tagName: 'not-an-ember-component'
}];

styles.forEach(style => {
  QUnit.test(`non-block without attributes replaced with ${style.name}`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `  <${style.tagName}>In layout</${style.tagName}>  `);

    appendViewFor('<non-block />');

    let node = view.element.firstChild;
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');

    rerender();

    strictEqual(node, view.element.firstChild, 'The inner element has not changed');
    equalsElement(view.element, style.tagName, { class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  QUnit.test(`non-block with attributes replaced with ${style.name}`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `  <${style.tagName} such="{{attrs.stability}}">In layout</${style.tagName}>  `);

    appendViewFor('<non-block stability={{view.stability}} />', { stability: 'stability' });

    let node = view.element;
    equalsElement(node, style.tagName, { such: 'stability', class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');

    set(view, 'stability', 'changed!!!');
    rerender();

    strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, 'In layout');
  });

  QUnit.test(`non-block replaced with ${style.name} (regression with single element in the root element)`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `  <${style.tagName} such="{{attrs.stability}}"><p>In layout</p></${style.tagName}>  `);

    appendViewFor('<non-block stability={{view.stability}} />', { stability: 'stability' });

    let node = view.element;
    equalsElement(node, style.tagName, { such: 'stability', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');

    set(view, 'stability', 'changed!!!');
    rerender();

    strictEqual(node.firstElementChild, view.element.firstElementChild, 'The inner element has not changed');
    equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');
  });

  QUnit.test(`non-block with class replaced with ${style.name} merges classes`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `<${style.tagName} class="inner-class" />`);

    appendViewFor('<non-block class="{{outer}}" />', { outer: 'outer' });

    equalsElement(view.element, style.tagName, { class: classes('inner-class outer ember-view'), id: regex(/^ember\d*$/) }, '');

    set(view, 'outer', 'new-outer');
    rerender();

    equalsElement(view.element, style.tagName, { class: classes('inner-class new-outer ember-view'), id: regex(/^ember\d*$/) }, '');
  });

  QUnit.test(`non-block with outer attributes replaced with ${style.name} shadows inner attributes`, function() {
    let component: MyComponent;

    class MyComponent extends EmberishGlimmerComponent {
      constructor(attrs: Object) {
        super(attrs);
        component = this;
      }
    }
    MyComponent._Meta.seal();

    env.registerEmberishGlimmerComponent('non-block', MyComponent, `<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`);

    appendViewFor('<non-block data-static="outer" data-dynamic="outer" />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/), 'data-static': 'outer', 'data-dynamic': 'outer'}, '');

    set(component, 'internal', 'changed');
    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/), 'data-static': 'outer', 'data-dynamic': 'outer'}, '');
  });

  QUnit.test(`non-block replaced with ${style.name} should have correct scope`, function() {
    class NonBlock extends EmberishGlimmerComponent {
      init() {
        this._super(...arguments);
        set(this, 'internal', 'stuff');
      }
    }
    NonBlock._Meta.seal();

    env.registerEmberishGlimmerComponent('non-block', NonBlock, `<${style.tagName}>{{internal}}</${style.tagName}>`)

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'stuff');
  });

  QUnit.test(`non-block replaced with ${style.name} should have correct 'element'`, function() {
    let component: MyComponent;

    class MyComponent extends EmberishGlimmerComponent {
      constructor(attrs: Object) {
        super(attrs);
        component = this;
      }
    }
    MyComponent._Meta.seal();

    env.registerEmberishGlimmerComponent('non-block', MyComponent, `<${style.tagName} />`);

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/) }, '');
  });

  QUnit.test(`non-block replaced with ${style.name} should have inner attributes`, function() {
    class NonBlock extends EmberishGlimmerComponent {
      init() {
        this._super(...arguments);
        set(this, 'internal', 'stuff');
      }
    }
    NonBlock._Meta.seal();

    env.registerEmberishGlimmerComponent('non-block', NonBlock, `<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`);

    appendViewFor('<non-block />');

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/), 'data-static': 'static', 'data-dynamic': 'stuff' }, '');
  });

  QUnit.test(`only text attributes are reflected on the underlying DOM element (${style.name})`, function() {
    env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, `<${style.tagName}>In layout</${style.tagName}>`);

    appendViewFor('<non-block static-prop="static text" concat-prop="{{view.dynamic}} text" dynamic-prop={{view.dynamic}} />', {
      dynamic: 'dynamic'
    });

    equalsElement(view.element, style.tagName, { class: classes('ember-view'), id: regex(/^ember\d*$/), 'static-prop': 'static text', 'concat-prop': 'dynamic text' }, 'In layout');
  });

});

QUnit.test('block without properties', function() {
  env.registerEmberishGlimmerComponent('with-block', EmberishGlimmerComponent, '<with-block>In layout - {{yield}}</with-block>');

  appendViewFor('<with-block>In template</with-block>');

  equalsElement(view.element, 'with-block', { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'In layout - In template');
});

QUnit.test('attributes are not installed on the top level', function() {
  let component: NonBlock;

  class NonBlock extends EmberishGlimmerComponent {

    init() {
      this._super(...arguments);
      component = this;
    }
  }
  NonBlock._Meta.seal();

  // This is specifically attempting to trigger a 1.x-era heuristic that only copied
  // attrs that were present as defined properties on the component.
  NonBlock.prototype['text'] = null;
  NonBlock.prototype['dynamic'] = null;

  env.registerEmberishGlimmerComponent('non-block', NonBlock, '<non-block>In layout - {{attrs.text}} -- {{text}}</non-block>');

  appendViewFor('<non-block text="texting" dynamic={{dynamic}} />', {
    dynamic: 'dynamic'
  });

  equalsElement(view.element, 'non-block', { class: classes('ember-view'), id: regex(/^ember\d*$/), text: 'texting' }, 'In layout - texting -- null');
  equal(component.attrs['text'], 'texting');
  equal(component.attrs['dynamic'], 'dynamic');
  strictEqual(component['text'], null);
  strictEqual(component['dynamic'], null);

  rerender();

  equalsElement(view.element, 'non-block', { class: classes('ember-view'), id: regex(/^ember\d*$/), text: 'texting' }, 'In layout - texting -- <!---->');
  equal(component.attrs['text'], 'texting');
  equal(component.attrs['dynamic'], 'dynamic');
  strictEqual(component['text'], null);
  strictEqual(component['dynamic'], null);
});

QUnit.test('non-block with properties on attrs and component class', function() {
  env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, '<non-block>In layout - someProp: {{attrs.someProp}}</non-block>');

  appendViewFor('<non-block someProp="something here" />');

  assertEmberishElement('non-block', { someProp: 'something here' }, 'In layout - someProp: something here');
});

QUnit.test('rerendering component with attrs from parent', function() {
  let { hooks } = env.registerEmberishGlimmerComponent('non-block', EmberishGlimmerComponent, '<non-block>In layout - someProp: {{attrs.someProp}}</non-block>');

  appendViewFor('<non-block someProp={{someProp}} />', {
    someProp: 'wycats'
  });

  assertFired(hooks, 'didReceiveAttrs');

  assertEmberishElement('non-block', 'In layout - someProp: wycats');
  equalsElement(view.element, 'non-block', { class: classes('ember-view'), id: regex(/^ember\d*$/) }, 'In layout - someProp: wycats');

  set(view, 'someProp', 'tomdale');
  rerender();

  assertEmberishElement('non-block', 'In layout - someProp: tomdale');
  assertFired(hooks, 'didReceiveAttrs', 2);
  assertFired(hooks, 'willUpdate', 1);

  rerender();

  assertEmberishElement('non-block', 'In layout - someProp: tomdale');
  assertFired(hooks, 'didReceiveAttrs', 3);
  assertFired(hooks, 'willUpdate', 2);
});

QUnit.test('block with properties on attrs', function() {
  env.registerEmberishGlimmerComponent('with-block', EmberishGlimmerComponent, '<with-block>In layout - someProp: {{attrs.someProp}} - {{yield}}</with-block>');

  appendViewFor('<with-block someProp="something here">In template</with-block>');

  assertEmberishElement('with-block', { someProp: 'something here' }, 'In layout - someProp: something here - In template');
});

QUnit.test('computed property alias on a static attr', function() {
  let ComputedAlias = <any>EmberishGlimmerComponent.extend({
    otherProp: alias('attrs.someProp')
  });

  env.registerEmberishGlimmerComponent('computed-alias', ComputedAlias, '<computed-alias>{{otherProp}}</computed-alias>');

  appendViewFor('<computed-alias someProp="value"></computed-alias>', {
    someProp: 'value'
  });

  assertEmberishElement('computed-alias', { someProp: 'value' }, 'value');
});

QUnit.test('computed property alias on a dynamic attr', function() {
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


QUnit.test('lookup of component takes priority over property', function() {
  expect(1);

  class MyComponent extends Component {
    'some-component' = 'not-some-component';
    'some-prop' = 'some-prop';
  }

  class SomeComponent extends Component {

  }

  env.registerCurlyComponent('my-component', MyComponent, '{{some-prop}} {{some-component}}')
  env.registerCurlyComponent('some-component', SomeComponent, 'some-component');

  appendViewFor('{{my-component}}');

  assertAppended('<div>some-prop <div>some-component</div></div>');
});


QUnit.test('rerendering component with attrs from parent', function() {

  class NonBlock extends Component {
  }

  let { hooks } = env.registerCurlyComponent('non-block', NonBlock, 'In layout - someProp: {{someProp}}');

  appendViewFor('{{non-block someProp=someProp}}', { someProp: 'wycats' })

  assertFired(hooks, 'didReceiveAttrs');
  assertFired(hooks, 'willRender');
  assertFired(hooks, 'didInsertElement');
  assertFired(hooks, 'didRender');

  assertAppended('<div>In layout - someProp: wycats</div>');

  set(view, 'someProp', 'tomdale');
  rerender();

  assertAppended('<div>In layout - someProp: tomdale</div>');

  assertFired(hooks, 'didReceiveAttrs', 2);
  assertFired(hooks, 'willUpdate');
  assertFired(hooks, 'willRender', 2);
  assertFired(hooks, 'didUpdate');
  assertFired(hooks, 'didRender', 2);

  rerender();

  assertAppended('<div>In layout - someProp: tomdale</div>');

  assertFired(hooks, 'didReceiveAttrs', 3);
  assertFired(hooks, 'willUpdate', 2);
  assertFired(hooks, 'willRender', 3);
  assertFired(hooks, 'didUpdate', 2);
  assertFired(hooks, 'didRender', 3);
});



// QUnit.test('[DEPRECATED] non-block with properties on self', function() {
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

// QUnit.test('[DEPRECATED] block with properties on self', function() {
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


//   QUnit.test('moduleName is available on _renderNode when a layout is present', function() {
//     expect(1);

//     var layoutModuleName = 'my-app-name/templates/components/sample-component';
//     var sampleComponentLayout = compile('<sample-component>Sample Component - {{yield}}</sample-component>', {
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

//   QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
//     expect(1);

//     var templateModuleName = 'my-app-name/templates/application';
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


// QUnit.test('component without dash is not looked up', function() {
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


// QUnit.test('components should receive the viewRegistry from the parent view', function() {
//   var outer, innerTemplate, innerLayout;

//   var viewRegistry = {};

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

// QUnit.test('comopnent should rerender when a property is changed during children\'s rendering', function() {
//   expectDeprecation(/modified value twice in a single render/);

//   var outer, middle;

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


// QUnit.test('moduleName is available on _renderNode when a layout is present', function() {
//   expect(1);

//   var layoutModuleName = 'my-app-name/templates/components/sample-component';
//   var sampleComponentLayout = compile('Sample Component - {{yield}}', {
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

// QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
//   expect(1);

//   var templateModuleName = 'my-app-name/templates/application';
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


// QUnit.test('`template` specified in a component is overridden by block', function() {
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
