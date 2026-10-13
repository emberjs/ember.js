import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';

// `<template>` components from a .gjs module, registered in the owner and
// invoked BY NAME from a loose (runtime-compiled) template, as an app's
// route templates invoke its components.

const ForwardedLink = <template>
  <a data-test-link ...attributes class="own">{{@label}}</a>
</template>;

const ForwardedButton = <template>
  <button type="button" data-test-button ...attributes>{{@label}}</button>
</template>;

moduleFor(
  'Components test: a <template> component invoked by name',
  class extends RenderingTestCase {
    '@test it receives static and bound attributes through ...attributes, also on update'() {
      this.owner.register('component:forwarded-link', ForwardedLink);

      this.render(
        '<ForwardedLink @label={{this.label}} title="static" class="extra" href={{this.url}} data-count={{this.count}} />',
        { label: 'home', url: '/a', count: 1 }
      );

      let link = () => this.element.querySelector('a[data-test-link]');
      let attrs = () => ({
        title: link().getAttribute('title'),
        class: link().getAttribute('class'),
        href: link().getAttribute('href'),
        count: link().getAttribute('data-count'),
        text: link().textContent,
      });

      this.assert.deepEqual(attrs(), {
        title: 'static',
        class: 'extra own',
        href: '/a',
        count: '1',
        text: 'home',
      });

      this.assertStableRerender();

      runTask(() => {
        set(this.context, 'url', '/b');
        set(this.context, 'count', 2);
        set(this.context, 'label', 'away');
      });
      this.assert.deepEqual(attrs(), {
        title: 'static',
        class: 'extra own',
        href: '/b',
        count: '2',
        text: 'away',
      });

      runTask(() => set(this.context, 'url', 'javascript:alert(1)'));
      this.assert.strictEqual(
        link().getAttribute('href'),
        'unsafe:javascript:alert(1)',
        'a bound URL attribute is sanitized'
      );
    }

    '@test a curly invocation, which forwards no attributes, renders it'(assert) {
      this.owner.register('component:forwarded-link', ForwardedLink);

      this.render('{{forwarded-link label=this.label}}', { label: 'curly' });

      let link = this.element.querySelector('a[data-test-link]');
      assert.strictEqual(link?.textContent, 'curly');
      assert.strictEqual(link.getAttribute('class'), 'own');
    }

    '@test it receives a modifier through ...attributes'(assert) {
      this.owner.register('component:forwarded-control', ForwardedButton);
      let clicks = 0;

      this.render('<ForwardedControl @label="go" {{on "click" this.go}} />', {
        go: () => clicks++,
      });

      let button = this.element.querySelector('button[data-test-button]');
      assert.strictEqual(button?.textContent, 'go');
      runTask(() => button.click());
      assert.strictEqual(clicks, 1, 'the forwarded {{on}} modifier is installed');
    }

    '@test components invoked with the same argument names each render their own template'(
      assert
    ) {
      this.owner.register('component:link-a', ForwardedLink);
      this.owner.register('component:control-b', ForwardedButton);

      this.render('{{#if this.showA}}<LinkA @label="a" />{{/if}}<ControlB @label="b" />', {
        showA: true,
      });

      let rendered = () =>
        [...this.element.querySelectorAll('a, button')].map(
          (element) => `${element.localName}:${element.textContent}`
        );
      assert.deepEqual(rendered(), ['a:a', 'button:b']);

      runTask(() => set(this.context, 'showA', false));
      assert.deepEqual(rendered(), ['button:b']);

      runTask(() => set(this.context, 'showA', true));
      assert.deepEqual(rendered(), ['a:a', 'button:b']);
    }

    '@test each owner renders the component it registered under the name'(assert) {
      // The modifier test registers another component under this name and
      // invokes it the same way.
      this.owner.register('component:forwarded-control', ForwardedLink);
      let clicks = 0;

      this.render('<ForwardedControl @label="go" {{on "click" this.go}} />', {
        go: (event) => {
          event.preventDefault();
          clicks++;
        },
      });

      assert.strictEqual(this.element.querySelector('button'), null);
      let link = this.element.querySelector('a[data-test-link]');
      assert.strictEqual(link?.textContent, 'go');
      runTask(() => link.click());
      assert.strictEqual(clicks, 1);
    }
  }
);
