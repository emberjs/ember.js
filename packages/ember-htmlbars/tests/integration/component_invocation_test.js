import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import jQuery from "ember-views/system/jquery";
import compile from "ember-template-compiler/system/compile";
import ComponentLookup from 'ember-views/component_lookup';
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";

var registry, container, view;

QUnit.module('component - invocation', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
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
    someProp: "wycats"
  }).create();

  runAppend(view);

  equal(didReceiveAttrs, 1, "The didReceiveAttrs hook fired");

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: wycats');

  run(function() {
    view.set('someProp', 'tomdale');
  });

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(didReceiveAttrs, 2, "The didReceiveAttrs hook fired again");
  equal(willUpdate, 1, "The willUpdate hook fired once");

  Ember.run(view, 'rerender');

  equal(jQuery('#qunit-fixture').text(), 'In layout - someProp: tomdale');
  equal(didReceiveAttrs, 3, "The didReceiveAttrs hook fired again");
  equal(willUpdate, 2, "The willUpdate hook fired again");
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

if (Ember.FEATURES.isEnabled('ember-views-component-block-info')) {
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
}

QUnit.test('static positional parameters', function() {
  registry.register('template:components/sample-component', compile('{{attrs.name}}{{attrs.age}}'));
  registry.register('component:sample-component', Component.extend({
    positionalParams: ['name', 'age']
  }));

  view = EmberView.extend({
    layout: compile('{{sample-component "Quint" 4}}'),
    container: container
  }).create();

  runAppend(view);

  equal(jQuery('#qunit-fixture').text(), 'Quint4');
});

QUnit.test('dynamic positional parameters', function() {
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

  runAppend(view);
  equal(jQuery('#qunit-fixture').text(), 'Quint4');
  run(function() {
    Ember.set(view.context, 'myName', 'Edward');
    Ember.set(view.context, 'myAge', '5');
  });

  equal(jQuery('#qunit-fixture').text(), 'Edward5');
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

if (Ember.FEATURES.isEnabled('ember-htmlbars-component-helper')) {
  QUnit.test('{{component}} helper works with positional params', function() {
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

    runAppend(view);
    equal(jQuery('#qunit-fixture').text(), 'Quint4');
    run(function() {
      Ember.set(view.context, 'myName', 'Edward');
      Ember.set(view.context, 'myAge', '5');
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
    Ember.set(view.context, 'activated', false);
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

QUnit.test("comopnent should rerender when a property is changed during children's rendering", function() {
  expectDeprecation(/twice in a single render/);

  var outer, middle;

  registry.register('component:x-outer', Component.extend({
    value: 1,
    grabReference: Ember.on('init', function() {
      outer = this;
    })
  }));

  registry.register('component:x-middle', Component.extend({
    grabReference: Ember.on('init', function() {
      middle = this;
    })
  }));

  registry.register('component:x-inner', Component.extend({
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
  equal(view.$('#middle-value').text(), '1', 'initial render of middle');

  run(() => outer.set('value', 2));

  equal(view.$('#inner-value').text(), '2', 'second render of inner');
  equal(view.$('#middle-value').text(), '2', 'second render of middle');

  run(() => outer.set('value', 3));

  equal(view.$('#inner-value').text(), '3', 'third render of inner');
  equal(view.$('#middle-value').text(), '3', 'third render of middle');

});

QUnit.test("comopnent should rerender when a property (with a default) is changed during children's rendering", function() {
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
