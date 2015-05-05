import EmberView from "ember-views/views/view";
import Registry from "container/registry";
//import jQuery from "ember-views/system/jquery";
import compile from "ember-template-compiler/system/compile";
import ComponentLookup from 'ember-views/component_lookup';
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";

var registry, container, view;

QUnit.module('component - mutable bindings', {
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

QUnit.test('a simple mutable binding propagates properly [DEPRECATED]', function(assert) {
  expectDeprecation();

  var bottom;

  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{bottom-mut setMe=value}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value=view.val}}'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(bottom.get('setMe'), 12, "precond - the data propagated");

  run(() => bottom.set('setMe', 13));

  assert.strictEqual(bottom.get('setMe'), 13, "precond - the set took effect");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

QUnit.test('a simple mutable binding using `mut` propagates properly', function(assert) {
  var bottom;

  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{bottom-mut setMe=(mut attrs.value)}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value=(mut view.val)}}'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(bottom.attrs.setMe.value, 12, "precond - the data propagated");

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, "precond - the set took effect");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

QUnit.test('using a string value through middle tier does not trigger assertion', function(assert) {
  var bottom;

  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{bottom-mut stuff=attrs.value}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    layout: compile('<p class="bottom">{{attrs.stuff}}</p>'),
    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value="foo"}}'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(bottom.attrs.stuff.value, 'foo', "precond - the data propagated");
  assert.strictEqual(view.$('p.bottom').text(), "foo");
});

QUnit.test('a simple mutable binding using `mut` inserts into the DOM', function(assert) {
  var bottom;

  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{bottom-mut setMe=(mut attrs.value)}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    layout: compile('<p class="bottom">{{attrs.setMe}}</p>'),
    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value=(mut view.val)}}'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), "12");
  assert.strictEqual(bottom.attrs.setMe.value, 12, "precond - the data propagated");

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, "precond - the set took effect");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

QUnit.test('a simple mutable binding using `mut` can be converted into an immutable binding', function(assert) {
  var middle;

  registry.register('component:middle-mut', Component.extend({
    // no longer mutable
    layout: compile('{{bottom-mut setMe=attrs.value}}'),

    didInsertElement() {
      middle = this;
    }
  }));

  registry.register('component:bottom-mut', Component.extend({
    layout: compile('<p class="bottom">{{attrs.setMe}}</p>')
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value=(mut view.val)}}'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), "12");

  run(() => middle.attrs.value.update(13));

  assert.strictEqual(middle.attrs.value.value, 13, "precond - the set took effect");
  assert.strictEqual(view.$('p.bottom').text(), "13");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

QUnit.test('a simple mutable binding using `mut` is available in hooks', function(assert) {
  var bottom;
  var willRender = [];
  var didInsert = [];

  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{bottom-mut setMe=(mut attrs.value)}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    willRender() {
      willRender.push(this.attrs.setMe.value);
    },
    didInsertElement() {
      didInsert.push(this.attrs.setMe.value);
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut value=(mut view.val)}}'),
    val: 12
  });

  runAppend(view);

  assert.deepEqual(willRender, [12], "willReceive is [12]");
  assert.deepEqual(didInsert, [12], "didInsert is [12]");

  assert.strictEqual(bottom.attrs.setMe.value, 12, "precond - the data propagated");

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, "precond - the set took effect");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

// jscs:disable validateIndentation
if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {

QUnit.test('mutable bindings work as angle-bracket component attributes', function(assert) {
  var middle;

  registry.register('component:middle-mut', Component.extend({
    // no longer mutable
    layout: compile('<bottom-mut setMe={{attrs.value}} />'),

    didInsertElement() {
      middle = this;
    }
  }));

  registry.register('component:bottom-mut', Component.extend({
    layout: compile('<p class="bottom">{{attrs.setMe}}</p>')
  }));

  view = EmberView.create({
    container: container,
    template: compile('<middle-mut value={{mut view.val}} />'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), "12");

  run(() => middle.attrs.value.update(13));

  assert.strictEqual(middle.attrs.value.value, 13, "precond - the set took effect");
  assert.strictEqual(view.$('p.bottom').text(), "13");
  assert.strictEqual(view.get('val'), 13, "the set propagated back up");
});

}
// jscs:enable validateIndentation
