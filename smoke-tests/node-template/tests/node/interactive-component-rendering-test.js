import { capabilities, setModifierManager } from 'ember-source/@ember/modifier/index.js';
import setupComponentTest from './helpers/setup-component.js';

function probeModifier(assert) {
  let manager = {
    capabilities: capabilities('3.22'),
    createModifier() {
      return {};
    },
    installModifier(_state, element, args) {
      assert.step(`install on ${element.tagName} with ${args.positional[0]}`);
    },
    updateModifier() {},
    destroyModifier() {},
  };

  return setModifierManager(() => manager, {});
}

function hooksComponent(Component, assert) {
  return class extends Component {
    tagName = 'section';

    willRender() {
      assert.step('willRender');
    }
    willInsertElement() {
      assert.step('willInsertElement');
    }
    didInsertElement() {
      assert.step(`didInsertElement on ${this.element.tagName}`);
    }
    didRender() {
      assert.step('didRender');
    }
  };
}

QUnit.module('Components can be rendered interactively without a DOM dependency', function (hooks) {
  setupComponentTest(hooks, { isInteractive: true });

  QUnit.test('Simple component', function (assert) {
    let html = this.render('<h1>Hello</h1>');

    assert.ok(html.match(/<h1>Hello<\/h1>/));
  });

  QUnit.test('Component with dynamic value', function (assert) {
    this.set('location', 'World');

    let html = this.render('<h1>Hello {{this.location}}</h1>');

    assert.ok(html.match(/<h1>Hello World<\/h1>/));
  });

  QUnit.test('modifiers run', function (assert) {
    this.owner.register('modifier:probe', probeModifier(assert), { instantiate: false });

    let html = this.render('<h1 {{probe "an argument"}}>Hello</h1>');

    assert.ok(html.match(/<h1>Hello<\/h1>/));
    assert.verifySteps(['install on H1 with an argument']);
  });

  QUnit.test('the render hooks of a classic component run', function (assert) {
    this.owner.register('component:with-hooks', hooksComponent(this.Component, assert));

    let html = this.render('{{with-hooks}}');

    assert.ok(html.match(/<section[^>]*><\/section>/));
    assert.verifySteps([
      'willRender',
      'willInsertElement',
      'didInsertElement on SECTION',
      'didRender',
    ]);
  });
});

QUnit.module('Components can be rendered without a DOM dependency', function (hooks) {
  setupComponentTest(hooks);

  QUnit.test('modifiers do not run', function (assert) {
    this.owner.register('modifier:probe', probeModifier(assert), { instantiate: false });

    let html = this.render('<h1 {{probe "an argument"}}>Hello</h1>');

    assert.ok(html.match(/<h1>Hello<\/h1>/));
    assert.verifySteps([]);
  });

  QUnit.test('the render hooks of a classic component do not run', function (assert) {
    this.owner.register('component:with-hooks', hooksComponent(this.Component, assert));

    let html = this.render('{{with-hooks}}');

    assert.ok(html.match(/<section[^>]*><\/section>/));
    assert.verifySteps([]);
  });
});
