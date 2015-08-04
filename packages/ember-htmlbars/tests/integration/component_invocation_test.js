import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import EmberView from 'ember-views/views/view';
import Registry from 'container/registry';
import jQuery from 'ember-views/system/jquery';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';

var registry, container, view;

function commonSetup() {
  registry = new Registry();
  container = registry.container();
  registry.optionsForType('component', { singleton: false });
  registry.optionsForType('view', { singleton: false });
  registry.optionsForType('template', { instantiate: false });
  registry.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(container);
  runDestroy(view);
  registry = container = view = null;
}

function appendViewFor(template, hash={}) {
  let view = EmberView.extend({
    template: compile(template),
    container: container
  }).create(hash);

  runAppend(view);

  return view;
}

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

  registry.register('template:components/non-block', compile('In layout'));

  view = EmberView.extend({
    template: compile('{{non-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout');
});

QUnit.test('GlimmerComponent cannot be invoked with curly braces', function() {
  registry.register('template:components/non-block', compile('In layout'));
  registry.register('component:non-block', GlimmerComponent.extend());

  expectAssertion(function() {
    view = appendViewFor('{{non-block}}');
  }, /cannot invoke the 'non-block' component with curly braces/);
});

QUnit.test('block without properties', function() {
  expect(1);

  registry.register('template:components/with-block', compile('In layout - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - In template');
});

QUnit.test('non-block with properties on attrs', function() {
  expect(1);

  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('non-block with properties on attrs and component class', function() {
  registry.register('component:non-block', Component.extend());
  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('lookup of component takes priority over property', function() {
  expect(1);

  registry.register('template:components/some-component', compile('some-component'));

  view = EmberView.extend({
    template: compile('{{some-prop}} {{some-component}}'),
    container: container,
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

  registry.register('template:components/somecomponent', compile('somecomponent'));

  view = EmberView.extend({
    template: compile('{{somecomponent}}'),
    container: container,
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

  registry.register('component:non-block', Component.extend({
    didReceiveAttrs() {
      didReceiveAttrs++;
    },

    willUpdate() {
      willUpdate++;
    }
  }));
  registry.register('template:components/non-block', compile('In layout - someProp: {{attrs.someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp=view.someProp}}'),
    container: container,
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

  Ember.run(view, 'rerender');

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(didReceiveAttrs, 3, 'The didReceiveAttrs hook fired again');
  equal(willUpdate, 2, 'The willUpdate hook fired again');
});


QUnit.test('[DEPRECATED] non-block with properties on self', function() {
  // TODO: attrs
  // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  registry.register('template:components/non-block', compile('In layout - someProp: {{someProp}}'));

  view = EmberView.extend({
    template: compile('{{non-block someProp="something here"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
});

QUnit.test('block with properties on attrs', function() {
  expect(1);

  registry.register('template:components/with-block', compile('In layout - someProp: {{attrs.someProp}} - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

QUnit.test('[DEPRECATED] block with properties on self', function() {
  // TODO: attrs
  // expectDeprecation("You accessed the `someProp` attribute directly. Please use `attrs.someProp` instead.");

  registry.register('template:components/with-block', compile('In layout - someProp: {{someProp}} - {{yield}}'));

  view = EmberView.extend({
    template: compile('{{#with-block someProp="something here"}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
});

QUnit.test('with ariaRole specified', function() {
  expect(1);

  registry.register('template:components/aria-test', compile('Here!'));

  view = EmberView.extend({
    template: compile('{{aria-test id="aria-test" ariaRole="main"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$('#aria-test').attr('role'), 'main', 'role attribute is applied');
});

QUnit.test('`template` is true when block supplied', function() {
  expect(3);

  let innerComponent;
  registry.register('component:with-block', Component.extend({
    init() {
      this._super(...arguments);
      innerComponent = this;
    }
  }));

  view = EmberView.extend({
    template: compile('{{#with-block}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In template');

  let template;
  expectDeprecation(function() {
    template = get(innerComponent, 'template');
  }, /Accessing 'template' in .+ is deprecated. To determine if a block was specified to .+ please use '{{#if hasBlock}}' in the components layout./);


  ok(template, 'template property is truthy when a block was provided');
});

QUnit.test('`template` is false when no block supplied', function() {
  expect(2);

  let innerComponent;
  registry.register('component:without-block', Component.extend({
    init() {
      this._super(...arguments);
      innerComponent = this;
    }
  }));

  view = EmberView.extend({
    template: compile('{{without-block}}'),
    container: container
  }).create();

  runAppend(view);

  let template;
  expectDeprecation(function() {
    template = get(innerComponent, 'template');
  }, /Accessing 'template' in .+ is deprecated. To determine if a block was specified to .+ please use '{{#if hasBlock}}' in the components layout./);

  ok(!template, 'template property is falsey when a block was not provided');
});

QUnit.test('`template` specified in a component is overridden by block', function() {
  expect(1);

  registry.register('component:with-block', Component.extend({
    layout: compile('{{yield}}'),
    template: compile('Oh, noes!')
  }));

  view = EmberView.extend({
    template: compile('{{#with-block}}Whoop, whoop!{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'Whoop, whoop!', 'block provided always overrides template property');
});

QUnit.test('template specified inline is available from Views looked up as components', function() {
  expect(2);

  registry.register('component:without-block', EmberView.extend({
    template: compile('Whoop, whoop!')
  }));

  view = EmberView.extend({
    template: compile('{{without-block}}'),
    container: container
  }).create();

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using deprecated `template` property on a Component.');

  equal(view.$().text(), 'Whoop, whoop!', 'template inline works properly');
});

QUnit.test('hasBlock is true when block supplied', function() {
  expect(1);

  registry.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

  view = EmberView.extend({
    template: compile('{{#with-block}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In template');
});

QUnit.test('hasBlock is false when no block supplied', function() {
  expect(1);

  registry.register('template:components/with-block', compile('{{#if hasBlock}}{{yield}}{{else}}No Block!{{/if}}'));

  view = EmberView.extend({
    template: compile('{{with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'No Block!');
});

QUnit.test('hasBlockParams is true when block param supplied', function() {
  expect(1);

  registry.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}} - In Component{{else}}{{yield}} No Block!{{/if}}'));

  view = EmberView.extend({
    template: compile('{{#with-block as |something|}}In template{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In template - In Component');
});

QUnit.test('hasBlockParams is false when no block param supplied', function() {
  expect(1);

  registry.register('template:components/with-block', compile('{{#if hasBlockParams}}{{yield this}}{{else}}{{yield}} No Block Param!{{/if}}'));

  view = EmberView.extend({
    template: compile('{{#with-block}}In block{{/with-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In block No Block Param!');
});

QUnit.test('static named positional parameters [DEPRECATED]', function() {
  registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  registry.register('component:sample-component', Component.extend({
    positionalParams: ['name', 'age']
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component "Quint" 4}}'),
    container: container
  }).create();

  expectDeprecation(function() {
    runAppend(view);
  }, 'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });');

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
});

QUnit.test('dynamic named positional parameters [DEPRECATED]', function() {
  registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  registry.register('component:sample-component', Component.extend({
    positionalParams: ['name', 'age']
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component myName myAge}}'),
    container: container,
    context: {
      myName: 'Quint',
      myAge: 4
    }
  }).create();

  expectDeprecation(function() {
    runAppend(view);
  }, 'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });');

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
  run(function() {
    set(view.context, 'myName', 'Edward');
    set(view.context, 'myAge', '5');
  });

  equal(jQuery('#qunit-fixture').text(), 'Edward5');
});

QUnit.test('static arbitrary number of positional parameters [DEPRECATED]', function() {
  registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  registry.register('component:sample-component', Component.extend({
    positionalParams: 'names'
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component "Foo" 4 "Bar" id="args-3"}}{{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" id="helper"}}'),
    container: container
  }).create();

  expectDeprecation(function() {
    runAppend(view);
  }, 'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });');


  equal(view.$('#args-3').text(), 'Foo4Bar');
  equal(view.$('#args-5').text(), 'Foo4Bar5Baz');
  equal(view.$('#helper').text(), 'Foo4Bar5Baz');
});

QUnit.test('dynamic arbitrary number of positional parameters [DEPRECATED]', function() {
  registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  registry.register('component:sample-component', Component.extend({
    positionalParams: 'names'
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component user1 user2 id="direct"}}{{component "sample-component" user1 user2 id="helper"}}'),
    container: container,
    context: {
      user1: 'Foo',
      user2: 4
    }
  }).create();

  expectDeprecation(function() {
    runAppend(view);
  }, 'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });');

  equal(view.$('#direct').text(), 'Foo4');
  equal(view.$('#helper').text(), 'Foo4');
  run(function() {
    set(view.context, 'user1', 'Bar');
    set(view.context, 'user2', '5');
  });

  equal(view.$('#direct').text(), 'Bar5');
  equal(view.$('#helper').text(), 'Bar5');
});

QUnit.test('static named positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });
  registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  registry.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    layout: compile('{{sample-component "Quint" 4}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
});

QUnit.test('dynamic named positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: ['name', 'age']
  });

  registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  registry.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    layout: compile('{{sample-component myName myAge}}'),
    container: container,
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

QUnit.test('static arbitrary number of positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'names'
  });

  registry.register('template:components/sample-component', compile('{{#each attrs.names as |name|}}{{name}}{{/each}}'));
  registry.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    layout: compile('{{sample-component "Foo" 4 "Bar" id="args-3"}}{{sample-component "Foo" 4 "Bar" 5 "Baz" id="args-5"}}{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" id="helper"}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$('#args-3').text(), 'Foo4Bar');
  equal(view.$('#args-5').text(), 'Foo4Bar5Baz');
  equal(view.$('#helper').text(), 'Foo4Bar5Baz');
});

QUnit.test('dynamic arbitrary number of positional parameters', function() {
  var SampleComponent = Component.extend();
  SampleComponent.reopenClass({
    positionalParams: 'n'
  });
  registry.register('template:components/sample-component', compile('{{#each attrs.n as |name|}}{{name}}{{/each}}'));
  registry.register('component:sample-component', SampleComponent);

  view = EmberView.extend({
    layout: compile('{{sample-component user1 user2 id="direct"}}{{component "sample-component" user1 user2 id="helper"}}'),
    container: container,
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
  registry.register('template:components/sample-component', sampleComponentLayout);
  registry.register('component:sample-component', Component.extend({
    didInsertElement: function() {
      equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
    }
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component}}'),
    container
  }).create();

  runAppend(view);
});

QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
  expect(1);

  var templateModuleName = 'my-app-name/templates/application';
  registry.register('component:sample-component', Component.extend({
    didInsertElement: function() {
      equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
    }
  }));

  view = EmberView.extend({
    layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
      moduleName: templateModuleName
    }),
    container
  }).create();

  runAppend(view);
});

if (isEnabled('ember-htmlbars-component-helper')) {
  QUnit.test('{{component}} helper works with positional params [DEPRECATED]', function() {
    registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
    registry.register('component:sample-component', Component.extend({
      positionalParams: ['name', 'age']
    }));

    view = EmberView.extend({
      layout: compile('{{component "sample-component" myName myAge}}'),
      container: container,
      context: {
        myName: 'Quint',
        myAge: 4
      }
    }).create();

    expectDeprecation(function() {
      runAppend(view);
    }, 'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });');

    equal(jQuery('#qunit-fixture').text(), 'Quint4');
    run(function() {
      set(view.context, 'myName', 'Edward');
      set(view.context, 'myAge', '5');
    });

    equal(jQuery('#qunit-fixture').text(), 'Edward5');
  });

  QUnit.test('{{component}} helper works with positional params', function() {
    var SampleComponent = Component.extend();
    SampleComponent.reopenClass({
      positionalParams: ['name', 'age']
    });

    registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
    registry.register('component:sample-component', SampleComponent);

    view = EmberView.extend({
      layout: compile('{{component "sample-component" myName myAge}}'),
      container: container,
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
}

QUnit.test('yield to inverse', function() {
  registry.register('template:components/my-if', compile('{{#if predicate}}Yes:{{yield someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{#my-if predicate=activated someValue=42 as |result|}}Hello{{result}}{{else}}Goodbye{{/my-if}}'),
    container: container,
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
  registry.register('template:components/check-inverse', compile('{{#if (hasBlock "inverse")}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{#check-inverse id="expect-no"}}{{/check-inverse}}  {{#check-inverse id="expect-yes"}}{{else}}{{/check-inverse}}'),
    container: container
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('parameterized hasBlock default', function() {
  registry.register('template:components/check-block', compile('{{#if (hasBlock)}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}'),
    container: container
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('non-expression hasBlock ', function() {
  registry.register('template:components/check-block', compile('{{#if hasBlock}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{check-block id="expect-no"}}  {{#check-block id="expect-yes"}}{{/check-block}}'),
    container: container
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('parameterized hasBlockParams', function() {
  registry.register('template:components/check-params', compile('{{#if (hasBlockParams)}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}'),
    container: container
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('non-expression hasBlockParams', function() {
  registry.register('template:components/check-params', compile('{{#if hasBlockParams}}Yes{{else}}No{{/if}}'));

  view = EmberView.extend({
    layout: compile('{{#check-params id="expect-no"}}{{/check-params}}  {{#check-params id="expect-yes" as |foo|}}{{/check-params}}'),
    container: container
  }).create();

  runAppend(view);
  equal(jQuery('#qunit-fixture #expect-no').text(), 'No');
  equal(jQuery('#qunit-fixture #expect-yes').text(), 'Yes');
});

QUnit.test('implementing `render` allows pushing into a string buffer', function() {
  expect(1);

  registry.register('component:non-block', Component.extend({
    render(buffer) {
      buffer.push('<span id="zomg">Whoop!</span>');
    }
  }));

  view = EmberView.extend({
    template: compile('{{non-block}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$('#zomg').text(), 'Whoop!');
});


QUnit.test('components in template of a yielding component should have the proper parentView', function() {
  var outer, innerTemplate, innerLayout;

  registry.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  registry.register('component:x-inner-in-template', Component.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  }));

  registry.register('component:x-inner-in-layout', Component.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  }));

  registry.register('template:components/x-outer', compile('{{x-inner-in-layout}}{{yield}}'));

  view = EmberView.extend({
    template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}'),
    container: container
  }).create();

  runAppend(view);

  equal(innerTemplate.parentView, outer, 'receives the wrapping component as its parentView in template blocks');
  equal(innerLayout.parentView, outer, 'receives the wrapping component as its parentView in layout');
  equal(outer.parentView, view, 'x-outer receives the ambient scope as its parentView');
});

QUnit.test('newly-added sub-components get correct parentView', function() {
  var outer, inner;

  registry.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  registry.register('component:x-inner', Component.extend({
    init() {
      this._super(...arguments);
      inner = this;
    }
  }));

  view = EmberView.extend({
    template: compile('{{#x-outer}}{{#if view.showInner}}{{x-inner}}{{/if}}{{/x-outer}}'),
    container: container,
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

  registry.register('component:x-outer', Component.extend({
    init() {
      this._super(...arguments);
      outer = this;
    }
  }));

  registry.register('component:x-inner-in-template', Component.extend({
    init() {
      this._super(...arguments);
      innerTemplate = this;
    }
  }));

  registry.register('component:x-inner-in-layout', Component.extend({
    init() {
      this._super(...arguments);
      innerLayout = this;
    }
  }));

  registry.register('template:components/x-outer', compile('{{x-inner-in-layout}}{{yield}}'));

  view = EmberView.extend({
    _viewRegistry: viewRegistry,
    template: compile('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}'),
    container: container
  }).create();

  runAppend(view);

  equal(innerTemplate._viewRegistry, viewRegistry);
  equal(innerLayout._viewRegistry, viewRegistry);
  equal(outer._viewRegistry, viewRegistry);
});

QUnit.test('comopnent should rerender when a property is changed during children\'s rendering', function() {
  expectDeprecation(/modified value twice in a single render/);

  var outer, middle;

  registry.register('component:x-outer', Component.extend({
    value: 1,
    grabReference: Ember.on('init', function() {
      outer = this;
    })
  }));

  registry.register('component:x-middle', Component.extend({
    value: null,
    grabReference: Ember.on('init', function() {
      middle = this;
    })
  }));

  registry.register('component:x-inner', Component.extend({
    value: null,
    pushDataUp: Ember.observer('value', function() {
      middle.set('value', this.get('value'));
    })
  }));

  registry.register('template:components/x-outer', compile('{{#x-middle}}{{x-inner value=value}}{{/x-middle}}'));
  registry.register('template:components/x-middle', compile('<div id="middle-value">{{value}}</div>{{yield}}'));
  registry.register('template:components/x-inner', compile('<div id="inner-value">{{value}}</div>'));


  view = EmberView.extend({
    template: compile('{{x-outer}}'),
    container: container
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

  registry.register('template:components/non-block', compile('In layout. {{#each attrs.items as |item|}}[{{child-non-block item=item}}]{{/each}}'));
  registry.register('template:components/child-non-block', compile('Child: {{attrs.item}}.'));

  var items = Ember.A(['Tom', 'Dick', 'Harry']);

  view = EmberView.extend({
    template: compile('{{non-block items=view.items}}'),
    container: container,
    items: items
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

  run(function() {
    items.pushObject('James');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout. [Child: Tom.][Child: Dick.][Child: Harry.][Child: James.]');
});

// jscs:disable validateIndentation
if (isEnabled('ember-htmlbars-component-generation')) {
  QUnit.module('component - invocation (angle brackets)', {
    setup() {
      commonSetup();
    },

    teardown() {
      commonTeardown();
    }
  });

  QUnit.test('non-block without properties replaced with a fragment when the content is just text', function() {
    registry.register('template:components/non-block', compile('In layout'));

    view = appendViewFor('<non-block />');

    equal(view.$().html(), 'In layout', 'Just the fragment was used');
  });

  QUnit.test('legacy components cannot be invoked with angle brackets', function() {
    registry.register('template:components/non-block', compile('In layout'));
    registry.register('component:non-block', Component.extend());

    expectAssertion(function() {
      view = appendViewFor('<non-block />');
    }, /cannot invoke the 'non-block' component with angle brackets/);
  });

  QUnit.test('non-block without properties replaced with a fragment when the content is multiple elements', function() {
    registry.register('template:components/non-block', compile('<div>This is a</div><div>fragment</div>'));

    view = appendViewFor('<non-block />');

    equal(view.$().html(), '<div>This is a</div><div>fragment</div>', 'Just the fragment was used');
  });

  QUnit.test('non-block without properties replaced with a div', function() {
    // The whitespace is added intentionally to verify that the heuristic is not "a single node" but
    // rather "a single non-whitespace, non-comment node"
    registry.register('template:components/non-block', compile('  <div>In layout</div>  '));

    view = appendViewFor('<non-block />');

    equal(view.$().text(), '  In layout  ');
    ok(view.$().html().match(/^  <div id="[^"]*" class="ember-view">In layout<\/div>  $/), 'The root element has gotten the default class and ids');
    ok(view.$('div.ember-view[id]').length === 1, 'The div became an Ember view');

    run(view, 'rerender');

    equal(view.$().text(), '  In layout  ');
    ok(view.$().html().match(/^  <div id="[^"]*" class="ember-view">In layout<\/div>  $/), 'The root element has gotten the default class and ids');
    ok(view.$('div.ember-view[id]').length === 1, 'The non-block tag name was used');
  });

  QUnit.test('non-block without properties replaced with identity element', function() {
    registry.register('template:components/non-block', compile('<non-block such="{{attrs.stability}}">In layout</non-block>'));

    view = appendViewFor('<non-block stability={{view.stability}} />', {
      stability: 'stability'
    });

    let node = view.$()[0];
    equal(view.$().text(), 'In layout');
    ok(view.$().html().match(/^<non-block id="[^"]*" such="stability" class="ember-view">In layout<\/non-block>$/), 'The root element has gotten the default class and ids');
    ok(view.$('non-block.ember-view[id][such=stability]').length === 1, 'The non-block tag name was used');

    run(() => view.set('stability', 'stability!'));

    strictEqual(view.$()[0], node, 'the DOM node has remained stable');
    equal(view.$().text(), 'In layout');
    ok(view.$().html().match(/^<non-block id="[^"]*" such="stability!" class="ember-view">In layout<\/non-block>$/), 'The root element has gotten the default class and ids');
  });

  QUnit.test('non-block with class replaced with a div merges classes', function() {
    registry.register('template:components/non-block', compile('<div class="inner-class" />'));

    view = appendViewFor('<non-block class="{{view.outer}}" />', {
      outer: 'outer'
    });

    equal(view.$('div').attr('class'), 'inner-class outer ember-view', 'the classes are merged');

    run(() => view.set('outer', 'new-outer'));

    equal(view.$('div').attr('class'), 'inner-class new-outer ember-view', 'the classes are merged');
  });

  QUnit.test('non-block with class replaced with a identity element merges classes', function() {
    registry.register('template:components/non-block', compile('<non-block class="inner-class" />'));

    view = appendViewFor('<non-block class="{{view.outer}}" />', {
      outer: 'outer'
    });

    equal(view.$('non-block').attr('class'), 'inner-class outer ember-view', 'the classes are merged');

    run(() => view.set('outer', 'new-outer'));

    equal(view.$('non-block').attr('class'), 'inner-class new-outer ember-view', 'the classes are merged');
  });

  QUnit.test('non-block rendering a fragment', function() {
    registry.register('template:components/non-block', compile('<p>{{attrs.first}}</p><p>{{attrs.second}}</p>'));

    view = appendViewFor('<non-block first={{view.first}} second={{view.second}} />', {
      first: 'first1',
      second: 'second1'
    });

    equal(view.$().html(), '<p>first1</p><p>second1</p>', 'No wrapping element was created');

    run(view, 'setProperties', {
      first: 'first2',
      second: 'second2'
    });

    equal(view.$().html(), '<p>first2</p><p>second2</p>', 'The fragment was updated');
  });

    QUnit.test('block without properties', function() {
    registry.register('template:components/with-block', compile('<with-block>In layout - {{yield}}</with-block>'));

    view = appendViewFor('<with-block>In template</with-block>');

    equal(view.$('with-block.ember-view').text(), 'In layout - In template', 'Both the layout and template are rendered');
  });

    QUnit.test('non-block with properties on attrs', function() {
    registry.register('template:components/non-block', compile('<non-block>In layout</non-block>'));

    view = appendViewFor('<non-block static-prop="static text" concat-prop="{{view.dynamic}} text" dynamic-prop={{view.dynamic}} />', {
      dynamic: 'dynamic'
    });

    let el = view.$('non-block.ember-view');
    ok(el, 'precond - the view was rendered');
    equal(el.attr('static-prop'), 'static text');
    equal(el.attr('concat-prop'), 'dynamic text');
    equal(el.attr('dynamic-prop'), undefined);

    //equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
  });

  QUnit.test('attributes are not installed on the top level', function() {
    let component;

    registry.register('template:components/non-block', compile('<non-block>In layout - {{attrs.text}} -- {{text}}</non-block>'));
    registry.register('component:non-block', GlimmerComponent.extend({
      // This is specifically attempting to trigger a 1.x-era heuristic that only copied
      // attrs that were present as defined properties on the component.
      text: null,
      dynamic: null,

      init() {
        this._super(...arguments);
        component = this;
      }
    }));

    view = appendViewFor('<non-block text="texting" dynamic={{view.dynamic}} />', {
      dynamic: 'dynamic'
    });

    let el = view.$('non-block.ember-view');
    ok(el, 'precond - the view was rendered');

    equal(el.text(), 'In layout - texting -- ');
    equal(component.attrs.text, 'texting');
    equal(component.attrs.dynamic, 'dynamic');
    strictEqual(get(component, 'text'), null);
    strictEqual(get(component, 'dynamic'), null);

    run(() => view.rerender());

    equal(el.text(), 'In layout - texting -- ');
    equal(component.attrs.text, 'texting');
    equal(component.attrs.dynamic, 'dynamic');
    strictEqual(get(component, 'text'), null);
    strictEqual(get(component, 'dynamic'), null);
  });

  QUnit.test('non-block with properties on attrs and component class', function() {
    registry.register('component:non-block', GlimmerComponent.extend());
    registry.register('template:components/non-block', compile('<non-block>In layout - someProp: {{attrs.someProp}}</non-block>'));

    view = appendViewFor('<non-block someProp="something here" />');

    equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here');
  });

  QUnit.test('rerendering component with attrs from parent', function() {
    var willUpdate = 0;
    var didReceiveAttrs = 0;

    registry.register('component:non-block', GlimmerComponent.extend({
      didReceiveAttrs() {
        didReceiveAttrs++;
      },

      willUpdate() {
        willUpdate++;
      }
    }));

    registry.register('template:components/non-block', compile('<non-block>In layout - someProp: {{attrs.someProp}}</non-block>'));

    view = appendViewFor('<non-block someProp={{view.someProp}} />', {
      someProp: 'wycats'
    });

    equal(didReceiveAttrs, 1, 'The didReceiveAttrs hook fired');

    equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

    run(function() {
      view.set('someProp', 'tomdale');
    });

    equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
    equal(didReceiveAttrs, 2, 'The didReceiveAttrs hook fired again');
    equal(willUpdate, 1, 'The willUpdate hook fired once');

    Ember.run(view, 'rerender');

    equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
    equal(didReceiveAttrs, 3, 'The didReceiveAttrs hook fired again');
    equal(willUpdate, 2, 'The willUpdate hook fired again');
  });

  QUnit.test('block with properties on attrs', function() {
    registry.register('template:components/with-block', compile('<with-block>In layout - someProp: {{attrs.someProp}} - {{yield}}</with-block>'));

    view = appendViewFor('<with-block someProp="something here">In template</with-block>');

    equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: something here - In template');
  });

  QUnit.test('moduleName is available on _renderNode when a layout is present', function() {
    expect(1);

    var layoutModuleName = 'my-app-name/templates/components/sample-component';
    var sampleComponentLayout = compile('<sample-component>Sample Component - {{yield}}</sample-component>', {
      moduleName: layoutModuleName
    });
    registry.register('template:components/sample-component', sampleComponentLayout);
    registry.register('component:sample-component', GlimmerComponent.extend({
      didInsertElement: function() {
        equal(this._renderNode.lastResult.template.meta.moduleName, layoutModuleName);
      }
    }));

    view = EmberView.extend({
      layout: compile('<sample-component />'),
      container
    }).create();

    runAppend(view);
  });

  QUnit.test('moduleName is available on _renderNode when no layout is present', function() {
    expect(1);

    var templateModuleName = 'my-app-name/templates/application';
    registry.register('component:sample-component', Component.extend({
      didInsertElement: function() {
        equal(this._renderNode.lastResult.template.meta.moduleName, templateModuleName);
      }
    }));

    view = EmberView.extend({
      layout: compile('{{#sample-component}}Derp{{/sample-component}}', {
        moduleName: templateModuleName
      }),
      container
    }).create();

    runAppend(view);
  });

  QUnit.test('parameterized hasBlock default', function() {
    registry.register('template:components/check-block', compile('<check-block>{{#if (hasBlock)}}Yes{{else}}No{{/if}}</check-block>'));

    view = appendViewFor('<check-block id="expect-yes-1" />  <check-block id="expect-yes-2"></check-block>');

    equal(view.$('#expect-yes-1').text(), 'Yes');
    equal(view.$('#expect-yes-2').text(), 'Yes');
  });

  QUnit.test('non-expression hasBlock ', function() {
    registry.register('template:components/check-block', compile('<check-block>{{#if hasBlock}}Yes{{else}}No{{/if}}</check-block>'));

    view = appendViewFor('<check-block id="expect-yes-1" />  <check-block id="expect-yes-2"></check-block>');

    equal(view.$('#expect-yes-1').text(), 'Yes');
    equal(view.$('#expect-yes-2').text(), 'Yes');
  });

  QUnit.test('parameterized hasBlockParams', function() {
    registry.register('template:components/check-params', compile('<check-params>{{#if (hasBlockParams)}}Yes{{else}}No{{/if}}</check-params>'));

    view = appendViewFor('<check-params id="expect-no"/>  <check-params id="expect-yes" as |foo|></check-params>');

    equal(view.$('#expect-no').text(), 'No');
    equal(view.$('#expect-yes').text(), 'Yes');
  });

  QUnit.test('non-expression hasBlockParams', function() {
    registry.register('template:components/check-params', compile('<check-params>{{#if hasBlockParams}}Yes{{else}}No{{/if}}</check-params>'));

    view = appendViewFor('<check-params id="expect-no" />  <check-params id="expect-yes" as |foo|></check-params>');

    equal(view.$('#expect-no').text(), 'No');
    equal(view.$('#expect-yes').text(), 'Yes');
  });

  QUnit.test('implementing `render` allows pushing into a string buffer', function() {
    expect(1);

    registry.register('component:non-block', Component.extend({
      render(buffer) {
        buffer.push('<span id="zomg">Whoop!</span>');
      }
    }));

    expectAssertion(function() {
      appendViewFor('<non-block />');
    });
  });
}
