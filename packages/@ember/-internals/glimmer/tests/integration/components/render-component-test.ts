import {
  AbstractStrictTestCase,
  assertClassicComponentElement,
  assertHTML,
  buildOwner,
  clickElement,
  defineSimpleHelper,
  defineSimpleModifier,
  moduleFor,
  type ClassicComponentShape,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { precompileTemplate } from '@ember/template-compilation';
import { template } from '@ember/template-compiler/runtime';
import { template as compileTimeTemplate } from '@ember/template-compiler';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { array, concat, fn, get, hash } from '@ember/helper';
import { on } from '@ember/modifier';
import GlimmerComponent from '@glimmer/component';

import { destroy, associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { renderComponent, renderSettled, type RenderResult } from '../../../lib/renderer';
import { renderers } from '../../../lib/renderers';
import { trackedObject } from '@ember/reactive/collections';
import { cached, tracked } from '@glimmer/tracking';
import Service, { service } from '@ember/service';
import type Owner from '@ember/owner';
import { ENV } from '@ember/-internals/environment';
import { captureRenderTree } from '@ember/debug';
import type { CapturedRenderNode } from '@glimmer/interfaces';

class RenderComponentTestCase extends AbstractStrictTestCase {
  declare component: (RenderResult & { rerender: () => void }) | undefined;
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);

    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element() {
    return document.querySelector('#qunit-fixture')!;
  }

  async assertChange({ change, expect }: { change: () => void; expect: string }) {
    change();
    await renderSettled();

    assertHTML(expect);

    await this.assertStableRerender();
  }

  async renderComponent(
    component: object,
    options: { args?: Record<string, unknown>; expect: string } | { classic: ClassicComponentShape }
  ) {
    let { owner } = this;

    const result = renderComponent(component, {
      owner,
      args: 'args' in options ? options.args : {},
      env: { document: document, isInteractive: true, hasDOM: true },
      into: this.element,
    });
    this.component = {
      ...result,
      rerender() {
        // unused, but asserted against
      },
    };
    registerDestructor(this, () => result.destroy());

    if ('expect' in options) {
      assertHTML(options.expect);
    } else {
      assertClassicComponentElement(options.classic);
    }

    await this.assertStableRerender();
  }
}

moduleFor(
  'Strict Mode - RenderComponentTestCase',
  class extends RenderComponentTestCase {
    async afterEach() {
      if (this.component) {
        destroy(this);
        await renderSettled();
      }
    }

    async '@test destroy cleans up dom via destrying the test context'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });

      destroy(this);
      await renderSettled();

      assertHTML('');
    }

    async '@test destroy of the owner cleans up dom via destrying the test context'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });

      destroy(this.owner);
      await renderSettled();

      assertHTML('');
    }

    async '@test captureRenderTree includes the rendered components'(assert: QUnit['assert']) {
      let HelloWorld = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<HelloWorld/>', { strictMode: true, scope: () => ({ HelloWorld }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });

      if (!ENV._DEBUG_RENDER_TREE) return;

      assert.deepEqual(renderTreeNames(this.owner), ['{ROOT}', 'HelloWorld']);
    }

    async '@test captureRenderTree includes components rendered with any owner'(
      assert: QUnit['assert']
    ) {
      let Owned = setComponentTemplate(precompileTemplate('owned'), templateOnly());
      let Ownerless = setComponentTemplate(precompileTemplate('ownerless'), templateOnly());
      let OwnedRoot = setComponentTemplate(
        precompileTemplate('<Owned/>', { strictMode: true, scope: () => ({ Owned }) }),
        templateOnly()
      );
      let OwnerlessRoot = setComponentTemplate(
        precompileTemplate('<Ownerless/>', { strictMode: true, scope: () => ({ Ownerless }) }),
        templateOnly()
      );

      let ownedElement = document.createElement('div');
      let ownerlessElement = document.createElement('div');
      this.element.append(ownedElement, ownerlessElement);

      let results = [
        renderComponent(OwnedRoot, { owner: this.owner, into: ownedElement }),
        renderComponent(OwnerlessRoot, { into: ownerlessElement }),
      ];

      assertHTML('<div>owned</div><div>ownerless</div>');

      if (ENV._DEBUG_RENDER_TREE) {
        assert.deepEqual(renderTreeNames(this.owner), ['{ROOT}', 'Owned', '{ROOT}', 'Ownerless']);
      }

      for (let result of results) {
        result.destroy();
      }
      await renderSettled();

      if (ENV._DEBUG_RENDER_TREE) {
        assert.deepEqual(renderTreeNames(this.owner), [], 'destroyed renders are gone');
      }

      destroy(this);
      await renderSettled();
    }
  }
);

function renderTreeNames(owner: Owner): string[] {
  let names: string[] = [];
  let collect = (nodes: CapturedRenderNode[]) => {
    for (let node of nodes) {
      names.push(node.name);
      collect(node.children);
    }
  };
  collect(captureRenderTree(owner));
  return names;
}

moduleFor(
  'Strict Mode - renderComponent (direct)',
  class extends AbstractStrictTestCase {
    get element() {
      return document.querySelector('#qunit-fixture')!;
    }

    async '@test manually calling destroy cleans up the DOM'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());

      let owner = buildOwner({});

      let result = renderComponent(Foo, {
        owner,
        into: this.element,
      });
      this.component = {
        ...result,
        rerender() {
          // unused, but asserted against
        },
      };

      assertHTML('Hello, world!');
      await this.assertStableRerender();

      result.destroy();
      await renderSettled();

      assertHTML('');
      await this.assertStableRerender();

      destroy(owner);
      await renderSettled();
    }

    async '@test destroying the owner cleans up the DOM'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());

      let owner = buildOwner({});

      let result = renderComponent(Foo, {
        owner,
        into: this.element,
      });
      this.component = {
        ...result,
        rerender() {
          // unused, but asserted against
        },
      };

      assertHTML('Hello, world!');
      await this.assertStableRerender();

      destroy(owner);
      await renderSettled();

      assertHTML('');
      await this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent',
  class extends RenderComponentTestCase {
    async afterEach() {
      if (this.component) {
        destroy(this);
        await renderSettled();
      }
    }

    async '@test destroy cleans up dom via destroying the owner'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });

      destroy(this.owner);
      await renderSettled();

      assertHTML('');
    }

    async '@test Can use a component in scope'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a custom helper in scope (in append position)'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = setComponentTemplate(
        precompileTemplate('{{foo}}', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a custom modifier in scope'() {
      let foo = defineSimpleModifier((element) => (element.innerHTML = 'Hello, world!'));
      let Root = setComponentTemplate(
        precompileTemplate('<div {{foo}}></div>', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }

    async '@test Can shadow keywords (runtime)'() {
      let each = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = template('{{#each}}{{/each}}', {
        scope: () => ({ each }),
      });

      await this.renderComponent(Bar, { expect: 'Hello, world!' });
    }

    async '@test Can shadow keywords (compile-time)'() {
      let each = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = compileTimeTemplate('{{#each}}{{/each}}', {
        scope: () => ({ each }),
      });

      await this.renderComponent(Bar, { expect: 'Hello, world!' });
    }

    async '@test Can use constant values in ambiguous helper/component position'() {
      let value = 'Hello, world!';

      let Root = setComponentTemplate(
        precompileTemplate('{{value}}', { strictMode: true, scope: () => ({ value }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use inline if and unless in strict mode templates'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{if true "foo" "bar"}}{{unless true "foo" "bar"}}'),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'foobar' });
    }

    async '@test multiple components have independent lifetimes'() {
      class State {
        @tracked showSecond = true;
      }
      let state = new State();
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo />{{#if state.showSecond}}<Foo />{{/if}}', {
          strictMode: true,
          scope: () => ({ state, Foo }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!Hello, world!' });

      await this.assertChange({
        change: () => (state.showSecond = false),
        expect: 'Hello, world!<!---->',
      });
    }

    async '@test Can use a dynamic component definition'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<this.Foo/>'),
        class extends GlimmerComponent {
          Foo = Foo;
        }
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a dynamic component definition (curly)'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('{{this.Foo}}'),
        class extends GlimmerComponent {
          Foo = Foo;
        }
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a dynamic helper definition'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = setComponentTemplate(
        precompileTemplate('{{this.foo}}'),
        class extends GlimmerComponent {
          foo = foo;
        }
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a curried dynamic helper'() {
      let foo = defineSimpleHelper((value) => value);
      let Foo = setComponentTemplate(precompileTemplate('{{@value}}'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo @value={{helper foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use a curried dynamic modifier'() {
      let foo = defineSimpleModifier((element, [text]) => (element.innerHTML = text));
      let Foo = setComponentTemplate(precompileTemplate('<div {{@value}}></div>'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo @value={{modifier foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }

    async '@test when args are trackedObject, the rendered component response appropriately'() {
      let args = trackedObject({ foo: 2 });
      let Root = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      await this.renderComponent(Root, { args, expect: '2' });

      await this.assertChange({
        change: () => args.foo++,
        expect: '3',
      });
    }

    async '@skip when args are a custom tracked class, the rendered component response appropriately'() {
      class Args {
        @tracked foo = 2;
      }
      let args = new Args();
      let Root = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      // @ts-expect-error SAFETY: custom class is not currently supported as args, but would be nice to support?
      await this.renderComponent(Root, { args, expect: '2' });

      await this.assertChange({
        change: () => args.foo++,
        expect: '3',
      });
    }

    async '@test a modifier can call renderComponent'() {
      let render = defineSimpleModifier((element, [comp]) => {
        let result = renderComponent(comp, { into: element });

        return () => result.destroy();
      });

      let Inner = setComponentTemplate(precompileTemplate('hi there'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate(`<div {{render Inner}}></div>`, {
          strictMode: true,
          scope: () => ({ render, Inner }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '<div>hi there</div>' });
    }

    async '@test destroying the result releases its root and renderer'(assert: QUnit['assert']) {
      let render = defineSimpleModifier((element, [comp]) => {
        let result = renderComponent(comp, { into: element });

        return () => result.destroy();
      });

      let Inner = setComponentTemplate(precompileTemplate('hi there'), templateOnly());

      class State {
        @tracked show = true;
      }
      let state = new State();

      let Root = setComponentTemplate(
        precompileTemplate(`{{#if state.show}}<div {{render Inner}}></div>{{/if}}`, {
          strictMode: true,
          scope: () => ({ render, Inner, state }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '<div>hi there</div>' });

      let baseline = renderers.length;

      for (let i = 0; i < 5; i++) {
        state.show = false;
        await renderSettled();
        assertHTML('<!---->');
        state.show = true;
        await renderSettled();
        assertHTML('<div>hi there</div>');
      }

      assert.strictEqual(
        renderers.length,
        baseline,
        'renderers for destroyed renderComponent results are not retained'
      );
    }

    async '@test destroying the result removes its root from a shared renderer'(
      assert: QUnit['assert']
    ) {
      let Inner = setComponentTemplate(precompileTemplate('hi there'), templateOnly());
      let { owner } = this;
      let element = document.createElement('div');

      let first = renderComponent(Inner, { owner, into: element });
      let renderer = renderers[renderers.length - 1]!;

      assert.strictEqual(renderer.state.roots.length, 1);

      for (let i = 0; i < 5; i++) {
        let other = document.createElement('div');
        let result = renderComponent(Inner, { owner, into: other });
        result.destroy();
        await renderSettled();
      }

      assert.strictEqual(renderer.state.roots.length, 1, 'destroyed roots are not retained');

      first.destroy();
      await renderSettled();

      assert.false(renderers.includes(renderer), 'renderer with no roots is deregistered');

      destroy(this);
      await renderSettled();
    }

    async '@test can render in to a detached element'() {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createElement('div');
      let attach: () => void;

      class _Root extends GlimmerComponent {
        @tracked attached: Element | undefined;

        constructor(owner: any, args: any) {
          super(owner, args);

          let result = renderComponent(Inner, { into: element });

          attach = () => void (this.attached = element);

          registerDestructor(this, () => result.destroy());
        }
      }

      let Root = setComponentTemplate(precompileTemplate(`{{this.attached}}`), _Root);

      await this.renderComponent(Root, { expect: '' });

      await this.assertChange({
        change: () => attach(),
        expect: `<div>hello there</div>`,
      });
    }

    /**
     * Test skipped because when an error occurs,
     * we mess up the cache used by renderComponent.
     */
    async '@skip can *not* render in to a TextNode'(assert: Assert) {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createTextNode('');

      class _Root extends GlimmerComponent {
        @tracked attached: Element | undefined;

        constructor(owner: any, args: any) {
          super(owner, args);

          assert.throws(
            () => {
              assert.step('throw');
              // @ts-expect-error deliberately not supported
              renderComponent(Inner, { into: element });
            },
            /Cannot add children to a Text/,
            'throws an error about not being able to add children to TextNodes'
          );
        }
      }

      let Root = setComponentTemplate(precompileTemplate(``), _Root);

      await this.renderComponent(Root, { expect: '<!---->' });
      assert.verifySteps(['throw']);
    }

    async '@test replaces existing contents within the target element'() {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createElement('div');
      element.innerHTML = 'general kenobi';

      let render: () => void;

      class _Root extends GlimmerComponent {
        constructor(owner: any, args: any) {
          super(owner, args);

          render = () => {
            let result = renderComponent(Inner, { into: element });

            registerDestructor(this, () => result.destroy());
          };
        }
      }

      let Root = setComponentTemplate(
        precompileTemplate(`{{element}}`, { strictMode: true, scope: () => ({ element }) }),
        _Root
      );

      await this.renderComponent(Root, { expect: '<div>general kenobi</div>' });

      await this.assertChange({
        change: () => render(),
        expect: `<div>hello there</div>`,
      });
    }

    async [`@test renderComponent is eager, so it tracks with its parent`](assert: Assert) {
      let step = (...x: unknown[]) => assert.step(x.join(':'));

      let Inner = setComponentTemplate(
        precompileTemplate('{{@foo}} <button onclick={{@increment}}>++</button>'),
        templateOnly()
      );

      let element = document.createElement('div');
      class _Root extends GlimmerComponent {
        @tracked foo = 2;
        increment = () => this.foo++;

        @cached
        get sillyExampleToTieInToReactivity() {
          step('render:root');

          let self = this;
          let result = renderComponent(Inner, {
            into: element,
            args: {
              get foo() {
                step('foo', self.foo);
                return self.foo;
              },
              increment: () => void self.increment(),
            },
          });

          registerDestructor(this, () => result.destroy());
          return '';
        }
      }
      let Root = setComponentTemplate(
        precompileTemplate(`{{element}}{{this.sillyExampleToTieInToReactivity}}`, {
          strictMode: true,
          scope: () => ({ element }),
        }),
        _Root
      );

      await this.renderComponent(Root, { expect: '<div>2 <button>++</button></div>' });
      assert.verifySteps(['render:root', 'foo:2']);

      await this.assertChange({
        change: () => {
          this.element.querySelector('button')?.click();
        },
        expect: `<div>3 <button>++</button></div>`,
      });

      /**
       * @see
       * https://github.com/emberjs/rfcs/pull/1099/files#diff-2b962105b9083ca84579cdc957f27f49407440f3c5078083fa369ec18cc46da8R365
       *
       * We could later add an option to not do this behavior
       *
       *
       * NOTE: for this verify-steps, we only expect foo:3 once, because the first
       *       incarnation of renderComponent (back when foo was 2) will not run again, due
       *       to being destroyed.
       */
      assert.verifySteps([`render:root`, `foo:3`]);

      assert.strictEqual(this.element.innerHTML, '<div>3 <button>++</button></div>');

      destroy(this.owner);
      await renderSettled();

      assert.strictEqual(this.element.innerHTML, '');
    }

    async '@test multiple renderComponents share reactivity'() {
      let args = trackedObject({ foo: 2 });

      let InnerOne = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());
      let InnerTwo = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      let element1 = document.createElement('div');
      let element2 = document.createElement('div');

      element1.setAttribute('data-one', '');
      element2.setAttribute('data-two', '');

      class _Root extends GlimmerComponent {
        constructor(owner: any, _args: any) {
          super(owner, _args);

          let result1 = renderComponent(InnerOne, { into: element1, args });
          let result2 = renderComponent(InnerTwo, { into: element2, args });

          registerDestructor(this, () => {
            result1.destroy();
            result2.destroy();
          });
        }
      }

      let Root = setComponentTemplate(
        precompileTemplate(`{{element1}}{{element2}}`, {
          strictMode: true,
          scope: () => ({ element1, element2 }),
        }),
        _Root
      );

      await this.renderComponent(Root, {
        expect: '<div data-one="">2</div><div data-two="">2</div>',
      });

      await this.assertChange({
        change: () => args.foo++,
        expect: '<div data-one="">3</div><div data-two="">3</div>',
      });
    }

    async '@test multiple renderComponents share service injection'() {
      class State extends Service {
        @tracked foo = 2;
      }

      this.owner.register('service:state', State);

      class _One extends GlimmerComponent {
        @service state!: State;
      }
      class _Two extends GlimmerComponent {
        @service state!: State;
      }
      let InnerOne = setComponentTemplate(precompileTemplate('{{this.state.foo}}'), _One);
      let InnerTwo = setComponentTemplate(precompileTemplate('{{this.state.foo}}'), _Two);

      let element1 = document.createElement('div');
      let element2 = document.createElement('div');

      element1.setAttribute('data-one', '');
      element2.setAttribute('data-two', '');

      class _Root extends GlimmerComponent {
        constructor(owner: any, _args: any) {
          super(owner, _args);

          let result1 = renderComponent(InnerOne, { into: element1, owner });
          let result2 = renderComponent(InnerTwo, { into: element2, owner });

          registerDestructor(this, () => {
            result1.destroy();
            result2.destroy();
          });
        }
      }

      let Root = setComponentTemplate(
        precompileTemplate(`{{element1}}{{element2}}`, {
          strictMode: true,
          scope: () => ({ element1, element2 }),
        }),
        _Root
      );

      await this.renderComponent(Root, {
        expect: '<div data-one="">2</div><div data-two="">2</div>',
      });

      let x = this.owner.lookup('service:state') as State;

      await this.assertChange({
        change: () => x.foo++,
        expect: '<div data-one="">3</div><div data-two="">3</div>',
      });
    }

    async '@test rendering multiple times to adjacent elements'() {
      let aHelper = (str: string) => str.toUpperCase();
      let Child = setComponentTemplate(
        precompileTemplate(`Hi: {{aHelper "there"}}`, {
          strictMode: true,
          scope: () => ({ aHelper }),
        }),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerComponent, id: string, owner: Owner) {
        renderComponent(Comp, {
          into: get(`#${id}`)!,
          owner,
        });
      }
      let A = setComponentTemplate(
        precompileTemplate('a:<Child />', { strictMode: true, scope: () => ({ Child }) }),
        templateOnly()
      );
      let B = setComponentTemplate(
        precompileTemplate('b:<Child />', { strictMode: true, scope: () => ({ Child }) }),
        templateOnly()
      );
      let owner = this.owner;
      let Root = setComponentTemplate(
        precompileTemplate(
          `<div id="a"></div><br>\n<div id="b"></div>\n{{render A 'a' owner}}\n{{render B 'b' owner}}`,
          { strictMode: true, scope: () => ({ render, A, B, owner }) }
        ),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: [`<div id="a">a:Hi: THERE</div><br>`, `<div id="b">b:Hi: THERE</div>`, ``, ``].join(
          '\n'
        ),
      });

      destroy(this);
      await renderSettled();

      assertHTML('');
    }

    async '@test multiple calls to render in to the same element appear as siblings'() {
      let aHelper = (str: string) => str.toUpperCase();
      let Child = setComponentTemplate(
        precompileTemplate(`Hi: {{aHelper "there"}}`, {
          strictMode: true,
          scope: () => ({ aHelper }),
        }),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerComponent, id: string, owner: Owner) {
        renderComponent(Comp, {
          into: get(`#${id}`)!,
          owner,
        });
      }
      let A = setComponentTemplate(
        precompileTemplate('a:<Child />', { strictMode: true, scope: () => ({ Child }) }),
        templateOnly()
      );
      let owner = this.owner;
      let Root = setComponentTemplate(
        precompileTemplate(`<div id="a"></div><br>\n{{render A 'a' owner}}\n{{render A 'a'}}`, {
          strictMode: true,
          scope: () => ({ render, A, owner }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: `<div id="a">a:Hi: THEREa:Hi: THERE</div><br>\n\n`,
      });
      destroy(this);
      await renderSettled();

      assertHTML('');
    }

    /**
     * NOTE: subsequent renders to the same element are prepended to the element's children
     */
    async '@test multiple calls to render in to the same element appear as siblings and can be updated'() {
      let aHelper = (str: string) => str.toUpperCase();
      let dataA = trackedObject({ count: 1 });
      let dataB = trackedObject({ count: -1 });
      let Child = setComponentTemplate(
        precompileTemplate(`Hi: {{aHelper "there"}}`, {
          strictMode: true,
          scope: () => ({ aHelper }),
        }),
        templateOnly()
      );

      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerComponent, id: string, owner: Owner) {
        renderComponent(Comp, {
          into: get(`#${id}`)!,
          owner,
        });
      }
      let A = setComponentTemplate(
        precompileTemplate('\n<output>a:<Child />:{{data.count}}</output>\n', {
          strictMode: true,
          scope: () => ({ Child, data: dataA }),
        }),
        templateOnly()
      );
      let B = setComponentTemplate(
        precompileTemplate('\n<output>b:<Child />:{{data.count}}</output>', {
          strictMode: true,
          scope: () => ({ Child, data: dataB }),
        }),
        templateOnly()
      );

      let owner = this.owner;
      let Root = setComponentTemplate(
        precompileTemplate(`<div id="a"></div><br>\n{{render A 'a' owner}}\n{{render B 'a'}}`, {
          strictMode: true,
          scope: () => ({ render, A, B, owner }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: [
          `<div id="a">`,
          `<output>b:Hi: THERE:-1</output>`,
          `<output>a:Hi: THERE:1</output>`,
          `</div><br>`,
          '',
          '',
        ].join('\n'),
      });

      await this.assertChange({
        change: () => dataA.count++,
        expect: [
          `<div id="a">`,
          `<output>b:Hi: THERE:-1</output>`,
          `<output>a:Hi: THERE:2</output>`,
          `</div><br>`,
          '',
          '',
        ].join('\n'),
      });

      /**
       * ERROR in conflict with the NOTE on this test.
       * the elementns flip locations... which is kinda bonkers
       */
      await this.assertChange({
        change: () => dataB.count--,
        expect: [
          `<div id="a">`,
          `<output>b:Hi: THERE:-2</output>`,
          `<output>a:Hi: THERE:2</output>`,
          `</div><br>`,
          '',
          '',
        ].join('\n'),
      });

      destroy(this);
      await renderSettled();

      assertHTML('');
    }

    async '@test async rendering multiple times to adjacent elements'() {
      let Child = setComponentTemplate(precompileTemplate(`Hi`), templateOnly());
      let get = (id: string) => this.element.querySelector(id);
      let promises: Promise<unknown>[] = [];

      function render(Comp: GlimmerComponent, id: string, owner: Owner) {
        let promise = (async () => {
          await Promise.resolve();
          let element = get(`#${id}`);

          renderComponent(Comp, {
            into: element!,
            owner,
          });
        })();

        promises.push(promise);

        return;
      }
      let A = setComponentTemplate(
        precompileTemplate('a:<Child />', { strictMode: true, scope: () => ({ Child }) }),
        templateOnly()
      );
      let B = setComponentTemplate(
        precompileTemplate('b:<Child />', { strictMode: true, scope: () => ({ Child }) }),
        templateOnly()
      );
      let owner = this.owner;
      let Root = setComponentTemplate(
        precompileTemplate(
          `<div id="a"></div><br>\n<div id="b"></div>\n{{render A 'a' owner}}\n{{render B 'b' owner}}`,
          { strictMode: true, scope: () => ({ render, A, B, owner }) }
        ),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: [`<div id="a"></div><br>`, `<div id="b"></div>`, ``, ``].join('\n'),
      });

      await Promise.all(promises);

      assertHTML([`<div id="a">a:Hi</div><br>`, `<div id="b">b:Hi</div>`, ``, ``].join('\n'));

      destroy(this);
      await renderSettled();

      assertHTML('');
    }
  }
);

moduleFor(
  'Strict Mode <-> Loose Mode - renderComponent',
  class extends RenderComponentTestCase {
    async '@test incidentally invoked loose-mode components can still resolve helpers'() {
      this.owner.register('helper:a-helper', (str: string) => str.toUpperCase());
      let Loose = setComponentTemplate(
        precompileTemplate(`Hi: {{a-helper "there"}}`),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Loose />', { strictMode: true, scope: () => ({ Loose }) }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hi: THERE' });

      destroy(this);
      await renderSettled();

      assertHTML('');
    }

    '@test strict-mode components cannot lookup things in the registry'(assert: Assert) {
      this.owner.register('helper:a-helper', (str: string) => str.toUpperCase());
      assert.throws(() => {
        /**
         * We need to pass a scope so that we get a strict-mode component.
         */
        let Root = template('{{a-helper "hi"}}');
        this.renderComponent(Root, { expect: '' });
      }, /but that value was not in scope: a-helper/);
    }

    async '@test rendering multiple times to adjacent elements'() {
      this.owner.register('helper:a-helper', (str: string) => str.toUpperCase());
      let Loose = setComponentTemplate(
        precompileTemplate(`Hi: {{a-helper "there"}}`),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerComponent, id: string, owner: Owner) {
        renderComponent(Comp, {
          into: get(`#${id}`)!,
          owner,
        });
      }
      let A = setComponentTemplate(
        precompileTemplate('a:<Loose />', { strictMode: true, scope: () => ({ Loose }) }),
        templateOnly()
      );
      let B = setComponentTemplate(
        precompileTemplate('b:<Loose />', { strictMode: true, scope: () => ({ Loose }) }),
        templateOnly()
      );
      let owner = this.owner;
      let Root = setComponentTemplate(
        precompileTemplate(
          `<div id="a"></div><br>\n<div id="b"></div>\n{{render A 'a' owner}}\n{{render B 'b' owner}}`,
          { strictMode: true, scope: () => ({ render, A, B, owner }) }
        ),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: [`<div id="a">a:Hi: THERE</div><br>`, `<div id="b">b:Hi: THERE</div>`, ``, ``].join(
          '\n'
        ),
      });

      destroy(this);
      await renderSettled();

      assertHTML('');
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent - built ins',
  class extends RenderComponentTestCase {
    async '@test Can use Input'() {
      let Root = setComponentTemplate(
        precompileTemplate('<Input/>', { strictMode: true, scope: () => ({ Input }) }),
        templateOnly()
      );

      await this.renderComponent(Root, {
        classic: {
          tagName: 'input',
          attrs: {
            type: 'text',
            class: 'ember-text-field ember-view',
          },
        },
      });
    }

    async '@test Can use Textarea'() {
      let Root = setComponentTemplate(
        precompileTemplate('<Textarea/>', { strictMode: true, scope: () => ({ Textarea }) }),
        templateOnly()
      );

      await this.renderComponent(Root, {
        classic: {
          tagName: 'textarea',
          attrs: {
            class: 'ember-text-area ember-view',
          },
        },
      });
    }

    async '@test Can use hash'() {
      let Root = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}',
          { strictMode: true, scope: () => ({ hash }) }
        ),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use array'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}', {
          strictMode: true,
          scope: () => ({ array }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use concat'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{(concat "Hello" ", " "world!")}}', {
          strictMode: true,
          scope: () => ({ concat }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use get'() {
      let Root = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}',
          { strictMode: true, scope: () => ({ hash, get }) }
        ),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    async '@test Can use on and fn'(assert: Assert) {
      let handleClick = (value: unknown) => {
        assert.step('handleClick');
        assert.equal(value, 123);
      };

      let Root = setComponentTemplate(
        precompileTemplate('<button {{on "click" (fn handleClick 123)}}>Click</button>', {
          strictMode: true,
          scope: () => ({ on, fn, handleClick }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '<button>Click</button>' });

      clickElement('button');

      assert.verifySteps(['handleClick']);
    }

    // Ember currently uses AST plugins to implement certain features that
    // glimmer-vm does not natively provide, such as {{#each-in}}, {{outlet}}
    // {{mount}} and some features in {{#in-element}}. These rewrites the AST
    // and insert private keywords e.g. `{{#each (-each-in)}}`. These tests
    // ensures we have _some_ basic coverage for those features in strict mode.
    //
    // Ultimately, our test coverage for strict mode is quite inadequate. This
    // is particularly important as we expect more apps to start adopting the
    // feature. Ideally we would run our entire/most of our test suite against
    // both strict and resolution modes, and these things would be implicitly
    // covered elsewhere, but until then, these coverage are essential.

    async '@test Can use each-in'() {
      let obj = {
        foo: 'FOO',
        bar: 'BAR',
      };

      let Root = setComponentTemplate(
        precompileTemplate('{{#each-in obj as |k v|}}[{{k}}:{{v}}]{{/each-in}}', {
          strictMode: true,
          scope: () => ({ obj }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, { expect: '[foo:FOO][bar:BAR]' });
    }

    async '@test Can use in-element'() {
      let getElement = (id: string) => document.getElementById(id);

      let Foo = setComponentTemplate(
        precompileTemplate(
          '{{#in-element (getElement "in-element-test")}}before{{/in-element}}after',
          { strictMode: true, scope: () => ({ getElement }) }
        ),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('[<div id="in-element-test" />][<Foo/>]', {
          strictMode: true,
          scope: () => ({ Foo }),
        }),
        templateOnly()
      );

      await this.renderComponent(Root, {
        expect: '[<div id="in-element-test">before</div>][<!---->after]',
      });
    }
  }
);
