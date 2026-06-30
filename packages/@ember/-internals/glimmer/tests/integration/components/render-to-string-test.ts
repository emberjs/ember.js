import { AbstractTestCase, buildOwner, moduleFor, runDestroy } from 'internal-test-helpers';

import { template } from '@ember/template-compiler';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { on } from '@glimmer/runtime';
import { run } from '@ember/runloop';
import createHTMLDocument from '@simple-dom/document';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';
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
    ['@test it renders a template-only component to a string']() {
      let Hello = template('<h1>Hello, world!</h1>');

      this.assert.strictEqual(
        renderToString(Hello, { owner: this.owner }),
        '<h1>Hello, world!</h1>'
      );
    }

    ['@test it renders args into the string']() {
      let Greeting = template('<p>Hello, {{@name}}!</p>');

      this.assert.strictEqual(
        renderToString(Greeting, { owner: this.owner, args: { name: 'Zoey' } }),
        '<p>Hello, Zoey!</p>'
      );
    }

    ['@test it renders `{{{tripleStache}}}` raw HTML without a live DOM']() {
      let Component = template('<div>{{{@html}}}</div>');

      this.assert.strictEqual(
        renderToString(Component, { owner: this.owner, args: { html: '<b>bold</b>' } }),
        '<div><b>bold</b></div>'
      );
    }

    ['@test it renders a glimmer component with state']() {
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
        renderToString(Component, { owner: this.owner, args: { message: 'hi' } }),
        '<span>HI</span>'
      );
    }

    ['@test by default it is non-interactive, so modifiers do not run']() {
      let ran = false;
      let noop = () => (ran = true);
      let Component = template('<button {{on "click" noop}}>ok</button>', {
        scope: () => ({ on, noop }),
      });

      let html = renderToString(Component, { owner: this.owner });

      this.assert.strictEqual(html, '<button>ok</button>');
      this.assert.false(ran, 'the modifier did not install during non-interactive SSR');
    }

    ['@test it can emit rehydration markers']() {
      let Hello = template('<h1>Hello!</h1>');

      let html = renderToString(Hello, { owner: this.owner, env: { rehydratable: true } });

      this.assert.ok(
        html.includes('<!--%+b:0%-->'),
        `rehydratable output contains open-block markers: ${html}`
      );
      this.assert.ok(html.includes('<h1>Hello!</h1>'), 'the rendered content is still present');
    }

    ['@test renderComponent can rehydrate server-rendered markup, reusing the DOM']() {
      let Hello = template('<h1>Hello, {{@name}}!</h1>');

      // Server: render to a rehydratable string.
      let html = renderToString(Hello, {
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

    ['@test rehydration adopts nested component markup']() {
      let Inner = template('<span>inner</span>');
      let Outer = template('<div class="outer"><Inner /></div>', {
        scope: () => ({ Inner }),
      });

      let html = renderToString(Outer, { owner: this.owner, env: { rehydratable: true } });

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

    ['@test it does not require a real DOM element to render into']() {
      // `renderToString` builds its own in-memory document, so it works even
      // when nothing is passed for `into` (unlike `renderComponent`).
      let Component = setComponentTemplate(precompileTemplate('<em>ok</em>'), templateOnly());

      this.assert.strictEqual(renderToString(Component, { owner: this.owner }), '<em>ok</em>');
    }

    ['@test renderComponent itself can render into a SimpleDOM element']() {
      // The underlying capability: handing `renderComponent` a SimpleDOM
      // document + element uses SimpleDOM-aware tree construction, so the
      // whole `renderComponent` pipeline works server-side.
      let document = createHTMLDocument();
      let element = document.createElement('div');
      let Hello = template('<h2>{{@greeting}} {{{@html}}}</h2>');

      let result = renderComponent(Hello, {
        owner: this.owner,
        into: element,
        args: { greeting: 'hi', html: '<i>there</i>' },
        env: { document, hasDOM: false, isInteractive: false },
      });

      this.assert.strictEqual(
        new Serializer(voidMap).serializeChildren(element),
        '<h2>hi <i>there</i></h2>'
      );

      run(() => result.destroy());
    }
  }
);
