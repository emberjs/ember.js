import EmberObject, {
  HTMLBarsObjectFactory as EmberObjectFactory
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
  curlyComponentDefinition,
  glimmerComponentDefinition,
  equalsElement,
  regex
 } from "./support";

import { Dict, dict } from "htmlbars-util";
import { compile } from "htmlbars-compiler";

import { equalTokens } from "htmlbars-test-helpers";

import { ChainableReference, setProperty as set } from 'htmlbars-reference';

class Component extends EmberObject {
  protected _result: RenderResult;
  protected template: Template;
  protected env: Environment;
  public attrs; // provided by the component definition
  public element; // provided by the component definition

  appendTo(selector: string) {
    let element = document.querySelector(selector);
    this._result = this.template.render(this, this.env, { appendTo: element });
    this.element = element.firstElementChild;
  }

  rerender() {
    this._result.rerender();
  }
}

class EmberishComponent extends Component {
  attributeBindings = ['id', 'ariaRole:role']
}

class GlimmerComponent extends Component {
}

class EmberishGlimmerComponent extends GlimmerComponent {

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

function rerender() {
  env.begin();
  debugger;
  view.rerender();
  env.commit();
}

QUnit.test('non-block without properties', assert => {
  env.registerCurlyComponent('non-block', Component, 'In layout');

  appendViewFor('{{non-block}}');

  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), '<div>In layout</div>');
});

QUnit.test('glimmer component non-block without properties', assert => {
  env.registerGlimmerComponent('non-block', GlimmerComponent, ' <aside>In layout</aside><!-- hi --> ');

  appendViewFor('<non-block />');

  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), ' <aside>In layout</aside><!-- hi --> ');
});

QUnit.test('block without properties', function() {
  expect(1);

  env.registerCurlyComponent('with-block', Component, 'In layout - {{yield}}');

  appendViewFor('{{#with-block}}In template{{/with-block}}');

  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), '<div>In layout - In template</div>');
});

QUnit.test('glimmer component block without properties', function() {
  env.registerGlimmerComponent('with-block', GlimmerComponent, ' <aside>In layout - {{yield}}</aside><!-- hi --> ');

  appendViewFor('<with-block>In template</with-block>');

  equalTokens((<HTMLElement>document.querySelector('#qunit-fixture')), ' <aside>In layout - In template</aside><!-- hi --> ');
});

QUnit.test('non-block with properties on attrs', function() {
  env.registerCurlyComponent('non-block', Component, 'In layout - someProp: {{someProp}}');

  appendViewFor('{{non-block someProp="something here"}}');

  assertAppended('<div>In layout - someProp: something here</div>')
});

QUnit.test('glimmer component non-block with properties on attrs', function() {
  env.registerGlimmerComponent('non-block', GlimmerComponent, '<div>In layout - someProp: {{attrs.someProp}}</div>');

  appendViewFor('<non-block someProp="something here" />');

  assertAppended('<div someprop="something here">In layout - someProp: something here</div>')
});

QUnit.test('non-block with properties on attrs and component class', function() {
  env.registerCurlyComponent('non-block', <any>Component.extend(), 'In layout - someProp: {{someProp}}');

  appendViewFor('{{non-block someProp="something here"}}');

  assertAppended('<div>In layout - someProp: something here</div>');
});

QUnit.test('glimmer component non-block with properties on attrs and component class', function() {
  env.registerGlimmerComponent('non-block', <any>GlimmerComponent.extend(), '<div>In layout - someProp: {{attrs.someProp}}</div>');

  appendViewFor('<non-block someProp="something here" />');

  assertAppended('<div someprop="something here">In layout - someProp: something here</div>');
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

QUnit.test('block with properties on attrs', function() {
  env.registerCurlyComponent('with-block', Component, 'In layout - someProp: {{someProp}} - {{yield}}');

  appendViewFor('{{#with-block someProp="something here"}}In template{{/with-block}}')

  assertAppended('<div>In layout - someProp: something here - In template</div>');
});

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

QUnit.test('with ariaRole specified', function() {
  let def = env.registerEmberishComponent('aria-test', EmberishComponent, 'Here!');

  appendViewFor('{{aria-test id="aria-test" ariaRole="main"}}');

  assertAppended('<div id="aria-test" role="main">Here!</div>');
});

QUnit.test('with ariaRole specified as an outer binding', function() {
  let def = env.registerEmberishComponent('aria-test', EmberishComponent, 'Here!');

  appendViewFor('{{aria-test id="aria-test" ariaRole=myRole}}', { myRole: 'main' });

  assertAppended('<div id="aria-test" role="main">Here!</div>');
});

QUnit.test('glimmer component with role specified as an outer binding and shadowed', function() {
  let def = env.registerGlimmerComponent('aria-test', GlimmerComponent, '<div>Here!</div>');

  appendViewFor('<aria-test id="aria-test" role={{myRole}} />', { myRole: 'main' });

  assertAppended('<div id="aria-test" role="main">Here!</div>');
});


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

QUnit.test('hasBlock is true when block supplied', function() {
  env.registerCurlyComponent('with-block', Component, '{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}');

  appendViewFor('{{#with-block}}In template{{/with-block}}');

  assertAppended('<div>In template</div>');
});

QUnit.test('glimmer component hasBlock is true when block supplied', function() {
  env.registerGlimmerComponent('with-block', GlimmerComponent, '<div>{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}</div>');

  appendViewFor('<with-block>In template</with-block>');

  assertAppended('<div>In template</div>');
});

QUnit.test('hasBlock is false when no block supplied', function() {
  env.registerCurlyComponent('with-block', Component, '{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}');

  appendViewFor('{{with-block}}');

  assertAppended('<div>No Block!</div>');
});

QUnit.test('glimmer component hasBlock is false when no block supplied', function() {
  env.registerGlimmerComponent('with-block', Component, '<div>{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}</div>');

  appendViewFor('<with-block />');

  assertAppended('<div>No Block!</div>');
});


QUnit.test('hasBlockParams is true when block param supplied', function() {
  env.registerCurlyComponent('with-block', Component, '{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block Param!{{/if}}')

  appendViewFor('{{#with-block as |something|}}In template{{/with-block}}');

  assertAppended('<div>In template - In Component</div>');
});

QUnit.test('glimmer component hasBlockParams is true when block param supplied', function() {
  env.registerGlimmerComponent('with-block', GlimmerComponent, '<div>{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block Param!{{/if}}</div>')

  appendViewFor('<with-block as |something|>In template</with-block>');

  assertAppended('<div>In template - In Component</div>');
});

QUnit.test('hasBlockParams is false when no block param supplied', function() {
  env.registerCurlyComponent('with-block', Component, '{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block Param!{{/if}}')

  appendViewFor('{{#with-block}}In block{{/with-block}}');

  assertAppended('<div>In block No Block Param!</div>');
});

// QUnit.test('static named positional parameters', function() {
//   class SampleComponent extends Component {

//   }

//   SampleComponent.reopenClass({
//     positionalParams: ['name', 'age']
//   });

//   env.registerCurlyComponent('sample-component', SampleComponent, '{{attrs.name}}{{attrs.age}}');

//   appendViewFor('{{sample-component "Quint" 4}}')

//   assertAppended('<div>Quint4</div>');
// });

// QUnit.test('dynamic named positional parameters', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: ['name', 'age']
//   });

//   registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component myName myAge}}'),
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

// QUnit.test('if a value is passed as a non-positional parameter, it takes precedence over the named one', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: ['name']
//   });

//   registry.register('template:components/sample-component', compile('{{attrs.name}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component notMyName name=myName}}'),
//     container: container,
//     context: {
//       myName: 'Quint',
//       notMyName: 'Sergio'
//     }
//   }).create();

//   expectAssertion(function() {
//     runAppend(view);
//   }, `You cannot specify both a positional param (at position 0) and the hash argument \`name\`.`);
// });

// QUnit.test('static arbitrary number of positional parameters', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: 'names'
//   });

//   registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component "Foo" 4 "Bar" id="args-3"}}{{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" id="helper"}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(view.$('#args-3').text(), 'Foo4Bar');
//   equal(view.$('#args-5').text(), 'Foo4Bar5Baz');
//   equal(view.$('#helper').text(), 'Foo4Bar5Baz');
// });

// QUnit.test('arbitrary positional parameter conflict with hash parameter is reported', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: 'names'
//   });

//   registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component "Foo" 4 "Bar" names=numbers id="args-3"}}'),
//     container: container,
//     context: {
//       numbers: [1, 2, 3]
//     }
//   }).create();

//   expectAssertion(function() {
//     runAppend(view);
//   }, `You cannot specify positional parameters and the hash argument \`names\`.`);
// });

// QUnit.test('can use hash parameter instead of arbitrary positional param [GH #12444]', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: 'names'
//   });

//   registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component names=things id="args-3"}}'),
//     container: container,
//     context: {
//       things: ['Foo', 4, 'Bar']
//     }
//   }).create();

//   runAppend(view);

//   equal(view.$('#args-3').text(), 'Foo4Bar');
// });

// QUnit.test('can use hash parameter instead of positional param', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: ['first', 'second']
//   });

//   registry.register('template:components/sample-component', compile('{{attrs.first}} - {{attrs.second}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile(`
//       {{sample-component "one" "two" id="two-positional"}}
//       {{sample-component "one" second="two" id="one-positional"}}
//       {{sample-component first="one" second="two" id="no-positional"}}

//     `),
//     container: container,
//     context: {
//       things: ['Foo', 4, 'Bar']
//     }
//   }).create();

//   runAppend(view);

//   equal(view.$('#two-positional').text(), 'one - two');
//   equal(view.$('#one-positional').text(), 'one - two');
//   equal(view.$('#no-positional').text(), 'one - two');
// });

// QUnit.test('dynamic arbitrary number of positional parameters', function() {
//   var SampleComponent = Component.extend();
//   SampleComponent.reopenClass({
//     positionalParams: 'n'
//   });
//   registry.register('template:components/sample-component', compile('{{#each attrs.n as |name|}}{{name}}{{/each}}'));
//   registry.register('component:sample-component', SampleComponent);

//   view = EmberView.extend({
//     layout: compile('{{sample-component user1 user2 id="direct"}}{{component "sample-component" user1 user2 id="helper"}}'),
//     container: container,
//     context: {
//       user1: 'Foo',
//       user2: 4
//     }
//   }).create();

//   runAppend(view);

//   equal(view.$('#direct').text(), 'Foo4');
//   equal(view.$('#helper').text(), 'Foo4');
//   run(function() {
//     set(view.context, 'user1', 'Bar');
//     set(view.context, 'user2', '5');
//   });

//   equal(view.$('#direct').text(), 'Bar5');
//   equal(view.$('#helper').text(), 'Bar5');

//   run(function() {
//     set(view.context, 'user2', '6');
//   });

//   equal(view.$('#direct').text(), 'Bar6');
//   equal(view.$('#helper').text(), 'Bar6');
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

QUnit.test('yield to inverse', function() {
  env.registerCurlyComponent('my-if', Component, '{{#if predicate}}Yes:{{yield someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}')

  appendViewFor('{{#my-if predicate=activated someValue=42 as |result|}}Hello{{result}}{{else}}Goodbye{{/my-if}}', { activated: true });

  assertAppended('<div>Yes:Hello42</div>');

  set(view, 'activated', false);
  rerender();

  assertAppended('<div>No:Goodbye</div>');
});

QUnit.test('parameterized hasBlock inverse', function() {
  env.registerEmberishComponent('check-inverse', EmberishComponent, '{{#if (hasBlock "inverse")}}Yes{{else}}No{{/if}}');

  appendViewFor('{{#check-inverse id="expect-no"}}{{/check-inverse}}  {{#check-inverse id="expect-yes"}}{{else}}{{/check-inverse}}');

  assertAppended('<div id="expect-no">No</div>  <div id="expect-yes">Yes</div>');
});

QUnit.test('parameterized hasBlock default', function() {
  env.registerEmberishComponent('check-block', EmberishComponent, '{{#if (hasBlock)}}Yes{{else}}No{{/if}}');

  appendViewFor('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}');

  assertAppended('<div id="expect-no">No</div>  <div id="expect-yes">Yes</div>');
});

QUnit.test('non-expression hasBlock', function() {
  env.registerEmberishComponent('check-block', EmberishComponent, '{{#if hasBlock}}Yes{{else}}No{{/if}}');

  appendViewFor('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}');

  assertAppended('<div id="expect-no">No</div>  <div id="expect-yes">Yes</div>');
});

QUnit.test('parameterized hasBlockParams', function() {
  env.registerEmberishComponent('check-params', EmberishComponent, '{{#if (hasBlockParams)}}Yes{{else}}No{{/if}}');

  appendViewFor('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}');

  assertAppended('<div id="expect-no">No</div>  <div id="expect-yes">Yes</div>');
});

QUnit.test('non-expression hasBlockParams', function() {
  env.registerEmberishComponent('check-params', EmberishComponent, '{{#if hasBlockParams}}Yes{{else}}No{{/if}}');

  appendViewFor('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}');

  assertAppended('<div id="expect-no">No</div>  <div id="expect-yes">Yes</div>');
});

// QUnit.test('components in template of a yielding component should have the proper parentView', function() {
//   var outer, innerTemplate, innerLayout;

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
//     template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}'),
//     container: container
//   }).create();

//   runAppend(view);

//   equal(innerTemplate.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
//   equal(innerLayout.parentView, outer, 'receives the wrapping component as its parentView in layout');
//   equal(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
// });

// QUnit.test('newly-added sub-components get correct parentView', function() {
//   var outer, inner;

//   registry.register('component:x-outer', Component.extend({
//     init() {
//       this._super(...arguments);
//       outer = this;
//     }
//   }));

//   registry.register('component:x-inner', Component.extend({
//     init() {
//       this._super(...arguments);
//       inner = this;
//     }
//   }));

//   view = EmberView.extend({
//     template: compile('{{#x-outer}}{{#if view.showInner}}{{x-inner}}{{/if}}{{/x-outer}}'),
//     container: container,
//     showInner: false
//   }).create();

//   runAppend(view);

//   run(() => { view.set('showInner', true); });

//   equal(inner.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
//   equal(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
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

  // QUnit.skip(`non-block replaced with ${style.name} (regression with single element in the root element)`, function() {
  //   registry.register('template:components/non-block', compile(`  <${style.tagName} such="{{attrs.stability}}"><p>In layout</p></${style.tagName}>  `));

  //   view = appendViewFor('<non-block stability={{view.stability}} />', {
  //     stability: 'stability'
  //   });

  //   let node = view.element.firstElementChild;
  //   equalsElement(node, style.tagName, { such: 'stability', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');

  //   run(() => view.set('stability', 'changed!!!'));

  //   strictEqual(node, view.element.firstElementChild, 'The inner element has not changed');
  //   equalsElement(node, style.tagName, { such: 'changed!!!', class: 'ember-view', id: regex(/^ember\d*$/) }, '<p>In layout</p>');
  // });

  // QUnit.skip(`non-block with class replaced with ${style.name} merges classes`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName} class="inner-class" />`));

  //   view = appendViewFor('<non-block class="{{view.outer}}" />', {
  //     outer: 'outer'
  //   });

  //   equal(view.$(style.tagName).attr('class'), 'inner-class outer ember-view', 'the classes are merged');

  //   run(() => view.set('outer', 'new-outer'));

  //   equal(view.$(style.tagName).attr('class'), 'inner-class new-outer ember-view', 'the classes are merged');
  // });

  // QUnit.skip(`non-block with outer attributes replaced with ${style.name} shadows inner attributes`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`));

  //   view = appendViewFor('<non-block data-static="outer" data-dynamic="outer" />');

  //   equal(view.$(style.tagName).attr('data-static'), 'outer', 'the outer attribute wins');
  //   equal(view.$(style.tagName).attr('data-dynamic'), 'outer', 'the outer attribute wins');

  //   let component = view.childViews[0]; // HAX

  //   run(() => component.set('internal', 'changed'));

  //   equal(view.$(style.tagName).attr('data-static'), 'outer', 'the outer attribute wins');
  //   equal(view.$(style.tagName).attr('data-dynamic'), 'outer', 'the outer attribute wins');
  // });

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

  // QUnit.skip(`non-block replaced with ${style.name} should have correct scope`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName}>{{internal}}</${style.tagName}>`));

  //   registry.register('component:non-block', GlimmerComponent.extend({
  //     init() {
  //       this._super(...arguments);
  //       this.set('internal', 'stuff');
  //     }
  //   }));

  //   view = appendViewFor('<non-block />');

  //   equal(view.$().text(), 'stuff');
  // });

  // QUnit.skip(`non-block replaced with ${style.name} should have correct 'element'`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName} />`));

  //   let component;

  //   registry.register('component:non-block', GlimmerComponent.extend({
  //     init() {
  //       this._super(...arguments);
  //       component = this;
  //     }
  //   }));

  //   view = appendViewFor('<non-block />');

  //   equal(component.element, view.$(style.tagName)[0]);
  // });

  // QUnit.skip(`non-block replaced with ${style.name} should have inner attributes`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName} data-static="static" data-dynamic="{{internal}}" />`));

  //   registry.register('component:non-block', GlimmerComponent.extend({
  //     init() {
  //       this._super(...arguments);
  //       this.set('internal', 'stuff');
  //     }
  //   }));

  //   view = appendViewFor('<non-block />');

  //   equal(view.$(style.tagName).attr('data-static'), 'static');
  //   equal(view.$(style.tagName).attr('data-dynamic'), 'stuff');
  // });

  // QUnit.skip(`only text attributes are reflected on the underlying DOM element (${style.name})`, function() {
  //   registry.register('template:components/non-block', compile(`<${style.tagName}>In layout</${style.tagName}>`));

  //   view = appendViewFor('<non-block static-prop="static text" concat-prop="{{view.dynamic}} text" dynamic-prop={{view.dynamic}} />', {
  //     dynamic: 'dynamic'
  //   });

  //   let el = view.$(style.tagName);
  //   equal(el.length, 1, 'precond - the view was rendered');
  //   equal(el.text(), 'In layout');
  //   equal(el.attr('static-prop'), 'static text');
  //   equal(el.attr('concat-prop'), 'dynamic text');
  //   equal(el.attr('dynamic-prop'), undefined);
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
});

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

//   QUnit.test('block without properties', function() {
//     registry.register('template:components/with-block', compile('<with-block>In layout - {{yield}}</with-block>'));

//     view = appendViewFor('<with-block>In template</with-block>');

//     equal(view.$('with-block.ember-view').text(), 'In layout - In template', 'Both the layout and template are rendered');
//   });

//   QUnit.test('attributes are not installed on the top level', function() {
//     let component;

//     registry.register('template:components/non-block', compile('<non-block>In layout - {{attrs.text}} -- {{text}}</non-block>'));
//     registry.register('component:non-block', GlimmerComponent.extend({
//       // This is specifically attempting to trigger a 1.x-era heuristic that only copied
//       // attrs that were present as defined properties on the component.
//       text: null,
//       dynamic: null,

//       init() {
//         this._super(...arguments);
//         component = this;
//       }
//     }));

//     view = appendViewFor('<non-block text="texting" dynamic={{view.dynamic}} />', {
//       dynamic: 'dynamic'
//     });

//     let el = view.$('non-block.ember-view');
//     ok(el, 'precond - the view was rendered');

//     equal(el.text(), 'In layout - texting -- ');
//     equal(component.attrs.text, 'texting');
//     equal(component.attrs.dynamic, 'dynamic');
//     strictEqual(get(component, 'text'), null);
//     strictEqual(get(component, 'dynamic'), null);

//     run(() => view.rerender());

//     equal(el.text(), 'In layout - texting -- ');
//     equal(component.attrs.text, 'texting');
//     equal(component.attrs.dynamic, 'dynamic');
//     strictEqual(get(component, 'text'), null);
//     strictEqual(get(component, 'dynamic'), null);
//   });

//   QUnit.test('non-block with properties on attrs and component class', function() {
//     registry.register('component:non-block', GlimmerComponent.extend());
//     registry.register('template:components/non-block', compile('<non-block>In layout - someProp: {{attrs.someProp}}</non-block>'));

//     view = appendViewFor('<non-block someProp="something here" />');

//     equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
//   });

//   QUnit.test('rerendering component with attrs from parent', function() {
//     var willUpdate = 0;
//     var didReceiveAttrs = 0;

//     registry.register('component:non-block', GlimmerComponent.extend({
//       didReceiveAttrs() {
//         didReceiveAttrs++;
//       },

//       willUpdate() {
//         willUpdate++;
//       }
//     }));

//     registry.register('template:components/non-block', compile('<non-block>In layout - someProp: {{attrs.someProp}}</non-block>'));

//     view = appendViewFor('<non-block someProp={{view.someProp}} />', {
//       someProp: 'wycats'
//     });

//     equal(didReceiveAttrs, 1, 'The didReceiveAttrs hook fired');

//     equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

//     run(function() {
//       view.set('someProp', 'tomdale');
//     });

//     equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
//     equal(didReceiveAttrs, 2, 'The didReceiveAttrs hook fired again');
//     equal(willUpdate, 1, 'The willUpdate hook fired once');

//     run(view, 'rerender');

//     equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
//     equal(didReceiveAttrs, 3, 'The didReceiveAttrs hook fired again');
//     equal(willUpdate, 2, 'The willUpdate hook fired again');
//   });

//   QUnit.test('block with properties on attrs', function() {
//     registry.register('template:components/with-block', compile('<with-block>In layout - someProp: {{attrs.someProp}} - {{yield}}</with-block>'));

//     view = appendViewFor('<with-block someProp="something here">In template</with-block>');

//     equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
//   });

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

//   QUnit.test('computed property alias on attrs', function() {
//     registry.register('template:components/computed-alias', compile('<computed-alias>{{otherProp}}</computed-alias>'));

//     registry.register('component:computed-alias', GlimmerComponent.extend({
//       otherProp: alias('attrs.someProp')
//     }));

//     view = appendViewFor('<computed-alias someProp="value"></computed-alias>');

//     equal(view.$().text(), 'value');
//   });

//   QUnit.test('parameterized hasBlock default', function() {
//     registry.register('template:components/check-block', compile('<check-block>{{#if (hasBlock)}}Yes{{else}}No{{/if}}</check-block>'));

//     view = appendViewFor('<check-block id="expect-yes-1" />  <check-block id="expect-yes-2"></check-block>');

//     equal(view.$('#expect-yes-1').text(), 'Yes');
//     equal(view.$('#expect-yes-2').text(), 'Yes');
//   });

//   QUnit.test('non-expression hasBlock ', function() {
//     registry.register('template:components/check-block', compile('<check-block>{{#if hasBlock}}Yes{{else}}No{{/if}}</check-block>'));

//     view = appendViewFor('<check-block id="expect-yes-1" />  <check-block id="expect-yes-2"></check-block>');

//     equal(view.$('#expect-yes-1').text(), 'Yes');
//     equal(view.$('#expect-yes-2').text(), 'Yes');
//   });

//   QUnit.test('parameterized hasBlockParams', function() {
//     registry.register('template:components/check-params', compile('<check-params>{{#if (hasBlockParams)}}Yes{{else}}No{{/if}}</check-params>'));

//     view = appendViewFor('<check-params id="expect-no"/>  <check-params id="expect-yes" as |foo|></check-params>');

//     equal(view.$('#expect-no').text(), 'No');
//     equal(view.$('#expect-yes').text(), 'Yes');
//   });

//   QUnit.test('non-expression hasBlockParams', function() {
//     registry.register('template:components/check-params', compile('<check-params>{{#if hasBlockParams}}Yes{{else}}No{{/if}}</check-params>'));

//     view = appendViewFor('<check-params id="expect-no" />  <check-params id="expect-yes" as |foo|></check-params>');

//     equal(view.$('#expect-no').text(), 'No');
//     equal(view.$('#expect-yes').text(), 'Yes');
//   });
// }

// function regex(r) {
//   return {
//     match(v) {
//       return r.test(v);
//     }
//   };
// }

// function equalsElement(element, tagName, attributes, content) {
//   QUnit.push(element.tagName === tagName.toUpperCase(), element.tagName.toLowerCase(), tagName, `expect tagName to be ${tagName}`);

//   let expectedCount = 0;
//   for (let prop in attributes) {
//     expectedCount++;
//     let expected = attributes[prop];
//     if (typeof expected === 'string') {
//       QUnit.push(element.getAttribute(prop) === attributes[prop], element.getAttribute(prop), attributes[prop], `The element should have ${prop}=${attributes[prop]}`);
//     } else {
//       QUnit.push(attributes[prop].match(element.getAttribute(prop)), element.getAttribute(prop), attributes[prop], `The element should have ${prop}=${attributes[prop]}`);
//     }
//   }

//   let actualAttributes = {};
//   for (let i = 0, l = element.attributes.length; i < l; i++) {
//     actualAttributes[element.attributes[i].name] = element.attributes[i].value;
//   }

//   QUnit.push(element.attributes.length === expectedCount, actualAttributes, attributes, `Expected ${expectedCount} attributes`);

//   QUnit.push(element.innerHTML === content, element.innerHTML, content, `The element had '${content}' as its content`);
// }