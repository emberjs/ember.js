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
  runDestroy,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { precompileTemplate } from '@ember/template-compilation';
import { compile } from 'internal-test-helpers';
import { template } from '@ember/template-compiler/runtime';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { array, concat, fn, get, hash, on } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';

import { run } from '@ember/runloop';
import { destroy, associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { renderComponent, type RenderResult } from '../../../lib/renderer';
import { trackedObject } from '@ember/reactive/collections';
import { cached, tracked } from '@glimmer/tracking';
import Service, { service } from '@ember/service';
import type Owner from '@ember/owner';

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

  assertChange({ change, expect }: { change: () => void; expect: string }) {
    run(() => change());

    assertHTML(expect);

    this.assertStableRerender();
  }

  renderComponent(
    component: object,
    options: { args?: Record<string, unknown>; expect: string } | { classic: ClassicComponentShape }
  ) {
    let { owner } = this;

    run(() => {
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
    });

    if ('expect' in options) {
      assertHTML(options.expect);
    } else {
      assertClassicComponentElement(options.classic);
    }

    this.assertStableRerender();
  }
}

moduleFor(
  'Strict Mode - RenderComponentTestCase',
  class extends RenderComponentTestCase {
    afterEach() {
      if (this.component) {
        runDestroy(this);
      }
    }

    '@test destroy cleans up dom via destrying the test context'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });

      run(() => destroy(this));

      assertHTML('');
    }

    '@test destroy of the owner cleans up dom via destrying the test context'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });

      run(() => destroy(this.owner));

      assertHTML('');
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent (direct)',
  class extends AbstractStrictTestCase {
    get element() {
      return document.querySelector('#qunit-fixture')!;
    }

    '@test manually calling destroy cleans up the DOM'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());

      let owner = buildOwner({});
      let manualDestroy: () => void;

      run(() => {
        let result = renderComponent(Foo, {
          owner,
          into: this.element,
        });
        manualDestroy = result.destroy;
        this.component = {
          ...result,
          rerender() {
            // unused, but asserted against
          },
        };
      });

      assertHTML('Hello, world!');
      this.assertStableRerender();

      run(() => manualDestroy());

      assertHTML('');
      this.assertStableRerender();

      run(() => destroy(owner));
    }

    '@test destroying the owner cleans up the DOM'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());

      let owner = buildOwner({});

      run(() => {
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
      });

      assertHTML('Hello, world!');
      this.assertStableRerender();

      run(() => destroy(owner));

      assertHTML('');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent',
  class extends RenderComponentTestCase {
    afterEach() {
      if (this.component) {
        runDestroy(this);
      }
    }

    '@test destroy cleans up dom via destroying the owner'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });

      run(() => destroy(this.owner));

      assertHTML('');
    }

    '@test Can use a component in scope'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a custom helper in scope (in append position)'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = setComponentTemplate(
        precompileTemplate('{{foo}}', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a custom modifier in scope'() {
      let foo = defineSimpleModifier((element) => (element.innerHTML = 'Hello, world!'));
      let Root = setComponentTemplate(
        precompileTemplate('<div {{foo}}></div>', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }

    '@test Can shadow keywords'() {
      let ifComponent = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = setComponentTemplate(
        compile('{{#if}}{{/if}}', { strictMode: true }, { if: ifComponent }),
        templateOnly()
      );

      this.renderComponent(Bar, { expect: 'Hello, world!' });
    }

    '@test Can use constant values in ambiguous helper/component position'() {
      let value = 'Hello, world!';

      let Root = setComponentTemplate(
        precompileTemplate('{{value}}', { strictMode: true, scope: () => ({ value }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use inline if and unless in strict mode templates'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{if true "foo" "bar"}}{{unless true "foo" "bar"}}'),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'foobar' });
    }

    '@test multiple components have independent lifetimes'() {
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

      this.renderComponent(Root, { expect: 'Hello, world!Hello, world!' });

      this.assertChange({
        change: () => (state.showSecond = false),
        expect: 'Hello, world!<!---->',
      });
    }

    '@test Can use a dynamic component definition'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<this.Foo/>'),
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a dynamic component definition (curly)'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('{{this.Foo}}'),
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a dynamic helper definition'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = setComponentTemplate(
        precompileTemplate('{{this.foo}}'),
        class extends GlimmerishComponent {
          foo = foo;
        }
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a curried dynamic helper'() {
      let foo = defineSimpleHelper((value) => value);
      let Foo = setComponentTemplate(precompileTemplate('{{@value}}'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo @value={{helper foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a curried dynamic modifier'() {
      let foo = defineSimpleModifier((element, [text]) => (element.innerHTML = text));
      let Foo = setComponentTemplate(precompileTemplate('<div {{@value}}></div>'), templateOnly());
      let Root = setComponentTemplate(
        precompileTemplate('<Foo @value={{modifier foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }

    '@test when args are trackedObject, the rendered component response appropriately'() {
      let args = trackedObject({ foo: 2 });
      let Root = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      this.renderComponent(Root, { args, expect: '2' });

      this.assertChange({
        change: () => args.foo++,
        expect: '3',
      });
    }

    '@skip when args are a custom tracked class, the rendered component response appropriately'() {
      class Args {
        @tracked foo = 2;
      }
      let args = new Args();
      let Root = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      // @ts-expect-error SAFETY: custom class is not currently supported as args, but would be nice to support?
      this.renderComponent(Root, { args, expect: '2' });

      this.assertChange({
        change: () => args.foo++,
        expect: '3',
      });
    }

    '@test a modifier can call renderComponent'() {
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

      this.renderComponent(Root, { expect: '<div>hi there</div>' });
    }

    '@test can render in to a detached element'() {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createElement('div');
      let attach: () => void;

      class _Root extends GlimmerishComponent {
        @tracked attached: Element | undefined;

        constructor(owner: any, args: any) {
          super(owner, args);

          let result = renderComponent(Inner, { into: element });

          attach = () => void (this.attached = element);

          registerDestructor(this, () => result.destroy());
        }
      }

      let Root = setComponentTemplate(precompileTemplate(`{{this.attached}}`), _Root);

      this.renderComponent(Root, { expect: '' });

      this.assertChange({
        change: () => attach(),
        expect: `<div>hello there</div>`,
      });
    }

    /**
     * Test skipped because when an error occurs,
     * we mess up the cache used by renderComponent.
     */
    '@skip can *not* render in to a TextNode'(assert: Assert) {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createTextNode('');

      class _Root extends GlimmerishComponent {
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

      this.renderComponent(Root, { expect: '<!---->' });
      assert.verifySteps(['throw']);
    }

    '@test replaces existing contents within the target element'() {
      let Inner = setComponentTemplate(precompileTemplate('hello there'), templateOnly());
      let element = document.createElement('div');
      element.innerHTML = 'general kenobi';

      let render: () => void;

      class _Root extends GlimmerishComponent {
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

      this.renderComponent(Root, { expect: '<div>general kenobi</div>' });

      this.assertChange({
        change: () => render(),
        expect: `<div>hello there</div>`,
      });
    }

    [`@test renderComponent is eager, so it tracks with its parent`](assert: Assert) {
      let step = (...x: unknown[]) => assert.step(x.join(':'));

      let Inner = setComponentTemplate(
        precompileTemplate('{{@foo}} <button onclick={{@increment}}>++</button>'),
        templateOnly()
      );

      let element = document.createElement('div');
      class _Root extends GlimmerishComponent {
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

      this.renderComponent(Root, { expect: '<div>2 <button>++</button></div>' });
      assert.verifySteps(['render:root', 'foo:2']);

      this.assertChange({
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

      run(() => {
        destroy(this.owner);
      });

      assert.strictEqual(this.element.innerHTML, '');
    }

    '@test multiple renderComponents share reactivity'() {
      let args = trackedObject({ foo: 2 });

      let InnerOne = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());
      let InnerTwo = setComponentTemplate(precompileTemplate('{{@foo}}'), templateOnly());

      let element1 = document.createElement('div');
      let element2 = document.createElement('div');

      element1.setAttribute('data-one', '');
      element2.setAttribute('data-two', '');

      class _Root extends GlimmerishComponent {
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

      this.renderComponent(Root, { expect: '<div data-one="">2</div><div data-two="">2</div>' });

      this.assertChange({
        change: () => args.foo++,
        expect: '<div data-one="">3</div><div data-two="">3</div>',
      });
    }

    '@test multiple renderComponents share service injection'() {
      class State extends Service {
        @tracked foo = 2;
      }

      this.owner.register('service:state', State);

      class _One extends GlimmerishComponent {
        @service state!: State;
      }
      class _Two extends GlimmerishComponent {
        @service state!: State;
      }
      let InnerOne = setComponentTemplate(precompileTemplate('{{this.state.foo}}'), _One);
      let InnerTwo = setComponentTemplate(precompileTemplate('{{this.state.foo}}'), _Two);

      let element1 = document.createElement('div');
      let element2 = document.createElement('div');

      element1.setAttribute('data-one', '');
      element2.setAttribute('data-two', '');

      class _Root extends GlimmerishComponent {
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

      this.renderComponent(Root, { expect: '<div data-one="">2</div><div data-two="">2</div>' });

      let x = this.owner.lookup('service:state') as State;

      this.assertChange({
        change: () => x.foo++,
        expect: '<div data-one="">3</div><div data-two="">3</div>',
      });
    }

    '@test rendering multiple times to adjacent elements'() {
      let aHelper = (str: string) => str.toUpperCase();
      let Child = setComponentTemplate(
        precompileTemplate(`Hi: {{aHelper "there"}}`, {
          strictMode: true,
          scope: () => ({ aHelper }),
        }),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerishComponent, id: string, owner: Owner) {
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

      this.renderComponent(Root, {
        expect: [`<div id="a">a:Hi: THERE</div><br>`, `<div id="b">b:Hi: THERE</div>`, ``, ``].join(
          '\n'
        ),
      });

      run(() => destroy(this));

      assertHTML('');
    }

    '@test multiple calls to render in to the same element appear as siblings'() {
      let aHelper = (str: string) => str.toUpperCase();
      let Child = setComponentTemplate(
        precompileTemplate(`Hi: {{aHelper "there"}}`, {
          strictMode: true,
          scope: () => ({ aHelper }),
        }),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerishComponent, id: string, owner: Owner) {
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

      this.renderComponent(Root, {
        expect: `<div id="a">a:Hi: THEREa:Hi: THERE</div><br>\n\n`,
      });
      run(() => destroy(this));

      assertHTML('');
    }

    /**
     * NOTE: subsequent renders to the same element are prepended to the element's children
     */
    '@test multiple calls to render in to the same element appear as siblings and can be updated'() {
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
      function render(Comp: GlimmerishComponent, id: string, owner: Owner) {
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

      this.renderComponent(Root, {
        expect: [
          `<div id="a">`,
          `<output>b:Hi: THERE:-1</output>`,
          `<output>a:Hi: THERE:1</output>`,
          `</div><br>`,
          '',
          '',
        ].join('\n'),
      });

      this.assertChange({
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
      this.assertChange({
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

      run(() => destroy(this));

      assertHTML('');
    }

    async '@test async rendering multiple times to adjacent elements'() {
      let Child = setComponentTemplate(precompileTemplate(`Hi`), templateOnly());
      let get = (id: string) => this.element.querySelector(id);
      let promises: Promise<unknown>[] = [];

      function render(Comp: GlimmerishComponent, id: string, owner: Owner) {
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

      this.renderComponent(Root, {
        expect: [`<div id="a"></div><br>`, `<div id="b"></div>`, ``, ``].join('\n'),
      });

      await Promise.all(promises);

      assertHTML([`<div id="a">a:Hi</div><br>`, `<div id="b">b:Hi</div>`, ``, ``].join('\n'));

      run(() => destroy(this));

      assertHTML('');
    }
  }
);

moduleFor(
  'Strict Mode <-> Loose Mode - renderComponent',
  class extends RenderComponentTestCase {
    '@test incidentally invoked loose-mode components can still resolve helpers'() {
      this.owner.register('helper:a-helper', (str: string) => str.toUpperCase());
      let Loose = setComponentTemplate(
        precompileTemplate(`Hi: {{a-helper "there"}}`),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Loose />', { strictMode: true, scope: () => ({ Loose }) }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hi: THERE' });

      run(() => destroy(this));

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

    '@test rendering multiple times to adjacent elements'() {
      this.owner.register('helper:a-helper', (str: string) => str.toUpperCase());
      let Loose = setComponentTemplate(
        precompileTemplate(`Hi: {{a-helper "there"}}`),
        templateOnly()
      );
      let get = (id: string) => this.element.querySelector(id);
      function render(Comp: GlimmerishComponent, id: string, owner: Owner) {
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

      this.renderComponent(Root, {
        expect: [`<div id="a">a:Hi: THERE</div><br>`, `<div id="b">b:Hi: THERE</div>`, ``, ``].join(
          '\n'
        ),
      });

      run(() => destroy(this));

      assertHTML('');
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent - built ins',
  class extends RenderComponentTestCase {
    '@test Can use Input'() {
      let Root = setComponentTemplate(
        precompileTemplate('<Input/>', { strictMode: true, scope: () => ({ Input }) }),
        templateOnly()
      );

      this.renderComponent(Root, {
        classic: {
          tagName: 'input',
          attrs: {
            type: 'text',
            class: 'ember-text-field ember-view',
          },
        },
      });
    }

    '@test Can use Textarea'() {
      let Root = setComponentTemplate(
        precompileTemplate('<Textarea/>', { strictMode: true, scope: () => ({ Textarea }) }),
        templateOnly()
      );

      this.renderComponent(Root, {
        classic: {
          tagName: 'textarea',
          attrs: {
            class: 'ember-text-area ember-view',
          },
        },
      });
    }

    '@test Can use hash'() {
      let Root = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}',
          { strictMode: true, scope: () => ({ hash }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use array'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}', {
          strictMode: true,
          scope: () => ({ array }),
        }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use concat'() {
      let Root = setComponentTemplate(
        precompileTemplate('{{(concat "Hello" ", " "world!")}}', {
          strictMode: true,
          scope: () => ({ concat }),
        }),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use get'() {
      let Root = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}',
          { strictMode: true, scope: () => ({ hash, get }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use on and fn'(assert: Assert) {
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

      this.renderComponent(Root, { expect: '<button>Click</button>' });

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

    '@test Can use each-in'() {
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

      this.renderComponent(Root, { expect: '[foo:FOO][bar:BAR]' });
    }

    '@test Can use in-element'() {
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

      this.renderComponent(Root, {
        expect: '[<div id="in-element-test">before</div>][<!---->after]',
      });
    }
  }
);
