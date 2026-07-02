import {
  AbstractTestCase,
  buildOwner,
  defineSimpleModifier,
  moduleFor,
  runDestroy,
} from 'internal-test-helpers';

import { template } from '@ember/template-compiler';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { tracked } from '@glimmer/tracking';
import { run } from '@ember/runloop';
import GlimmerishComponent from '../../utils/glimmerish-component';
import { renderComponent, renderToString } from '../../../lib/renderer';
import type Owner from '@ember/owner';

class RenderToStringTestCase extends AbstractTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
  }

  teardown() {
    runDestroy(this.owner);
  }
}

moduleFor(
  'Server-side rendering - renderToString',
  class extends RenderToStringTestCase {
    async ['@test it renders a template-only component to a string']() {
      let Hello = template('<h1>Hello, world!</h1>');

      this.assert.strictEqual(
        await renderToString(Hello, { owner: this.owner }),
        '<h1>Hello, world!</h1>'
      );
    }

    async ['@test it renders args into the string']() {
      let Greeting = template('<p>Hello, {{@name}}!</p>');

      this.assert.strictEqual(
        await renderToString(Greeting, { owner: this.owner, args: { name: 'Zoey' } }),
        '<p>Hello, Zoey!</p>'
      );
    }

    async ['@test it renders `{{{tripleStache}}}` raw HTML']() {
      let Component = template('<div>{{{@html}}}</div>');

      this.assert.strictEqual(
        await renderToString(Component, { owner: this.owner, args: { html: '<b>bold</b>' } }),
        '<div><b>bold</b></div>'
      );
    }

    async ['@test it renders a glimmer component with state']() {
      class State extends GlimmerishComponent {
        get shout() {
          return String((this.args as { message: unknown }).message).toUpperCase();
        }
      }
      let Component = setComponentTemplate(
        precompileTemplate('<span>{{this.shout}}</span>'),
        State
      );

      this.assert.strictEqual(
        await renderToString(Component, { owner: this.owner, args: { message: 'hi' } }),
        '<span>HI</span>'
      );
    }

    async ['@test modifiers run during server rendering']() {
      // Server rendering is a real, interactive render — unlike FastBoot,
      // modifiers are not skipped.
      let ran = false;
      let installed = defineSimpleModifier(() => (ran = true));
      let Component = template('<button {{installed}}>ok</button>', {
        scope: () => ({ installed }),
      });

      let html = await renderToString(Component, { owner: this.owner });

      this.assert.strictEqual(html, '<button>ok</button>');
      this.assert.true(ran, 'the modifier installed during SSR');
    }

    async ['@test modifier-driven DOM effects appear in the output']() {
      let autofocus = defineSimpleModifier((element: Element) =>
        element.setAttribute('data-focused', 'true')
      );
      let Component = template('<input {{autofocus}} />', {
        scope: () => ({ autofocus }),
      });

      this.assert.strictEqual(
        await renderToString(Component, { owner: this.owner }),
        '<input data-focused="true">'
      );
    }

    async ['@test rendering settles before serializing: tracked state updated by a modifier is reflected in the output']() {
      // The FastBoot regression this API must not repeat: state changes made
      // during render (here, by a modifier) must be rendered before the
      // output is declared done.
      class State {
        @tracked message = 'loading';
      }
      let state = new State();
      let load = defineSimpleModifier(() => (state.message = 'loaded'));
      let Component = template('<div {{load}}>{{state.message}}</div>', {
        scope: () => ({ load, state }),
      });

      let html = await renderToString(Component, { owner: this.owner });

      this.assert.strictEqual(html, '<div>loaded</div>');
    }

    async ['@test it can emit rehydration markers']() {
      let Hello = template('<h1>Hello!</h1>');

      let html = await renderToString(Hello, { owner: this.owner, env: { rehydratable: true } });

      this.assert.ok(
        html.includes('<!--%+b:0%-->'),
        `rehydratable output contains open-block markers: ${html}`
      );
      this.assert.ok(html.includes('<h1>Hello!</h1>'), 'the rendered content is still present');
    }

    async ['@test renderComponent can rehydrate server-rendered markup, reusing the DOM']() {
      let Hello = template('<h1>Hello, {{@name}}!</h1>');

      // Server: render to a rehydratable string.
      let html = await renderToString(Hello, {
        owner: this.owner,
        args: { name: 'Zoey' },
        env: { rehydratable: true },
      });
      this.assert.ok(html.includes('<!--%+b:0%-->'), `server output is rehydratable: ${html}`);

      // Ship it to the "browser": the server markup becomes the initial DOM.
      let element = document.querySelector('#qunit-fixture') as HTMLElement;
      element.innerHTML = html;
      let serverNode = element.querySelector('h1');
      this.assert.ok(serverNode, 'server-rendered element is in the DOM before rehydration');

      // Client: rehydrate on top of the server markup.
      let result = renderComponent(Hello, {
        owner: this.owner,
        into: element,
        args: { name: 'Zoey' },
        env: { rehydrate: true },
      });

      this.assert.strictEqual(element.textContent, 'Hello, Zoey!');
      this.assert.strictEqual(
        element.querySelector('h1'),
        serverNode,
        'the server-rendered element was adopted, not replaced'
      );

      run(() => result.destroy());
    }

    async ['@test rehydration works even when the owner has already rendered normally']() {
      // The tree builder is per render call, not per (cached-per-owner)
      // renderer: a prior normal render must not lock the owner out of
      // rehydrating later.
      let Plain = template('<p>plain</p>');
      let Hello = template('<h1>Hello, {{@name}}!</h1>');

      let fixture = document.querySelector('#qunit-fixture') as HTMLElement;
      let plainTarget = fixture.appendChild(document.createElement('div'));

      // First: a normal client render, which caches this owner's renderer.
      let first = renderComponent(Plain, { owner: this.owner, into: plainTarget });
      this.assert.strictEqual(plainTarget.textContent, 'plain');

      // Then: server output rehydrated with the same owner.
      let html = await renderToString(Hello, {
        owner: this.owner,
        args: { name: 'Zoey' },
        env: { rehydratable: true },
      });
      let target = fixture.appendChild(document.createElement('div'));
      target.innerHTML = html;
      let serverNode = target.querySelector('h1');

      let result = renderComponent(Hello, {
        owner: this.owner,
        into: target,
        args: { name: 'Zoey' },
        env: { rehydrate: true },
      });

      this.assert.strictEqual(target.textContent, 'Hello, Zoey!');
      this.assert.strictEqual(
        target.querySelector('h1'),
        serverNode,
        'the server-rendered element was adopted despite a prior normal render with this owner'
      );

      run(() => {
        result.destroy();
        first.destroy();
      });
    }

    async ['@test rehydration adopts nested component markup']() {
      let Inner = template('<span>inner</span>');
      let Outer = template('<div class="outer"><Inner /></div>', {
        scope: () => ({ Inner }),
      });

      let html = await renderToString(Outer, { owner: this.owner, env: { rehydratable: true } });

      let element = document.querySelector('#qunit-fixture') as HTMLElement;
      element.innerHTML = html;
      let serverInner = element.querySelector('span');

      let result = renderComponent(Outer, {
        owner: this.owner,
        into: element,
        env: { rehydrate: true },
      });

      this.assert.strictEqual(element.textContent, 'inner');
      this.assert.strictEqual(
        element.querySelector('span'),
        serverInner,
        'the nested component element was adopted, not replaced'
      );

      run(() => result.destroy());
    }

    async ['@test it does not require an `into` target']() {
      // `renderToString` renders into its own detached element, so unlike
      // `renderComponent` there is no `into` option.
      let Component = setComponentTemplate(precompileTemplate('<em>ok</em>'), templateOnly());

      this.assert.strictEqual(
        await renderToString(Component, { owner: this.owner }),
        '<em>ok</em>'
      );
    }

  }
);
