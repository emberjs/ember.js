import {
  moduleFor,
  RenderingTestCase,
  defineSimpleModifier,
  equalTokens,
  runTask,
} from 'internal-test-helpers';

import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import { template } from '@ember/template-compiler/runtime';
import { tracked } from '@glimmer/tracking';

function attachShadow(mode = 'open') {
  let host = document.createElement('div');
  let shadowRoot = host.attachShadow({ mode });

  return { host, shadowRoot };
}

class State {
  @tracked text = 'Whoop!';
  @tracked show = false;
  @tracked items = [];
  @tracked shadowRoot = null;
}

function strict(source, scope, component) {
  if (component) {
    template(source, { scope: () => scope, component });
    return component;
  }

  return template(source, { scope: () => scope });
}

function lifecycleComponent(hooks) {
  let inserted = defineSimpleModifier(() => hooks.push('inserted'));

  return strict(
    '<p {{inserted}}>{{@text}}</p>',
    { inserted },
    class extends Component {
      willDestroy() {
        super.willDestroy();
        hooks.push('willDestroy');
      }
    }
  );
}

// Captures the root node its element renders into, for closed roots that the
// host does not expose.
function peekComponent(capture) {
  let peek = defineSimpleModifier((element) => capture(element.getRootNode()));

  return strict('<span {{peek}}>{{@text}}</span>', { peek });
}

moduleFor(
  'ShadowDOM: {{in-element}} into a ShadowRoot',
  class extends RenderingTestCase {
    ['@test renders into a ShadowRoot and stays reactive']() {
      let { shadowRoot } = attachShadow();
      let state = new State();

      let Root = strict('{{#in-element shadowRoot}}<p>{{state.text}}</p>{{/in-element}}', {
        shadowRoot,
        state,
      });

      this.renderComponent(Root, { expect: '<!---->' });
      equalTokens(shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.text = 'Huzzah!!'));
      equalTokens(shadowRoot, '<p>Huzzah!!</p>');

      runTask(() => (state.text = 'Whoop!'));
      equalTokens(shadowRoot, '<p>Whoop!</p>');
    }

    ['@test renders into a closed ShadowRoot']() {
      let { host, shadowRoot } = attachShadow('closed');
      let state = new State();
      state.text = 'secret';

      let Root = strict('{{#in-element shadowRoot}}<p>{{state.text}}</p>{{/in-element}}', {
        shadowRoot,
        state,
      });

      this.renderComponent(Root, { expect: '<!---->' });

      this.assert.strictEqual(host.shadowRoot, null, 'a closed shadow root is not exposed');
      equalTokens(shadowRoot, '<p>secret</p>');

      runTask(() => (state.text = 'still secret'));
      equalTokens(shadowRoot, '<p>still secret</p>');
    }

    ['@test replaces existing ShadowRoot content by default']() {
      let { shadowRoot } = attachShadow();
      shadowRoot.innerHTML = '<style>p { color: red }</style><p>old</p>';

      let Root = strict('{{#in-element shadowRoot}}<p>new</p>{{/in-element}}', { shadowRoot });

      this.renderComponent(Root, { expect: '<!---->' });
      equalTokens(shadowRoot, '<p>new</p>');
    }

    ['@test appends to existing ShadowRoot content with insertBefore=null']() {
      let { shadowRoot } = attachShadow();
      shadowRoot.innerHTML = '<style>p { color: red }</style>';
      let state = new State();
      state.text = 'styled';

      let Root = strict(
        '{{#in-element shadowRoot insertBefore=null}}<p>{{state.text}}</p>{{/in-element}}',
        { shadowRoot, state }
      );

      this.renderComponent(Root, { expect: '<!---->' });
      equalTokens(shadowRoot, '<style>p { color: red }</style><p>styled</p>');

      runTask(() => (state.text = 'restyled'));
      equalTokens(shadowRoot, '<style>p { color: red }</style><p>restyled</p>');
    }

    ['@test {{on}} fires for elements inside the ShadowRoot'](assert) {
      let { host, shadowRoot } = attachShadow();
      document.getElementById('qunit-fixture').appendChild(host);

      let clicks = 0;
      let onClick = () => clicks++;

      let Root = strict(
        '{{#in-element shadowRoot}}<button {{on "click" onClick}}>Click</button>{{/in-element}}',
        { shadowRoot, on, onClick }
      );

      this.renderComponent(Root, { expect: '<div></div><!---->' });

      runTask(() => shadowRoot.querySelector('button').click());
      assert.strictEqual(clicks, 1, 'the click handler ran once');

      runTask(() => shadowRoot.querySelector('button').click());
      assert.strictEqual(clicks, 2, 'the click handler ran again');
    }

    ['@test components inside the ShadowRoot are torn down with the block'](assert) {
      let hooks = [];
      let { shadowRoot } = attachShadow();
      let state = new State();
      let Shadowed = lifecycleComponent(hooks);

      let Root = strict(
        '{{#if state.show}}{{#in-element shadowRoot}}<Shadowed @text={{state.text}} />{{/in-element}}{{/if}}',
        { shadowRoot, state, Shadowed }
      );

      this.renderComponent(Root, { expect: '<!---->' });
      equalTokens(shadowRoot, '');
      assert.deepEqual(hooks, []);

      runTask(() => (state.show = true));
      equalTokens(shadowRoot, '<p>Whoop!</p>');
      assert.deepEqual(hooks, ['inserted']);

      runTask(() => (state.text = 'Huzzah!!'));
      equalTokens(shadowRoot, '<p>Huzzah!!</p>');

      runTask(() => (state.show = false));
      equalTokens(shadowRoot, '', 'the shadow root is empty after teardown');
      assert.deepEqual(hooks, ['inserted', 'willDestroy']);
    }

    ['@test yielded content renders inside the ShadowRoot']() {
      let { shadowRoot } = attachShadow();
      let state = new State();
      state.text = 'yielded';

      let ShadowHost = strict(
        '{{#in-element @shadowRoot}}<section>{{yield}}</section>{{/in-element}}',
        {}
      );
      let Root = strict('<ShadowHost @shadowRoot={{shadowRoot}}>{{state.text}}</ShadowHost>', {
        ShadowHost,
        shadowRoot,
        state,
      });

      this.renderComponent(Root, { expect: '<!---->' });
      equalTokens(shadowRoot, '<section>yielded</section>');

      runTask(() => (state.text = 'updated'));
      equalTokens(shadowRoot, '<section>updated</section>');
    }

    ['@test a ShadowRoot attached after the first render']() {
      let state = new State();

      let Root = strict(
        '<div id="host"></div>{{#if state.shadowRoot}}{{#in-element state.shadowRoot}}<p>{{state.text}}</p>{{/in-element}}{{/if}}',
        { state }
      );

      this.renderComponent(Root, { expect: '<div id="host"></div><!---->' });

      runTask(() => {
        state.shadowRoot = this.element.querySelector('#host').attachShadow({ mode: 'open' });
      });

      equalTokens(this.element, '<div id="host"></div><!---->');
      equalTokens(state.shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.text = 'Huzzah!!'));
      equalTokens(state.shadowRoot, '<p>Huzzah!!</p>');
    }
  }
);

moduleFor(
  'ShadowDOM: declarative <template shadowrootmode>',
  class extends RenderingTestCase {
    ['@test renders its content into a ShadowRoot on the parent element']() {
      let state = new State();

      let Root = strict(
        '<div id="host"><template shadowrootmode="open"><p>{{state.text}}</p></template></div>',
        { state }
      );

      this.renderComponent(Root, { expect: '<div id="host"></div>' });

      let host = this.element.querySelector('#host');

      this.assert.ok(host.shadowRoot, 'the host has a shadow root');
      this.assert.strictEqual(host.shadowRoot.mode, 'open');
      equalTokens(host.shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.text = 'Huzzah!!'));
      equalTokens(host.shadowRoot, '<p>Huzzah!!</p>');
    }

    ['@test supports shadowrootmode="closed"']() {
      let shadowRoot;
      let Peek = peekComponent((root) => (shadowRoot = root));

      let Root = strict(
        '<div id="host"><template shadowrootmode="closed"><Peek @text="secret" /></template></div>',
        { Peek }
      );

      this.renderComponent(Root, { expect: '<div id="host"></div>' });

      let host = this.element.querySelector('#host');

      this.assert.strictEqual(host.shadowRoot, null, 'a closed shadow root is not exposed');
      this.assert.ok(
        shadowRoot instanceof window.ShadowRoot,
        'content rendered into a shadow root'
      );
      this.assert.strictEqual(shadowRoot.mode, 'closed');
      this.assert.strictEqual(shadowRoot.host, host);
      this.assert.strictEqual(shadowRoot.textContent, 'secret');
    }

    ['@test light DOM siblings stay in the host']() {
      let Root = strict(
        '<div id="host"><span>light</span><template shadowrootmode="open"><slot></slot><p>shadow</p></template></div>',
        {}
      );

      this.renderComponent(Root, { expect: '<div id="host"><span>light</span></div>' });

      let host = this.element.querySelector('#host');

      equalTokens(host.shadowRoot, '<slot></slot><p>shadow</p>');
    }

    ['@test {{yield}} renders into the ShadowRoot']() {
      let state = new State();
      state.text = 'yielded';

      let Shadowed = strict(
        '<div data-shadow ...attributes><template shadowrootmode="open"><style>:host { display: block }</style>{{yield}}</template></div>',
        {}
      );
      let Root = strict('<Shadowed id="host">{{state.text}}</Shadowed>', { Shadowed, state });

      this.renderComponent(Root, { expect: '<div data-shadow="" id="host"></div>' });

      let host = this.element.querySelector('#host');

      equalTokens(host.shadowRoot, '<style>:host { display: block }</style>yielded');

      runTask(() => (state.text = 'updated'));
      equalTokens(host.shadowRoot, '<style>:host { display: block }</style>updated');
    }

    ['@test conditionals and lists work inside the ShadowRoot']() {
      let state = new State();
      state.items = ['a'];

      let Root = strict(
        '<div id="host"><template shadowrootmode="open">' +
          '{{#if state.show}}<b>shown</b>{{/if}}' +
          '{{#each state.items as |item|}}<i>{{item}}</i>{{/each}}' +
          '</template></div>',
        { state }
      );

      this.renderComponent(Root, { expect: '<div id="host"></div>' });

      let { shadowRoot } = this.element.querySelector('#host');

      equalTokens(shadowRoot, '<!----><i>a</i>');

      runTask(() => (state.show = true));
      equalTokens(shadowRoot, '<b>shown</b><i>a</i>');

      runTask(() => (state.items = ['a', 'b']));
      equalTokens(shadowRoot, '<b>shown</b><i>a</i><i>b</i>');

      runTask(() => (state.show = false));
      equalTokens(shadowRoot, '<!----><i>a</i><i>b</i>');
    }

    ['@test components inside the ShadowRoot are torn down with the host'](assert) {
      let hooks = [];
      let state = new State();
      state.show = true;
      let Shadowed = lifecycleComponent(hooks);

      let Root = strict(
        '{{#if state.show}}<div id="host"><template shadowrootmode="open"><Shadowed @text={{state.text}} /></template></div>{{/if}}',
        { state, Shadowed }
      );

      this.renderComponent(Root, { expect: '<div id="host"></div>' });

      assert.deepEqual(hooks, ['inserted']);
      equalTokens(this.element.querySelector('#host').shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.show = false));
      equalTokens(this.element, '<!---->');
      assert.deepEqual(hooks, ['inserted', 'willDestroy']);

      runTask(() => (state.show = true));
      assert.deepEqual(hooks, ['inserted', 'willDestroy', 'inserted']);
      equalTokens(this.element.querySelector('#host').shadowRoot, '<p>Whoop!</p>');
    }

    ['@test a conditional shadow template on a stable host'](assert) {
      let state = new State();
      state.show = true;

      let Root = strict(
        '<div id="host">{{#if state.show}}<template shadowrootmode="open"><p>{{state.text}}</p></template>{{/if}}</div>',
        { state }
      );

      this.renderComponent(Root, { expect: '<div id="host"><!----></div>' });

      let host = this.element.querySelector('#host');
      let shadowRoot = host.shadowRoot;

      assert.ok(shadowRoot, 'the host has a shadow root');
      equalTokens(shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.show = false));
      equalTokens(shadowRoot, '', 'the shadow root is emptied when the template is removed');

      runTask(() => (state.show = true));
      assert.strictEqual(host.shadowRoot, shadowRoot, 'the same shadow root is reused');
      equalTokens(shadowRoot, '<p>Whoop!</p>');
    }

    ['@test a conditional closed shadow template on a stable host'](assert) {
      let shadowRoot;
      let state = new State();
      state.show = true;
      let Peek = peekComponent((root) => (shadowRoot = root));

      let Root = strict(
        '<div id="host">{{#if state.show}}<template shadowrootmode="closed"><Peek @text={{state.text}} /></template>{{/if}}</div>',
        { state, Peek }
      );

      this.renderComponent(Root, { expect: '<div id="host"><!----></div>' });

      let host = this.element.querySelector('#host');
      let firstRoot = shadowRoot;

      assert.strictEqual(host.shadowRoot, null, 'a closed shadow root is not exposed');
      assert.strictEqual(firstRoot.mode, 'closed');
      assert.strictEqual(firstRoot.textContent, 'Whoop!');

      runTask(() => (state.show = false));
      assert.strictEqual(
        firstRoot.textContent,
        '',
        'the root is emptied when the template is removed'
      );

      runTask(() => (state.show = true));
      assert.strictEqual(shadowRoot, firstRoot, 'the same closed root is reused');
      assert.strictEqual(firstRoot.textContent, 'Whoop!');
    }

    ['@test a wrapperless component root attaches to the parent element'](assert) {
      let state = new State();

      let Bare = strict('<template shadowrootmode="open"><p>{{@text}}</p></template>', {});
      let Root = strict('<div id="host"><span>light</span><Bare @text={{state.text}} /></div>', {
        Bare,
        state,
      });

      this.renderComponent(Root, { expect: '<div id="host"><span>light</span><!----></div>' });

      let host = this.element.querySelector('#host');

      assert.ok(host.shadowRoot, 'the parent element became the host');
      equalTokens(host.shadowRoot, '<p>Whoop!</p>');

      runTask(() => (state.text = 'Huzzah!!'));
      equalTokens(host.shadowRoot, '<p>Huzzah!!</p>');
    }

    ['@test two sibling shadow templates on one parent: the first wins'](assert) {
      let Root = strict(
        '<div id="host">' +
          '<template shadowrootmode="open"><p>first</p></template>' +
          '<template shadowrootmode="open"><p>second</p></template>' +
          '</div>',
        {}
      );

      this.renderComponent(Root, {
        expect: '<div id="host"><template shadowrootmode="open"></template></div>',
      });

      let host = this.element.querySelector('#host');

      assert.ok(host.shadowRoot, 'the parent element became the host');
      assert.strictEqual(host.shadowRoot.innerHTML, '<p>first</p>', 'first wins, like the parser');
    }

    ['@test a rendered host node next to a bare template'](assert) {
      let host = document.createElement('div');
      let shadowRoot = host.attachShadow({ mode: 'closed' });
      let Counter = strict('<p>count</p>', {});

      let Root = strict(
        '<div id="outer">{{host}}' +
          '{{#in-element shadowRoot}}<Counter />{{/in-element}}' +
          '<template shadowrootmode="closed"><Counter /></template>' +
          '</div>',
        { host, shadowRoot, Counter }
      );

      this.renderComponent(Root, { expect: '<div id="outer"><div></div><!----></div>' });

      let outer = this.element.querySelector('#outer');

      assert.strictEqual(shadowRoot.innerHTML, '<p>count</p>', 'the in-element root is filled');
      assert.strictEqual(
        outer.shadowRoot,
        null,
        'the closed root on the outer element is not exposed'
      );
    }

    ['@test swapping between two shadow templates on one host'](assert) {
      let state = new State();
      state.show = true;
      state.text = 'one';

      let Root = strict(
        '<div id="host">' +
          '{{#if state.show}}<template shadowrootmode="open"><p>A {{state.text}}</p></template>' +
          '{{else}}<template shadowrootmode="open"><p>B {{state.text}}</p></template>{{/if}}' +
          '</div>',
        { state }
      );

      this.renderComponent(Root, { expect: '<div id="host"><!----></div>' });

      let host = this.element.querySelector('#host');
      let shadowRoot = host.shadowRoot;

      equalTokens(shadowRoot, '<p>A one</p>');

      runTask(() => (state.show = false));
      assert.strictEqual(host.shadowRoot, shadowRoot, 'the root is reused');
      equalTokens(shadowRoot, '<p>B one</p>');
      equalTokens(host, '<!---->', 'no inert template leaks into the light DOM');

      runTask(() => (state.text = 'two'));
      equalTokens(shadowRoot, '<p>B two</p>');

      runTask(() => (state.show = true));
      equalTokens(shadowRoot, '<p>A two</p>');
    }

    ['@test a plain <template> is still rendered as an element']() {
      let Root = strict('<div id="host"><template><p>inert</p></template></div>', {});

      this.renderComponent(Root, { expect: '<div id="host"><template></template></div>' });

      let host = this.element.querySelector('#host');

      this.assert.strictEqual(host.shadowRoot, null, 'no shadow root is attached');
      this.assert.strictEqual(host.firstChild.tagName, 'TEMPLATE');
    }
  }
);
