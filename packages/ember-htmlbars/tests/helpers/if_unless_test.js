import run from "ember-metal/run_loop";
import Namespace from 'ember-runtime/system/namespace';
import { Registry } from "ember-runtime/system/container";
import EmberView from "ember-views/views/view";
import ObjectProxy from "ember-runtime/system/object_proxy";
import EmberObject from "ember-runtime/system/object";
import _MetamorphView from 'ember-views/views/metamorph_view';
import compile from "ember-template-compiler/system/compile";

import { set } from 'ember-metal/property_set';
import { fmt } from 'ember-runtime/system/string';
import { typeOf } from 'ember-metal/utils';
import { forEach } from 'ember-metal/enumerable_utils';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var originalLookup = Ember.lookup;

var view, lookup, registry, container, TemplateTests;

QUnit.module("ember-htmlbars: {{#if}} and {{#unless}} helpers", {
  setup() {
    Ember.lookup = lookup = {};
    lookup.TemplateTests = TemplateTests = Namespace.create();
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.register('view:default', _MetamorphView);
    registry.register('view:toplevel', EmberView.extend());
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

QUnit.test("unless should keep the current context (#784) [DEPRECATED]", function() {
  view = EmberView.create({
    o: EmberObject.create({ foo: '42' }),

    template: compile('{{#with view.o}}{{#view}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the block param form (`{{#with bar as |foo|}}`) instead.');

  equal(view.$().text(), 'foo: 42');
});

QUnit.test("The `if` helper tests for `isTruthy` if available", function() {
  view = EmberView.create({
    truthy: EmberObject.create({ isTruthy: true }),
    falsy: EmberObject.create({ isTruthy: false }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), 'Yep');
});

QUnit.test("The `if` helper does not error on undefined", function() {
  view = EmberView.create({
    undefinedValue: undefined,
    template: compile('{{#if view.undefinedValue}}Yep{{/if}}{{#unbound if view.undefinedValue}}Yep{{/unbound}}')
  });

  runAppend(view);

  equal(view.$().text(), '');
});

QUnit.test("The `unless` helper does not error on undefined", function() {
  view = EmberView.create({
    undefinedValue: undefined,
    template: compile('{{#unless view.undefinedValue}}YepBound{{/unless}}{{#unbound unless view.undefinedValue}}YepUnbound{{/unbound}}')
  });

  runAppend(view);

  equal(view.$().text(), 'YepBoundYepUnbound');
});

QUnit.test("The `if` helper does not print the contents for an object proxy without content", function() {
  view = EmberView.create({
    truthy: ObjectProxy.create({ content: {} }),
    falsy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.truthy}}Yep{{/if}}{{#if view.falsy}}Nope{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), 'Yep');
});

QUnit.test("The `if` helper updates if an object proxy gains or loses context", function() {
  view = EmberView.create({
    proxy: ObjectProxy.create({ content: null }),

    template: compile('{{#if view.proxy}}Yep{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('proxy.content', {});
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.set('proxy.content', null);
  });

  equal(view.$().text(), '');
});

QUnit.test("The `if` helper updates if an array is empty or not", function() {
  view = EmberView.create({
    array: Ember.A(),

    template: compile('{{#if view.array}}Yep{{/if}}')
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.get('array').pushObject(1);
  });

  equal(view.$().text(), 'Yep');

  run(function() {
    view.get('array').removeObject(1);
  });

  equal(view.$().text(), '');
});

QUnit.test("The `if` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#if view.conditional}}Yep{{/if}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Yep');
  run(function() {
    view.set('conditional', false);
  });
  equal(view.$().text(), '');
});

QUnit.test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: true,
    template: compile('{{#unbound if view.conditional}}Yep{{/unbound}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Yep');
  run(function() {
    view.set('conditional', false);
  });
  equal(view.$().text(), 'Yep');
});

QUnit.test("The `unless` helper updates when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unless view.conditional}}Nope{{/unless}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Nope');
  run(function() {
    view.set('conditional', true);
  });
  equal(view.$().text(), '');
});

QUnit.test("The `unbound if` helper does not update when the value changes", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unbound unless view.conditional}}Nope{{/unbound}}')
  });
  runAppend(view);
  equal(view.$().text(), 'Nope');
  run(function() {
    view.set('conditional', true);
  });
  equal(view.$().text(), 'Nope');
});

QUnit.test("The `unbound if` helper should work when its inverse is not present", function() {
  view = EmberView.create({
    conditional: false,
    template: compile('{{#unbound if view.conditional}}Yep{{/unbound}}')
  });
  runAppend(view);
  equal(view.$().text(), '');
});

QUnit.test("The `if` helper ignores a controller option", function() {
  var lookupCalled = false;

  view = EmberView.create({
    container: {
      lookup() {
        lookupCalled = true;
      }
    },
    truthy: true,

    template: compile('{{#if view.truthy controller="foo"}}Yep{{/if}}')
  });

  runAppend(view);

  equal(lookupCalled, false, 'controller option should NOT be used');
});

QUnit.test('should not rerender if truthiness does not change', function() {
  var renderCount = 0;

  view = EmberView.create({
    template: compile('<h1 id="first">{{#if view.shouldDisplay}}{{view view.InnerViewClass}}{{/if}}</h1>'),

    shouldDisplay: true,

    InnerViewClass: EmberView.extend({
      template: compile('bam'),

      render() {
        renderCount++;
        return this._super.apply(this, arguments);
      }
    })
  });

  runAppend(view);

  equal(renderCount, 1, 'precond - should have rendered once');
  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');

  run(function() {
    set(view, 'shouldDisplay', 1);
  });

  equal(renderCount, 1, 'should not have rerendered');
  equal(view.$('#first').text(), 'bam', 'renders block when condition is true');
});

QUnit.test('should update the block when object passed to #unless helper changes', function() {
  registry.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  runAppend(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', fmt('renders block when conditional is "%@"; %@', [String(val), typeOf(val)]));

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

QUnit.test('should update the block when object passed to #if helper changes', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', fmt('hides block when conditional is "%@"', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', fmt('renders alternate if %@', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('views within an if statement should be sane on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.display}}{{input}}{{/if}}'),
    display: false
  });

  runAppend(view);

  equal(view.$('input').length, 0);

  run(function() {
    // Setting twice will trigger the observer twice, this is intentional
    view.set('display', true);
    view.set('display', 'yes');
  });

  var textfield = view.$('input');
  equal(textfield.length, 1);

  // Make sure the view is still registered in View.views
  ok(EmberView.views[textfield.attr('id')]);
});

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('should update the block when object passed to #unless helper changes', function() {
  registry.register('template:advice', compile('<h1>{{#unless view.onDrugs}}{{view.doWellInSchool}}{{/unless}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'advice',

    onDrugs: true,
    doWellInSchool: 'Eat your vegetables'
  });

  runAppend(view);

  equal(view.$('h1').text(), '', 'hides block if true');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'onDrugs', val);
    });

    equal(view.$('h1').text(), 'Eat your vegetables', fmt('renders block when conditional is "%@"; %@', [String(val), typeOf(val)]));

    run(function() {
      set(view, 'onDrugs', true);
    });

    equal(view.$('h1').text(), '', 'precond - hides block when conditional is true');
  });
});

QUnit.test('properties within an if statement should not fail on re-render', function() {
  view = EmberView.create({
    template: compile('{{#if view.value}}{{view.value}}{{/if}}'),
    value: null
  });

  runAppend(view);

  equal(view.$().text(), '');

  run(function() {
    view.set('value', 'test');
  });

  equal(view.$().text(), 'test');

  run(function() {
    view.set('value', null);
  });

  equal(view.$().text(), '');
});

QUnit.test('should update the block when object passed to #if helper changes', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: 'OOOOoooooOOOOOOooooooo'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'renders block if a string');

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), '', fmt('hides block when conditional is "%@"', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('should update the block when object passed to #if helper changes and an inverse is supplied', function() {
  registry.register('template:menu', compile('<h1>{{#if view.inception}}{{view.INCEPTION}}{{else}}{{view.SAD}}{{/if}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    INCEPTION: 'BOOOOOOOONG doodoodoodoodooodoodoodoo',
    inception: false,
    SAD: 'BOONG?'
  });

  runAppend(view);

  equal(view.$('h1').text(), 'BOONG?', 'renders alternate if false');

  run(function() { set(view, 'inception', true); });

  var tests = [false, null, undefined, [], '', 0];

  forEach(tests, function(val) {
    run(function() {
      set(view, 'inception', val);
    });

    equal(view.$('h1').text(), 'BOONG?', fmt('renders alternate if %@', [String(val)]));

    run(function() {
      set(view, 'inception', true);
    });

    equal(view.$('h1').text(), 'BOOOOOOOONG doodoodoodoodooodoodoodoo', 'precond - renders block when conditional is true');
  });
});

QUnit.test('the {{this}} helper should not fail on removal', function() {
  view = EmberView.create({
    context: 'abc',
    template: compile('{{#if view.show}}{{this}}{{/if}}'),
    show: true
  });

  runAppend(view);

  equal(view.$().text(), 'abc', 'should start property - precond');

  run(function() {
    view.set('show', false);
  });

  equal(view.$().text(), '');
});

QUnit.test('edge case: child conditional should not render children if parent conditional becomes false', function() {
  var childCreated = false;
  var child = null;

  view = EmberView.create({
    cond1: true,
    cond2: false,
    viewClass: EmberView.extend({
      init() {
        this._super.apply(this, arguments);
        childCreated = true;
        child = this;
      }
    }),
    template: compile('{{#if view.cond1}}{{#if view.cond2}}{{#view view.viewClass}}test{{/view}}{{/if}}{{/if}}')
  });

  runAppend(view);

  ok(!childCreated, 'precondition');

  run(function() {
    // The order of these sets is important for the test
    view.set('cond2', true);
    view.set('cond1', false);
  });

  // TODO: Priority Queue, for now ensure correct result.
  //ok(!childCreated, 'child should not be created');
  ok(child.isDestroyed, 'child should be gone');
  equal(view.$().text(), '');
});

QUnit.test('edge case: rerender appearance of inner virtual view', function() {
  view = EmberView.create({
    tagName: '',
    cond2: false,
    template: compile('{{#if view.cond2}}test{{/if}}')
  });

  runAppend(view);
  equal(Ember.$('#qunit-fixture').text(), '');

  run(function() {
    view.set('cond2', true);
  });

  equal(Ember.$('#qunit-fixture').text(), 'test');
});

if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
  QUnit.test("`if` helper with inline form: renders the second argument when conditional is truthy", function() {
    view = EmberView.create({
      conditional: true,
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'truthy');
  });

  QUnit.test("`if` helper with inline form: renders the third argument when conditional is falsy", function() {
    view = EmberView.create({
      conditional: false,
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'falsy');
  });

  QUnit.test("`if` helper with inline form: can omit the falsy argument", function() {
    view = EmberView.create({
      conditional: true,
      template: compile('{{if view.conditional "truthy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'truthy');
  });

  QUnit.test("`if` helper with inline form: can omit the falsy argument and renders nothing when conditional is falsy", function() {
    view = EmberView.create({
      conditional: false,
      template: compile('{{if view.conditional "truthy"}}')
    });

    runAppend(view);

    equal(view.$().text(), '');
  });

  QUnit.test("`if` helper with inline form: truthy and falsy arguments are changed if conditional changes", function() {
    view = EmberView.create({
      conditional: true,
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'truthy');

    run(function() {
      view.set('conditional', false);
    });

    equal(view.$().text(), 'falsy');
  });

  QUnit.test("`if` helper with inline form: can use truthy param as binding", function() {
    view = EmberView.create({
      truthy: 'ok',
      conditional: true,
      template: compile('{{if view.conditional view.truthy}}')
    });

    runAppend(view);

    equal(view.$().text(), 'ok');

    run(function() {
      view.set('truthy', 'yes');
    });

    equal(view.$().text(), 'yes');
  });

  QUnit.test("`if` helper with inline form: can use falsy param as binding", function() {
    view = EmberView.create({
      truthy: 'ok',
      falsy: 'boom',
      conditional: false,
      template: compile('{{if view.conditional view.truthy view.falsy}}')
    });

    runAppend(view);

    equal(view.$().text(), 'boom');

    run(function() {
      view.set('falsy', 'no');
    });

    equal(view.$().text(), 'no');
  });

  QUnit.test("`if` helper with inline form: raises when using more than three arguments", function() {
    view = EmberView.create({
      conditional: true,
      template: compile('{{if one two three four}}')
    });

    expectAssertion(function() {
      runAppend(view);
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  });

  QUnit.test("`if` helper with inline form: raises when using less than two arguments", function() {
    view = EmberView.create({
      conditional: true,
      template: compile('{{if one}}')
    });

    expectAssertion(function() {
      runAppend(view);
    }, /The inline form of the `if` and `unless` helpers expect two or three arguments/);
  });

  QUnit.test("`if` helper with inline form: works when used in a sub expression", function() {
    view = EmberView.create({
      conditional: true,
      innerConditional: true,
      template: compile('{{if view.conditional (if view.innerConditional "truthy" )}}')
    });

    runAppend(view);

    equal(view.$().text(), 'truthy');
  });

  QUnit.test("`if` helper with inline form: updates if condition changes in a sub expression", function() {
    view = EmberView.create({
      conditional: true,
      innerConditional: true,
      template: compile('{{if view.conditional (if view.innerConditional "innerTruthy" "innerFalsy")}}')
    });

    runAppend(view);

    equal(view.$().text(), 'innerTruthy');

    run(function() {
      view.set('innerConditional', false);
    });

    equal(view.$().text(), 'innerFalsy');
  });

  QUnit.test("`if` helper with inline form: can use truthy param as binding in a sub expression", function() {
    view = EmberView.create({
      conditional: true,
      innerConditional: true,
      innerTruthy: "innerTruthy",
      template: compile('{{if view.conditional (if view.innerConditional view.innerTruthy)}}')
    });

    runAppend(view);

    equal(view.$().text(), 'innerTruthy');

    run(function() {
      view.set('innerTruthy', 'innerOk');
    });

    equal(view.$().text(), 'innerOk');
  });

  QUnit.test("`if` helper with inline form: respects isTruthy when object changes", function() {
    view = EmberView.create({
      conditional: Ember.Object.create({ isTruthy: false }),
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'falsy');

    run(function() {
      view.set('conditional', Ember.Object.create({ isTruthy: true }));
    });

    equal(view.$().text(), 'truthy');

    run(function() {
      view.set('conditional', Ember.Object.create({ isTruthy: false }));
    });

    equal(view.$().text(), 'falsy');

  });

  QUnit.test("`if` helper with inline form: respects isTruthy when property changes", function() {
    var candidate = Ember.Object.create({ isTruthy: false });

    view = EmberView.create({
      conditional: candidate,
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'falsy');

    run(function() {
      candidate.set('isTruthy', true);
    });

    equal(view.$().text(), 'truthy');

    run(function() {
      candidate.set('isTruthy', false);
    });

    equal(view.$().text(), 'falsy');

  });

  QUnit.test("`if` helper with inline form: respects length test when list content changes", function() {
    var list = Ember.A();

    view = EmberView.create({
      conditional: list,
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'falsy');

    run(function() {
      list.pushObject(1);
    });

    equal(view.$().text(), 'truthy');

    run(function() {
      list.replace(0, 1);
    });

    equal(view.$().text(), 'falsy');

  });

  QUnit.test("`if` helper with inline form: respects length test when list itself", function() {
    view = EmberView.create({
      conditional: [],
      template: compile('{{if view.conditional "truthy" "falsy"}}')
    });

    runAppend(view);

    equal(view.$().text(), 'falsy');

    run(function() {
      view.set('conditional', [1]);
    });

    equal(view.$().text(), 'truthy');

    run(function() {
      view.set('conditional', []);
    });

    equal(view.$().text(), 'falsy');

  });

}
