import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';

// `<template>` components from a .gjs module, registered in the owner and
// invoked BY NAME from a loose (runtime-compiled) template, as an app's
// route templates invoke its components.

const ForwardedLink = <template>
  <a data-test-link ...attributes class="own">{{@label}}</a>
</template>;

const TitledLink = <template>
  <a data-test-link ...attributes>[{{@title}}]</a>
</template>;

const Yielder = <template>
  <p data-test-yielder ...attributes>{{yield "p"}}</p>
</template>;

const Sections = <template>
  <header>{{yield "h" to="header"}}</header>
  <main>{{yield to="body"}}</main>
  {{#if (has-block "footer")}}<footer>footer</footer>{{/if}}
</template>;

const BlockInfo = <template>
  [{{if (has-block) "block" "no block"}}][{{if
      (has-block-params)
      "params"
      "no params"
    }}]{{yield "y"}}
</template>;

const ForwardedButton = <template>
  <button type="button" data-test-button ...attributes>{{@label}}</button>
</template>;

const LoneClass = <template>
  <p data-test-lone class={{@cls}}>x</p>
</template>;

const MergedClass = <template>
  <p data-test-merged ...attributes class={{@cls}}>x</p>
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

    '@test an attribute is not an argument'(assert) {
      this.owner.register('component:titled-link', TitledLink);

      this.render('<TitledLink title={{this.title}} />', { title: 'attribute' });

      let link = this.element.querySelector('a[data-test-link]');
      assert.strictEqual(link?.getAttribute('title'), 'attribute');
      assert.strictEqual(link.textContent, '[]', 'the title attribute does not set @title');

      runTask(() => set(this.context, 'title', 'changed'));
      assert.strictEqual(link.getAttribute('title'), 'changed');
      assert.strictEqual(link.textContent, '[]');
    }

    '@test it renders its block with the block params, kept current'(assert) {
      this.owner.register('component:x-block', Yielder);

      this.render('<XBlock title="t" as |v|>body-{{v}}-{{this.suffix}}</XBlock>', {
        suffix: 'a',
      });

      let p = () => this.element.querySelector('p[data-test-yielder]');
      assert.strictEqual(p()?.getAttribute('title'), 't');
      assert.strictEqual(p().textContent, 'body-p-a');

      runTask(() => set(this.context, 'suffix', 'b'));
      assert.strictEqual(p().textContent, 'body-p-b');
    }

    '@test its block is torn down and rendered again with it'(assert) {
      this.owner.register('component:x-block', Yielder);

      this.render('{{#if this.show}}<XBlock as |v|>body-{{v}}</XBlock>{{/if}}<span>end</span>', {
        show: true,
      });

      let blocks = () => [...this.element.querySelectorAll('p')].map((p) => p.textContent);
      assert.deepEqual(blocks(), ['body-p']);

      runTask(() => set(this.context, 'show', false));
      assert.deepEqual(blocks(), []);
      assert.strictEqual(this.element.textContent.trim(), 'end');

      runTask(() => set(this.context, 'show', true));
      assert.deepEqual(blocks(), ['body-p']);
    }

    '@test a curly block invocation renders its block'(assert) {
      this.owner.register('component:x-block', Yielder);

      this.render('{{#x-block as |v|}}curly-{{v}}{{/x-block}}');

      assert.strictEqual(this.element.querySelector('p[data-test-yielder]')?.textContent, 'curly-p');
    }

    '@test it renders named blocks'(assert) {
      this.owner.register('component:x-sections', Sections);

      this.render(
        '<XSections><:header>H</:header><:body>B-{{this.body}}</:body></XSections>',
        { body: 'one' }
      );

      let text = (selector) => this.element.querySelector(selector)?.textContent;
      assert.strictEqual(text('header'), 'H');
      assert.strictEqual(text('main'), 'B-one');
      assert.strictEqual(this.element.querySelector('footer'), null);

      runTask(() => set(this.context, 'body', 'two'));
      assert.strictEqual(text('main'), 'B-two');
    }

    '@test has-block and has-block-params see the invocation block'(assert) {
      this.owner.register('component:x-info', BlockInfo);

      this.render(
        '<div id="none"><XInfo /></div><div id="block"><XInfo>b</XInfo></div><div id="params"><XInfo as |y|>p-{{y}}</XInfo></div>'
      );

      let text = (id) => this.element.querySelector(`#${id}`).textContent.trim();
      assert.strictEqual(text('none'), '[no block][no params]');
      assert.strictEqual(text('block'), '[block][no params]b');
      assert.strictEqual(text('params'), '[block][params]p-y');
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

    // Glimmer's class rules on a build-time template's element: a lone class
    // is removed when false, null or undefined; merged classes skip their
    // empty parts and are removed when none is left.
    '@test a class bound on its element is removed when false or null'(assert) {
      this.owner.register('component:lone-class', LoneClass);

      this.render('<LoneClass @cls={{this.cls}} />', { cls: false });
      let cls = () => this.element.querySelector('p[data-test-lone]').getAttribute('class');
      assert.strictEqual(cls(), null);

      runTask(() => set(this.context, 'cls', 'a'));
      assert.strictEqual(cls(), 'a');

      runTask(() => set(this.context, 'cls', null));
      assert.strictEqual(cls(), null);

      runTask(() => set(this.context, 'cls', true));
      assert.strictEqual(cls(), '');
    }

    '@test its element merges its class with a forwarded one'(assert) {
      this.owner.register('component:merged-class', MergedClass);

      this.render('<MergedClass @cls={{this.cls}} class={{this.outer}} />', {
        cls: null,
        outer: null,
      });
      let cls = () => this.element.querySelector('p[data-test-merged]').getAttribute('class');
      assert.strictEqual(cls(), null);

      runTask(() => set(this.context, 'outer', 'b'));
      assert.strictEqual(cls(), 'b');

      runTask(() => set(this.context, 'cls', 'a'));
      assert.strictEqual(cls(), 'b a');

      runTask(() => set(this.context, 'outer', undefined));
      assert.strictEqual(cls(), 'a');
    }
  }
);
