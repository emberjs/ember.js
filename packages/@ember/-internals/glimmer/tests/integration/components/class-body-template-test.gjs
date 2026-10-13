import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { moduleFor, RenderingTestCase, runLoopSettled, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { capabilities, setComponentManager } from '@ember/component';
import { renderComponent } from '@ember/renderer';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

// Component classes whose template is a class-body `<template>`, the way a
// `.gjs` / `.gts` module authors a component class: the component manager
// creates the component, and the class-body template renders with the
// component as `this`.

class State {
  @tracked value = 'one';
}

class Panel extends Component {
  label = 'panel';

  <template>
    <section data-test-panel ...attributes>{{this.label}}:{{yield this.label "x"}}</section>
  </template>
}

class Greeter extends Component {
  get greeting() {
    return 'base';
  }

  <template><p>{{this.greeting}} {{@name}}</p></template>
}

class LoudGreeter extends Greeter {
  get greeting() {
    return 'loud';
  }
}

class Bare extends Component {}

class CustomComponent {
  constructor(args) {
    this.args = args;
  }
}

class CustomManager {
  capabilities = capabilities('3.13');

  createComponent(ComponentClass, args) {
    return new ComponentClass(args.named);
  }

  getContext(component) {
    return component;
  }
}

setComponentManager(() => new CustomManager(), CustomComponent);

class Labelled extends CustomComponent {
  get text() {
    return `custom ${this.args.value}`;
  }

  <template>{{this.text}}</template>
}

module('Components test: a class-body <template> component', function (hooks) {
  setupRenderingTest(hooks);

  test('it yields to its block with block params and receives ...attributes', async function (assert) {
    await render(
      <template><Panel class="extra" title="t" as |label x|>[{{label}}-{{x}}]</Panel></template>
    );

    assert
      .dom('[data-test-panel]')
      .hasText('panel:[panel-x]')
      .hasAttribute('title', 't')
      .hasClass('extra');
  });

  test('a subclass renders the class-body template it inherits, with its own state', async function (assert) {
    await render(<template><Greeter @name="a" /><LoudGreeter @name="b" /></template>);

    assert.deepEqual(
      [...this.element.querySelectorAll('p')].map((p) => p.textContent),
      ['base a', 'loud b']
    );
  });

  test('a component class without a template yields its block', async function (assert) {
    await render(<template><Bare>block</Bare></template>);

    assert.dom().hasText('block');
  });

  test('renderComponent renders it, and its destruction destroys the component', async function (assert) {
    let destroyed = 0;

    class Root extends Component {
      text = 'root';

      willDestroy() {
        super.willDestroy();
        destroyed++;
      }

      <template><p>{{this.text}} {{@name}}</p></template>
    }

    let into = document.createElement('div');
    let result = renderComponent(Root, { owner: this.owner, into, args: { name: 'a' } });

    assert.strictEqual(into.textContent, 'root a');

    result.destroy();
    await settled();

    assert.strictEqual(into.textContent, '', 'its DOM is removed');
    assert.strictEqual(destroyed, 1, 'the component is destroyed');
  });

  test('a class with a custom component manager renders its class-body template', async function (assert) {
    let state = new State();

    await render(<template><Labelled @value={{state.value}} /></template>);

    assert.dom().hasText('custom one');

    state.value = 'two';
    await settled();

    assert.dom().hasText('custom two');
  });
});

moduleFor(
  'Components test: a class-body <template> component invoked by name',
  class extends RenderingTestCase {
    '@test it renders its own state, arguments, attributes and block, and keeps them current'(
      assert
    ) {
      let instances = [];

      class Greeting extends Component {
        @tracked punctuation = '!';

        constructor(owner, args) {
          super(owner, args);
          instances.push(this);
        }

        <template>
          <p data-test-greeting ...attributes>{{@greeting}}, {{@name}}{{this.punctuation}}{{yield "y"}}</p>
        </template>
      }

      this.owner.register('component:x-greeting', Greeting);

      this.render(
        '<XGreeting @greeting="Hello" @name={{this.name}} title="t" as |v|>[{{v}}]</XGreeting>',
        { name: 'world' }
      );

      let element = () => this.element.querySelector('[data-test-greeting]');
      let text = () => element()?.textContent;
      assert.strictEqual(text(), 'Hello, world![y]');
      assert.strictEqual(element().getAttribute('title'), 't');

      runTask(() => set(this.context, 'name', 'you'));
      assert.strictEqual(text(), 'Hello, you![y]');

      runTask(() => (instances[0].punctuation = '?'));
      assert.strictEqual(text(), 'Hello, you?[y]');

      assert.strictEqual(instances.length, 1, 'the component updated in place');
    }

    async '@test it is destroyed when it is torn down, and created again when it renders again'(
      assert
    ) {
      let instances = [];
      let destroyed = [];

      class Lifecycle extends Component {
        constructor(owner, args) {
          super(owner, args);
          instances.push(this);
        }

        willDestroy() {
          super.willDestroy();
          destroyed.push(instances.indexOf(this) + 1);
        }

        <template>live</template>
      }

      this.owner.register('component:life-cycle', Lifecycle);

      this.render('{{#if this.show}}<LifeCycle />{{/if}}', { show: true });

      assert.strictEqual(this.element.textContent, 'live');
      assert.strictEqual(instances.length, 1);

      runTask(() => set(this.context, 'show', false));
      await runLoopSettled();

      assert.strictEqual(this.element.textContent, '');
      assert.deepEqual(destroyed, [1], 'willDestroy ran');
      assert.true(instances[0].isDestroyed, 'the torn-down component is destroyed');

      runTask(() => set(this.context, 'show', true));

      assert.strictEqual(this.element.textContent, 'live');
      assert.strictEqual(instances.length, 2, 'rendering again creates a new component');
      assert.deepEqual(destroyed, [1], 'the new component is live');
    }
  }
);
