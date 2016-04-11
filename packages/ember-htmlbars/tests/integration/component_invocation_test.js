import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { A as emberA } from 'ember-runtime/system/native_array';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('component', { singleton: false });
  owner.registerOptionsForType('view', { singleton: false });
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(owner);
  runDestroy(view);
  owner = view = null;
}

function appendViewFor(template, hash={}) {
  let view = EmberView.extend({
    [OWNER]: owner,
    template: compile(template)
  }).create(hash);

  runAppend(view);

  return view;
}

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('component - invocation', {
  setup() {
    commonSetup();
  },

  teardown() {
    commonTeardown();
  }
});

QUnit.test('non-block without properties', function() {
  expect(1);

  owner.register('template:components/non-block', compile('In layout'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout');
});

QUnit.test('GlimmerComponent cannot be invoked with curly braces', function() {
  owner.register('template:components/non-block', compile('In layout'));
  owner.register('component:non-block', GlimmerComponent.extend());

  expectAssertion(function() {
    view = appendViewFor('{{non-block}}');
  }, /cannot invoke the 'non-block' component with curly braces/);
});

QUnit.test('block without properties', function() {
  expect(1);

  owner.register('template:components/with-block', compile('In layout - {{yield}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block}}In template{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - In template');
});

QUnit.test('non-block with properties on attrs', function() {
  expect(1);

  owner.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block someProp="something here"}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('non-block with properties on attrs and component class', function() {
  owner.register('component:non-block', Component.extend());
  owner.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block someProp="something here"}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('non-block with properties on overridden in init', function() {
  owner.register('component:non-block', Component.extend({
    someProp: null,

    init() {
      this._super(...arguments);
      this.someProp = 'value set in init';
    }
  }));
  owner.register('template:components/non-block', compile('In layout - someProp: {{someProp}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block someProp="something passed when invoked"}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'In layout - someProp: value set in init');
});

QUnit.test('lookup of component takes priority over property', function() {
  expect(1);

  owner.register('template:components/some-component', compile('some-component'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{some-prop}} {{some-component}}'),
    context: {
      'some-component': 'not-some-component',
      'some-prop': 'some-prop'
    }
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'some-prop some-component');
});

QUnit.test('component without dash is not looked up', function() {
  expect(1);

  owner.register('template:components/somecomponent', compile('somecomponent'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{somecomponent}}'),
    context: {
      'somecomponent': 'notsomecomponent'
    }
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'notsomecomponent');
});

QUnit.test('rerendering component with attrs from parent', function() {
  var willUpdate = 0;
  var didReceiveAttrs = 0;

  owner.register('component:non-block', Component.extend({
    didReceiveAttrs() {
      didReceiveAttrs++;
    },

    willUpdate() {
      willUpdate++;
    }
  }));
  owner.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block someProp=view.someProp}}'),
    someProp: 'wycats'
  }).create();

  runAppend(view);

  equal(didReceiveAttrs, 1, 'The didReceiveAttrs hook fired');

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

  run(function() {
    view.set('someProp', 'tomdale');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(didReceiveAttrs, 2, 'The didReceiveAttrs hook fired again');
  equal(willUpdate, 1, 'The willUpdate hook fired once');

  run(view, 'rerender');

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(didReceiveAttrs, 3, 'The didReceiveAttrs hook fired again');
  equal(willUpdate, 2, 'The willUpdate hook fired again');
});


QUnit.test('[DEPRECATED] non-block with properties on self', function() {
  // TODO: attrs
  // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  owner.register('template:components/non-block', compile('In layout - someProp: {{someProp}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block someProp="something here"}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('block with properties on attrs', function() {
  expect(1);

  owner.register('template:components/with-block', compile('In layout - someProp: {{attrs.someProp}} - {{yield}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

QUnit.test('[DEPRECATED] block with properties on self', function() {
  // TODO: attrs
  // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  owner.register('template:components/with-block', compile('In layout - someProp: {{someProp}} - {{yield}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

QUnit.test('changing `layout` causes component to re-render with the new layout', function() {
  let innerComponent;
  registry.register('template:components/foo-bar', compile('Here!'));
  registry.register('component:foo-bar', Component.extend({
    init() {
      this._super(...arguments);
      innerComponent = this;
    }
  }));

  view = EmberView.extend({
    template: compile('{{foo-bar}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'Here!', 'initial layout is used');

  run(function() {
    innerComponent.set('layout', compile('Not there!'));
  });

  equal(view.$().text(), 'Not there!', 'updated layout is used');
});

QUnit.test('with ariaRole specified', function() {
  expect(1);

  owner.register('template:components/aria-test', compile('Here!'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{aria-test id="aria-test" ariaRole="main"}}')
  }).create();

  runAppend(view);

  equal(view.$('#aria-test').attr('role'), 'main', 'role attribute is applied');
});

QUnit.test('`template` specified in a component is overridden by block', function() {
  expect(1);

  owner.register('component:with-block', Component.extend({
    layout: compile('{{yield}}'),
    template: compile('Oh, noes!')
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block}}Whoop, whoop!{{/with-block}}')
  }).create();

  runAppend(view);

  equal(view.$().text(), 'Whoop, whoop!', 'block provided always overrides template property');
});

QUnit.test('hasBlock is true when block supplied', function() {
  expect(1);

  owner.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block}}In template{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In template');
});

QUnit.test('hasBlock is false when no block supplied', function() {
  expect(1);

  owner.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'No Block!');
});

QUnit.test('hasBlockParams is true when block param supplied', function() {
  expect(1);

  owner.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block!{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block as |something|}}In template{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In template - In Component');
});

QUnit.test('hasBlockParams is false when no block param supplied', function() {
  expect(1);

  owner.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}}{{else}}{{yield}} No Block Param!{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#with-block}}In block{{/with-block}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In block No Block Param!');
});

QUnit.test('static named positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });
  owner.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component "Quint" 4}}')
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
});

QUnit.test('dynamic named positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  owner.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component myName myAge}}'),
    context: {
      myName: 'Quint',
      myAge: 4
    }
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
  run(function() {
    set(view.context, 'myName', 'Edward');
    set(view.context, 'myAge', '5');
  });

  equal(jQuery('#qunit-fixture').text(), 'Edward5');
});

QUnit.test('if a value is passed as a non-positional parameter, it takes precedence over the named one', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name']
  });

  owner.register('template:components/sample-component', compile('{{attrs.name}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component notMyName name=myName}}'),
    context: {
      myName: 'Quint',
      notMyName: 'Sergio'
    }
  }).create();

  expectAssertion(function() {
    runAppend(view);
  }, `You cannot specify both a positional param (at position 0) and the hash argument \`name\`.`);
});

QUnit.test('static arbitrary number of positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  owner.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component "Foo" 4 "Bar" id="args-3"}}{{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" id="helper"}}')
  }).create();

  runAppend(view);

  equal(view.$('#args-3').text(), 'Foo4Bar');
  equal(view.$('#args-5').text(), 'Foo4Bar5Baz');
  equal(view.$('#helper').text(), 'Foo4Bar5Baz');
});

QUnit.test('arbitrary positional parameter conflict with hash parameter is reported', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  owner.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component "Foo" 4 "Bar" names=numbers id="args-3"}}'),
    context: {
      numbers: [1, 2, 3]
    }
  }).create();

  expectAssertion(function() {
    runAppend(view);
  }, `You cannot specify positional parameters and the hash argument \`names\`.`);
});

QUnit.test('can use hash parameter instead of arbitrary positional param [GH #12444]', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  owner.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component names=things id="args-3"}}'),
    context: {
      things: ['Foo', 4, 'Bar']
    }
  }).create();

  runAppend(view);

  equal(view.$('#args-3').text(), 'Foo4Bar');
});

QUnit.test('can use hash parameter instead of positional param', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['first', 'second']
  });

  owner.register('template:components/sample-component', compile('{{attrs.first}} - {{attrs.second}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile(`
      {{sample-component "one" "two" id="two-positional"}}
      {{sample-component "one" second="two" id="one-positional"}}
      {{sample-component first="one" second="two" id="no-positional"}}

    `),
    context: {
      things: ['Foo', 4, 'Bar']
    }
  }).create();

  runAppend(view);

  equal(view.$('#two-positional').text(), 'one - two');
  equal(view.$('#one-positional').text(), 'one - two');
  equal(view.$('#no-positional').text(), 'one - two');
});

QUnit.test('dynamic arbitrary number of positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'n'
  });
  owner.register('template:components/sample-component', compile('{{#each attrs.n as |name|}}{{name}}{{/each}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component user1 user2 id="direct"}}{{component "sample-component" user1 user2 id="helper"}}'),
    context: {
      user1: 'Foo',
      user2: 4
    }
  }).create();

  runAppend(view);

  equal(view.$('#direct').text(), 'Foo4');
  equal(view.$('#helper').text(), 'Foo4');
  run(function() {
    set(view.context, 'user1', 'Bar');
    set(view.context, 'user2', '5');
  });

  equal(view.$('#direct').text(), 'Bar5');
  equal(view.$('#helper').text(), 'Bar5');

  run(function() {
    set(view.context, 'user2', '6');
  });

  equal(view.$('#direct').text(), 'Bar6');
  equal(view.$('#helper').text(), 'Bar6');
});

QUnit.test('moduleName is available on _renderNode when a layout is present', function() {
  expect(1);

  var layoutModuleName = 'my-app-name/templates/components/sample-component';
  var sampleComponentLayout = compile('Sample Component - {{yield}}', {
    moduleName: layoutModuleName
  });
  owner.register('template:components/sample-component', sampleComponentLayout);
  owner.register('component:sample-component', Component.extend({
    didInsertElement: function() {
      equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{sample-component}}')
  }).create();

  runAppend(view);
});

QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
  expect(1);

  var templateModuleName = 'my-app-name/templates/application';
  owner.register('component:sample-component', Component.extend({
    didInsertElement: function() {
      equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
      moduleName: templateModuleName
    })
  }).create();

  runAppend(view);
});

QUnit.test('{{component}} helper works with positional params', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  owner.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  owner.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{component "sample-component" myName myAge}}'),
    context: {
      myName: 'Quint',
      myAge: 4
    }
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture').text(), 'Quint4');
  run(function() {
    set(view.context, 'myName', 'Edward');
    set(view.context, 'myAge', '5');
  });

  equal(jQuery('#qunit-fixture').text(), 'Edward5');
});

QUnit.test('yield to inverse', function() {
  owner.register('template:components/my-if', compile('{{#if predicate}}Yes:{{yield someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{#my-if predicate=activated someValue=42 as |result|}}Hello{{result}}{{else}}Goodbye{{/my-if}}'),
    context: {
      activated: true
    }
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture').text(), 'Yes:Hello42');
  run(function() {
    set(view.context, 'activated', false);
  });

  equal(jQuery('#qunit-fixture').text(), 'No:Goodbye');
});

QUnit.test('parameterized hasBlock inverse', function() {
  owner.register('template:components/check-inverse', compile('{{#if (hasBlock "inverse")}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{#check-inverse id="expect-no"}}{{/check-inverse}}  {{#check-inverse id="expect-yes"}}{{else}}{{/check-inverse}}')
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('parameterized hasBlock default', function() {
  owner.register('template:components/check-block', compile('{{#if (hasBlock)}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}')
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('non-expression hasBlock ', function() {
  owner.register('template:components/check-block', compile('{{#if hasBlock}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}')
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('parameterized hasBlockParams', function() {
  owner.register('template:components/check-params', compile('{{#if (hasBlockParams)}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}')
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('non-expression hasBlockParams', function() {
  owner.register('template:components/check-params', compile('{{#if hasBlockParams}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    layout: compile('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}')
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('components in template of a yielding component should have the proper parentView', function() {
  var outer, innerTemplate, innerLayout;

  owner.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  owner.register('component:x-inner-in-template', Component.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  }));

  owner.register('component:x-inner-in-layout', Component.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  }));

  owner.register('template:components/x-outer', compile('{{x-inner-in-layout}}{{yield}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}')
  }).create();

  runAppend(view);

  equal(innerTemplate.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equal(innerLayout.parentView, outer, 'receives the wrapping component as its parentView in layout');
  equal(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

QUnit.test('newly-added sub-components get correct parentView', function() {
  var outer, inner;

  owner.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  owner.register('component:x-inner', Component.extend({
    init() {
      this._super(...arguments);
      inner = this;
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#x-outer}}{{#if view.showInner}}{{x-inner}}{{/if}}{{/x-outer}}'),
    showInner: false
  }).create();

  runAppend(view);

  run(() => { view.set('showInner', true); });

  equal(inner.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equal(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

QUnit.test('components should receive the viewRegistry from the parent view', function() {
  var outer, innerTemplate, innerLayout;

  var viewRegistry = {};

  owner.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  owner.register('component:x-inner-in-template', Component.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  }));

  owner.register('component:x-inner-in-layout', Component.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  }));

  owner.register('template:components/x-outer', compile('{{x-inner-in-layout}}{{yield}}'));

  view = EmberView.extend({
    [OWNER]: owner,
    _viewRegistry: viewRegistry,
    template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}')
  }).create();

  runAppend(view);

  equal(innerTemplate._viewRegistry, viewRegistry);
  equal(innerLayout._viewRegistry, viewRegistry);
  equal(outer._viewRegistry, viewRegistry);
});

QUnit.test('comopnent should rerender when a property is changed during children\'s rendering', function() {
  expectDeprecation(/modified value twice in a single render/);

  var outer, middle;

  owner.register('component:x-outer', Component.extend({
    value: 1,
    grabReference: Ember.on('init', function() {
      outer = this;
    })
  }));

  owner.register('component:x-middle', Component.extend({
    value: null,
    grabReference: Ember.on('init', function() {
      middle = this;
    })
  }));

  owner.register('component:x-inner', Component.extend({
    value: null,
    pushDataUp: Ember.observer('value', function() {
      middle.set('value', this.get('value'));
    })
  }));

  owner.register('template:components/x-outer', compile('{{#x-middle}}{{x-inner value=value}}{{/x-middle}}'));
  owner.register('template:components/x-middle', compile('<div id="middle-value">{{value}}</div>{{yield}}'));
  owner.register('template:components/x-inner', compile('<div id="inner-value">{{value}}</div>'));


  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{x-outer}}')
  }).create();

  runAppend(view);

  equal(view.$('#inner-value').text(), '1', 'initial render of inner');
  equal(view.$('#middle-value').text(), '', 'initial render of middle (observers do not run during init)');

  run(() => outer.set('value', 2));

  equal(view.$('#inner-value').text(), '2', 'second render of inner');
  equal(view.$('#middle-value').text(), '2', 'second render of middle');

  run(() => outer.set('value', 3));

  equal(view.$('#inner-value').text(), '3', 'third render of inner');
  equal(view.$('#middle-value').text(), '3', 'third render of middle');
});

QUnit.test('non-block with each rendering child components', function() {
  expect(2);

  owner.register('template:components/non-block', compile('In layout. {{#each attrs.items as |item|}}[{{child-non-block item=item}}]{{/each}}'));
  owner.register('template:components/child-non-block', compile('Child: {{attrs.item}}.'));

  var items = emberA(['Tom', 'Dick', 'Harry']);

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{non-block items=view.items}}'),
    items: items
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

  run(function() {
    items.pushObject('James');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.][Child: James.]');
});

QUnit.test('specifying classNames results in correct class', function(assert) {
  expect(3);

  let clickyThing;
  owner.register('component:some-clicky-thing', Component.extend({
    tagName: 'button',
    classNames: ['foo', 'bar'],
    init() {
      this._super(...arguments);
      clickyThing = this;
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#some-clicky-thing classNames="baz"}}Click Me{{/some-clicky-thing}}')
  }).create();

  runAppend(view);

  let button = view.$('button');
  ok(button.is('.foo.bar.baz.ember-view'), 'the element has the correct classes: ' + button.attr('class'));

  let expectedClassNames = ['ember-view', 'foo', 'bar', 'baz'];
  assert.deepEqual(clickyThing.get('classNames'),  expectedClassNames, 'classNames are properly combined');

  let buttonClassNames = button.attr('class');
  assert.deepEqual(buttonClassNames.split(' '), expectedClassNames, 'all classes are set 1:1 in DOM');
});

QUnit.test('specifying custom concatenatedProperties avoids clobbering', function(assert) {
  expect(1);

  let clickyThing;
  owner.register('component:some-clicky-thing', Component.extend({
    concatenatedProperties: ['blahzz'],
    blahzz: ['blark', 'pory'],
    init() {
      this._super(...arguments);
      clickyThing = this;
    }
  }));

  view = EmberView.extend({
    [OWNER]: owner,
    template: compile('{{#some-clicky-thing blahzz="baz"}}Click Me{{/some-clicky-thing}}')
  }).create();

  runAppend(view);

  assert.deepEqual(clickyThing.get('blahzz'),  ['blark', 'pory', 'baz'], 'property is properly combined');
});

}
