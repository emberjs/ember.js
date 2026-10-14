import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { moduleFor, RenderingTestCase, runLoopSettled, runTask } from 'internal-test-helpers';
import { notifyPropertyChange, set } from '@ember/object';
import { capabilities, setComponentManager, setComponentTemplate } from '@ember/component';
import { renderComponent } from '@ember/renderer';
import { precompileTemplate } from '@ember/template-compilation';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

// Component classes whose template is a class-body `<template>`, the way a
// `.gjs` / `.gts` module authors a component class: the component manager
// creates the component, and the class-body template renders with the
// component as `this`. Also component classes with a registered template
// (`setComponentTemplate`), invoked from a `.gjs` template: the nearest
// template wins, as in Glimmer.

class State {
  @tracked value = 'one';
  @tracked show = true;
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

module('Components test: a component class with a registered template', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders through its component manager, with its arguments, attributes and block', async function (assert) {
    class Counter extends Component {
      count = 0;

      get label() {
        return `${this.args.name}:${this.count}`;
      }
    }
    setComponentTemplate(
      precompileTemplate('<p data-test-counter ...attributes>{{this.label}}{{yield "y"}}</p>'),
      Counter
    );

    let state = new State();

    await render(
      <template><Counter @name={{state.value}} title="t" as |v|>[{{v}}]</Counter></template>
    );

    assert.dom('[data-test-counter]').hasText('one:0[y]').hasAttribute('title', 't');

    state.value = 'two';
    await settled();

    assert.dom('[data-test-counter]').hasText('two:0[y]');
  });

  test('a subclass renders the template registered for its base class', async function (assert) {
    class Base extends Component {
      get value() {
        return 'base';
      }
    }
    setComponentTemplate(precompileTemplate('registered {{this.value}} {{@name}}'), Base);

    class Sub extends Base {
      get value() {
        return 'sub';
      }
    }

    await render(<template><Base @name="a" />|<Sub @name="b" /></template>);

    assert.dom().hasText('registered base a|registered sub b');
  });

  test('a subclass with a class-body template renders it, not the template registered for its base class', async function (assert) {
    class Base extends Component {
      value = 'base';
    }
    setComponentTemplate(precompileTemplate('registered {{this.value}}'), Base);

    class WithBody extends Base {
      <template>body {{this.value}} {{@name}}</template>
    }

    let state = new State();

    await render(<template><WithBody @name={{state.value}} /></template>);

    assert.dom().hasText('body base one');

    state.value = 'two';
    await settled();

    assert.dom().hasText('body base two');
  });

  test('a template registered for a subclass wins over the class-body template it inherits', async function (assert) {
    class Own extends Panel {}
    setComponentTemplate(precompileTemplate('own {{this.label}}'), Own);

    await render(<template><Own /></template>);

    assert.dom().hasText('own panel');
  });

  // Glimmer renders the NEAREST template on the class chain, whether it is a
  // registration or a class-body `<template>`.
  test('a template registered for an intermediate class wins over a class-body template further up', async function (assert) {
    class Mid extends Panel {}
    setComponentTemplate(precompileTemplate('mid {{this.label}}'), Mid);

    class Leaf extends Mid {
      label = 'leaf';
    }

    await render(<template><Mid />|<Leaf /></template>);

    assert.dom().hasText('mid panel|mid leaf');
  });

  test('a class-body template of an intermediate class wins over a registration further up', async function (assert) {
    class Base extends Component {
      value = 'base';
    }
    setComponentTemplate(precompileTemplate('registered {{this.value}}'), Base);

    class Mid extends Base {
      <template>mid {{this.value}}</template>
    }

    class Leaf extends Mid {
      value = 'leaf';
    }

    await render(<template><Base />|<Mid />|<Leaf /></template>);

    assert.dom().hasText('registered base|mid base|mid leaf');
  });

  test('it is destroyed when it is torn down', async function (assert) {
    let destroyed = 0;

    class Live extends Component {
      willDestroy() {
        super.willDestroy();
        destroyed++;
      }
    }
    setComponentTemplate(precompileTemplate('live'), Live);

    let state = new State();

    await render(<template>{{#if state.show}}<Live />{{/if}}</template>);

    assert.dom().hasText('live');

    state.show = false;
    await settled();

    assert.dom().hasText('');
    assert.strictEqual(destroyed, 1, 'willDestroy ran');
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

    '@test a subclass with a class-body template renders it, not the template registered for its base class'(
      assert
    ) {
      class Base extends Component {
        value = 'base';
      }
      setComponentTemplate(precompileTemplate('registered {{this.value}}'), Base);

      class WithBody extends Base {
        <template>body {{this.value}} {{@name}}</template>
      }

      this.owner.register('component:with-body', WithBody);

      this.render('<WithBody @name={{this.name}} />', { name: 'a' });

      assert.strictEqual(this.element.textContent, 'body base a');

      runTask(() => set(this.context, 'name', 'b'));

      assert.strictEqual(this.element.textContent, 'body base b');
    }

    '@test a strict-mode template renders a class with a registered template from its scope'(
      assert
    ) {
      let instances = [];

      class Inner extends Component {
        @tracked count = 0;

        constructor(owner, args) {
          super(owner, args);
          instances.push(this);
        }
      }
      setComponentTemplate(precompileTemplate('[{{this.count}} {{@name}}]'), Inner);

      class Outer extends Component {}
      setComponentTemplate(
        precompileTemplate('<Inner @name={{@name}} />', {
          strictMode: true,
          scope: () => ({ Inner }),
        }),
        Outer
      );

      this.owner.register('component:outer-host', Outer);

      this.render('<OuterHost @name={{this.name}} />', { name: 'a' });

      assert.strictEqual(this.element.textContent, '[0 a]');

      runTask(() => set(this.context, 'name', 'b'));

      assert.strictEqual(this.element.textContent, '[0 b]');

      runTask(() => instances[0].count++);

      assert.strictEqual(this.element.textContent, '[1 b]');
      assert.strictEqual(instances.length, 1, 'the component updated in place');
    }

    '@test set() on a plain field updates its template; an assignment without set() does not'(
      assert
    ) {
      let instance;

      class Clicks extends Component {
        clicks = 0;
        data = { count: 0 };

        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }

        <template>{{this.clicks}}/{{this.data.count}}</template>
      }

      this.owner.register('component:x-clicks', Clicks);

      this.render('<XClicks />');

      assert.strictEqual(this.element.textContent, '0/0');

      runTask(() => set(instance, 'clicks', 1));

      assert.strictEqual(this.element.textContent, '1/0');

      runTask(() => set(instance.data, 'count', 1));

      assert.strictEqual(this.element.textContent, '1/1', 'set() on an object it reads');

      runTask(() => (instance.clicks = 2));

      assert.strictEqual(this.element.textContent, '1/1', 'an assignment does not notify');

      runTask(() => notifyPropertyChange(instance, 'clicks'));

      assert.strictEqual(this.element.textContent, '2/1', 'notifyPropertyChange() does');
    }

    '@test set() on a plain field updates the template of a class invoked from a strict-mode template'(
      assert
    ) {
      let instance;

      class Clicks extends Component {
        clicks = 0;

        constructor(owner, args) {
          super(owner, args);
          instance = this;
        }

        <template>{{this.clicks}}</template>
      }

      class Host extends Component {}
      setComponentTemplate(
        precompileTemplate('<Clicks />', { strictMode: true, scope: () => ({ Clicks }) }),
        Host
      );

      this.owner.register('component:clicks-host', Host);

      this.render('<ClicksHost />');

      assert.strictEqual(this.element.textContent, '0');

      runTask(() => set(instance, 'clicks', 1));

      assert.strictEqual(this.element.textContent, '1');
    }
  }
);
