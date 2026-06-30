import { AbstractTestCase, buildOwner, moduleFor, runDestroy } from 'internal-test-helpers';

import { template } from '@ember/template-compiler';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { on } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';
import { renderToString } from '../../../lib/renderer';
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

    ['@test it does not require a real DOM element to render into']() {
      // `renderToString` builds its own in-memory document, so it works even
      // when nothing is passed for `into` (unlike `renderComponent`).
      let Component = setComponentTemplate(precompileTemplate('<em>ok</em>'), templateOnly());

      this.assert.strictEqual(renderToString(Component, { owner: this.owner }), '<em>ok</em>');
    }
  }
);
