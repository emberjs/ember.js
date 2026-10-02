import { castToBrowser } from '@glimmer/debug-util';

import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { defineComponent, defineSimpleModifier } from '../test-helpers/define';
import { tracked } from '../test-helpers/tracked';

function attachShadow(mode: ShadowRootMode = 'open'): {
  host: HTMLElement;
  shadowRoot: ShadowRoot;
} {
  const host = document.createElement('div');
  const shadowRoot = host.attachShadow({ mode });

  return { host, shadowRoot };
}

function shadowHTML(shadowRoot: ShadowRoot): string {
  return shadowRoot.innerHTML;
}

class State {
  @tracked foo = 'Yippie!';
  @tracked show = false;
  @tracked items: string[] = [];
  @tracked html = '';
  @tracked target: ShadowRoot | Element | null = null;
}

export class InElementShadowRootSuite extends RenderTest {
  static suiteName = '#in-element (ShadowRoot)';

  @test
  'Renders curlies into a ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    state.foo = 'Double Yups!';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '[Double Yups!]');
    this.assertStableNodes();

    state.foo = 'Yippie!';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');
    this.assertStableNodes();
  }

  @test
  'Renders into a closed ShadowRoot'() {
    const { host, shadowRoot } = attachShadow('closed');
    const state = new State();
    state.foo = 'hidden';

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}<p>{{state.foo}}</p>{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(host.shadowRoot, null, 'a closed shadow root is not exposed');
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>hidden</p>');
    this.assertHTML('<!---->');

    state.foo = 'still hidden';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>still hidden</p>');
  }

  @test
  'clears existing content by default'() {
    const { shadowRoot } = attachShadow();
    shadowRoot.innerHTML = '<p>Hello there!</p>';
    const state = new State();

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');
    this.assertStableRerender();

    state.foo = 'Double Yups!';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '[Double Yups!]');
  }

  @test
  'appends to existing content with insertBefore=null'() {
    const { shadowRoot } = attachShadow();
    shadowRoot.innerHTML = '<p>Hello there!</p>';
    const state = new State();

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot insertBefore=null}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>Hello there!</p>[Yippie!]');
    this.assertStableRerender();

    state.foo = 'Double Yups!';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>Hello there!</p>[Double Yups!]');
  }

  @test
  'inserts before a node in the ShadowRoot with insertBefore'() {
    const { shadowRoot } = attachShadow();
    shadowRoot.innerHTML = '<p>before</p><p>after</p>';
    const after = shadowRoot.lastChild;
    const state = new State();
    state.foo = 'middle';

    const Root = defineComponent(
      { shadowRoot, after, state },
      '{{#in-element shadowRoot insertBefore=after}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>before</p>[middle]<p>after</p>');
    this.assertStableRerender();

    state.foo = 'centre';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>before</p>[centre]<p>after</p>');
  }

  @test
  'the host keeps its light DOM'() {
    const { host, shadowRoot } = attachShadow();
    host.innerHTML = '<span>light</span>';

    const Root = defineComponent(
      { shadowRoot },
      '{{#in-element shadowRoot}}<p>shadow</p>{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(host.innerHTML, '<span>light</span>', 'light DOM is untouched');
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>shadow</p>');
  }

  @test
  'conditionals toggle inside the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}<p>stable</p>{{#if state.show}}<span>cond</span>{{/if}}{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>stable</p><!---->');
    this.assertStableRerender();

    state.show = true;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>stable</p><span>cond</span>');

    state.show = false;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>stable</p><!---->');
  }

  @test
  'lists update inside the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.items = ['a', 'b'];

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}{{#each state.items key="@identity" as |item|}}<span>{{item}}</span>{{/each}}{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<span>a</span><span>b</span>');
    this.assertStableRerender();

    state.items = ['a', 'b', 'c'];
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<span>a</span><span>b</span><span>c</span>');

    state.items = ['c', 'b', 'a'];
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<span>c</span><span>b</span><span>a</span>');

    state.items = ['b'];
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<span>b</span>');

    state.items = [];
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<!---->');
  }

  @test
  'trusted HTML renders inside the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.html = '<b>bold</b> and <i>italic</i>';

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#in-element shadowRoot}}{{{state.html}}}{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<b>bold</b> and <i>italic</i>');
    this.assertStableRerender();

    state.html = '<u>underline</u>';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<u>underline</u>');

    state.html = '';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<!---->');
  }

  @test
  'trusted HTML renders before existing content in the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    shadowRoot.innerHTML = '<p>after</p>';
    const after = shadowRoot.firstChild;
    const state = new State();
    state.html = '<b>bold</b>';

    const Root = defineComponent(
      { shadowRoot, after, state },
      '{{#in-element shadowRoot insertBefore=after}}{{{state.html}}}{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<b>bold</b><p>after</p>');
    this.assertStableRerender();

    state.html = '<i>italic</i>';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<i>italic</i><p>after</p>');
  }

  @test
  'modifiers receive elements rendered in the ShadowRoot'(assert: typeof QUnit.assert) {
    const { shadowRoot } = attachShadow();
    let installedOn: Element | undefined;

    const capture = defineSimpleModifier((element: Element) => {
      installedOn = element;
    });

    const Root = defineComponent(
      { shadowRoot, capture },
      '{{#in-element shadowRoot}}<p {{capture}}>hi</p>{{/in-element}}'
    );

    this.renderComponent(Root);

    assert.ok(installedOn, 'the modifier was installed');
    assert.strictEqual(
      castToBrowser(installedOn!, 'HTML').getRootNode(),
      shadowRoot,
      'the element lives in the shadow root'
    );
  }

  @test
  'components render inside the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.foo = 'World';

    const Greeting = defineComponent({}, '<p>Hello, {{@name}}!</p>');
    const Root = defineComponent(
      { shadowRoot, state, Greeting },
      '{{#in-element shadowRoot}}<Greeting @name={{state.foo}} />{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>Hello, World!</p>');
    this.assertStableRerender();

    state.foo = 'Shadow';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>Hello, Shadow!</p>');
  }

  @test
  'Destroying {{#in-element}} clears the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.show = true;

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#if state.show}}{{#in-element shadowRoot}}<p>hello</p>{{/in-element}}{{/if}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>hello</p>');
    this.assertHTML('<!---->');

    state.show = false;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '', 'the shadow root is empty after destroy');
    this.assertHTML('<!---->');

    state.show = true;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>hello</p>');
  }

  @test
  'Destroying {{#in-element}} with insertBefore=null leaves other content alone'() {
    const { shadowRoot } = attachShadow();
    shadowRoot.innerHTML = '<p>kept</p>';
    const state = new State();
    state.show = true;

    const Root = defineComponent(
      { shadowRoot, state },
      '{{#if state.show}}{{#in-element shadowRoot insertBefore=null}}<p>hello</p>{{/in-element}}{{/if}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>kept</p><p>hello</p>');

    state.show = false;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '<p>kept</p>');
  }

  @test
  'Changing the ShadowRoot target moves the content'() {
    const first = attachShadow();
    const second = attachShadow();
    const state = new State();
    state.target = first.shadowRoot;

    const Root = defineComponent(
      { state },
      '{{#in-element state.target}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(first.shadowRoot), '[Yippie!]');
    this.assert.strictEqual(shadowHTML(second.shadowRoot), '');

    state.target = second.shadowRoot;
    this.rerender();
    this.assert.strictEqual(shadowHTML(first.shadowRoot), '', 'the old target is cleared');
    this.assert.strictEqual(shadowHTML(second.shadowRoot), '[Yippie!]');

    state.foo = 'Double Yups!';
    this.rerender();
    this.assert.strictEqual(shadowHTML(second.shadowRoot), '[Double Yups!]');
  }

  @test
  'Changing the target from an Element to a ShadowRoot'() {
    const element = document.createElement('div');
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.target = element;

    const Root = defineComponent(
      { state },
      '{{#in-element state.target}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(element.innerHTML, '[Yippie!]');

    state.target = shadowRoot;
    this.rerender();
    this.assert.strictEqual(element.innerHTML, '', 'the element is cleared');
    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');

    state.target = element;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '', 'the shadow root is cleared');
    this.assert.strictEqual(element.innerHTML, '[Yippie!]');
  }

  @test
  'Changing the target to null clears the ShadowRoot'() {
    const { shadowRoot } = attachShadow();
    const state = new State();
    state.target = shadowRoot;

    const Root = defineComponent(
      { state },
      '{{#in-element state.target}}[{{state.foo}}]{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');
    this.assertHTML('<!---->');

    state.target = null;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '');
    this.assertHTML('<!---->');

    state.target = shadowRoot;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot), '[Yippie!]');
  }

  @test
  'nested {{#in-element}} from one ShadowRoot into another'() {
    const outer = attachShadow();
    const inner = attachShadow();
    const state = new State();
    state.foo = 'inner';

    const Root = defineComponent(
      { outer: outer.shadowRoot, inner: inner.shadowRoot, state },
      '{{#in-element outer}}<p>outer</p>{{#in-element inner}}<p>{{state.foo}}</p>{{/in-element}}{{/in-element}}'
    );

    this.renderComponent(Root);

    this.assert.strictEqual(shadowHTML(outer.shadowRoot), '<p>outer</p><!---->');
    this.assert.strictEqual(shadowHTML(inner.shadowRoot), '<p>inner</p>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    state.foo = 'updated';
    this.rerender();
    this.assert.strictEqual(shadowHTML(inner.shadowRoot), '<p>updated</p>');
  }

  @test
  'a ShadowRoot on an element rendered by the same template'() {
    const state = new State();
    state.foo = 'hi';
    let shadowRoot: ShadowRoot | undefined;

    const attachShadowModifier = defineSimpleModifier((element: Element) => {
      shadowRoot = element.attachShadow({ mode: 'open' });
    });

    const Root = defineComponent(
      { attachShadow: attachShadowModifier, state },
      '<div {{attachShadow}}></div>{{#if state.target}}{{#in-element state.target}}<p>{{state.foo}}</p>{{/in-element}}{{/if}}'
    );

    this.renderComponent(Root);

    this.assert.ok(shadowRoot, 'the shadow root was attached');
    this.assertHTML('<div></div><!---->');

    state.target = shadowRoot!;
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot!), '<p>hi</p>');
    this.assertHTML('<div></div><!---->');

    state.foo = 'updated';
    this.rerender();
    this.assert.strictEqual(shadowHTML(shadowRoot!), '<p>updated</p>');
  }
}
