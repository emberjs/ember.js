import isEnabled from 'ember-metal/features';
import EmberView from 'ember-views/views/view';
import Registry from 'container/registry';
//import jQuery from "ember-views/system/jquery";
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import { computed } from 'ember-metal/computed';

var registry, container, view;

QUnit.module('component - mutable bindings', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('a simple mutable binding propagates properly [DEPRECATED]', function(assert) {
  // TODO: attrs
  // expectDeprecation();

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

  assert.strictEqual(bottom.get('setMe'), 12, 'precond - the data propagated');

  run(() => bottom.set('setMe', 13));

  assert.strictEqual(bottom.get('setMe'), 13, 'precond - the set took effect');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
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

  assert.strictEqual(bottom.attrs.setMe.value, 12, 'precond - the data propagated');

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, 'precond - the set took effect');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
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

  assert.strictEqual(bottom.attrs.stuff.value, 'foo', 'precond - the data propagated');
  assert.strictEqual(view.$('p.bottom').text(), 'foo');
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

  assert.strictEqual(view.$('p.bottom').text(), '12');
  assert.strictEqual(bottom.attrs.setMe.value, 12, 'precond - the data propagated');

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, 'precond - the set took effect');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
});

QUnit.test('a simple mutable binding using `mut` can be converted into an immutable binding', function(assert) {
  var middle, bottom;

  registry.register('component:middle-mut', Component.extend({
    // no longer mutable
    layout: compile('{{bottom-mut setMe=(readonly attrs.value)}}'),

    didInsertElement() {
      middle = this;
    }
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

  assert.strictEqual(view.$('p.bottom').text(), '12');

  run(() => middle.attrs.value.update(13));

  assert.strictEqual(middle.attrs.value.value, 13, 'precond - the set took effect');
  assert.strictEqual(bottom.attrs.setMe, 13, 'the mutable binding has been converted to an immutable cell');
  assert.strictEqual(view.$('p.bottom').text(), '13');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
});

QUnit.test('mutable bindings work inside of yielded content', function(assert) {
  registry.register('component:middle-mut', Component.extend({
    layout: compile('{{#bottom-mut}}{{attrs.model.name}}{{/bottom-mut}}')
  }));

  registry.register('component:bottom-mut', Component.extend({
    layout: compile('<p class="bottom">{{yield}}</p>')
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{middle-mut model=(mut view.model)}}'),
    model: { name: 'Matthew Beale' }
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), 'Matthew Beale');
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

  assert.deepEqual(willRender, [12], 'willReceive is [12]');
  assert.deepEqual(didInsert, [12], 'didInsert is [12]');

  assert.strictEqual(bottom.attrs.setMe.value, 12, 'precond - the data propagated');

  run(() => bottom.attrs.setMe.update(13));

  assert.strictEqual(bottom.attrs.setMe.value, 13, 'precond - the set took effect');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
});

QUnit.test('a mutable binding with a backing computed property and attribute present in the root of the component is updated when the upstream property invalidates #11023', function(assert) {
  var bottom;

  registry.register('component:bottom-mut', Component.extend({
    thingy: null,

    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.extend({
    container: container,
    template: compile('{{bottom-mut thingy=(mut view.val)}}'),
    baseValue: 12,
    val: computed('baseValue', function() {
      return this.get('baseValue');
    })
  }).create();

  runAppend(view);

  assert.strictEqual(bottom.attrs.thingy.value, 12, 'data propagated');

  run(() => view.set('baseValue', 13));
  assert.strictEqual(bottom.attrs.thingy.value, 13, 'the set took effect');

  run(() => view.set('baseValue', 14));
  assert.strictEqual(bottom.attrs.thingy.value, 14, 'the set took effect');
});

QUnit.test('automatic mutable bindings tolerate undefined non-stream inputs', function(assert) {
  registry.register('template:components/x-outer', compile('{{x-inner model=attrs.nonexistent}}'));
  registry.register('template:components/x-inner', compile('hello'));

  view = EmberView.create({
    container: container,
    template: compile('{{x-outer}}')
  });

  runAppend(view);
  assert.strictEqual(view.$().text(), 'hello');
});

QUnit.test('automatic mutable bindings tolerate constant non-stream inputs', function(assert) {
  registry.register('template:components/x-outer', compile('{{x-inner model="foo"}}'));
  registry.register('template:components/x-inner', compile('hello{{attrs.model}}'));

  view = EmberView.create({
    container: container,
    template: compile('{{x-outer}}')
  });

  runAppend(view);
  assert.strictEqual(view.$().text(), 'hellofoo');
});

QUnit.test('automatic mutable bindings to undefined non-streams tolerate attempts to set them', function(assert) {
  var inner;

  registry.register('template:components/x-outer', compile('{{x-inner model=attrs.nonexistent}}'));
  registry.register('component:x-inner', Component.extend({
    didInsertElement() {
      inner = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{x-outer}}')
  });

  runAppend(view);
  run(() => inner.attrs.model.update(42));
  assert.equal(inner.attrs.model.value, 42);
});

QUnit.test('automatic mutable bindings to constant non-streams tolerate attempts to set them', function(assert) {
  var inner;

  registry.register('template:components/x-outer', compile('{{x-inner model=attrs.x}}'));
  registry.register('component:x-inner', Component.extend({
    didInsertElement() {
      inner = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('{{x-outer x="foo"}}')
  });

  runAppend(view);
  run(() => inner.attrs.model.update(42));
  assert.equal(inner.attrs.model.value, 42);
});


// jscs:disable validateIndentation
if (isEnabled('ember-htmlbars-component-generation')) {
QUnit.test('mutable bindings work as angle-bracket component attributes', function(assert) {
  var middle;

  registry.register('component:middle-mut', GlimmerComponent.extend({
    // no longer mutable
    layout: compile('<bottom-mut setMe={{attrs.value}} />'),

    didInsertElement() {
      middle = this;
    }
  }));

  registry.register('component:bottom-mut', GlimmerComponent.extend({
    layout: compile('<p class="bottom">{{attrs.setMe}}</p>')
  }));

  view = EmberView.create({
    container: container,
    template: compile('<middle-mut value={{mut view.val}} />'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), '12');

  run(() => middle.attrs.value.update(13));

  assert.strictEqual(middle.attrs.value.value, 13, 'precond - the set took effect');
  assert.strictEqual(view.$('p.bottom').text(), '13');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
});

QUnit.test('a simple mutable binding using `mut` can be converted into an immutable binding with angle-bracket components', function(assert) {
  var middle, bottom;

  registry.register('component:middle-mut', GlimmerComponent.extend({
    // no longer mutable
    layout: compile('<bottom-mut setMe={{attrs.value}} />'),

    didInsertElement() {
      middle = this;
    }
  }));

  registry.register('component:bottom-mut', GlimmerComponent.extend({
    layout: compile('<p class="bottom">{{attrs.setMe}}</p>'),

    didInsertElement() {
      bottom = this;
    }
  }));

  view = EmberView.create({
    container: container,
    template: compile('<middle-mut value={{mut view.val}} />'),
    val: 12
  });

  runAppend(view);

  assert.strictEqual(view.$('p.bottom').text(), '12');

  run(() => middle.attrs.value.update(13));

  assert.strictEqual(middle.attrs.value.value, 13, 'precond - the set took effect');
  assert.strictEqual(bottom.attrs.setMe, 13, 'the mutable binding has been converted to an immutable cell');
  assert.strictEqual(view.$('p.bottom').text(), '13');
  assert.strictEqual(view.get('val'), 13, 'the set propagated back up');
});
}
// jscs:enable validateIndentation
