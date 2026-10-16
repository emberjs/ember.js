// gxt NATIVE layer: curried components (gxt curried values, resolved by the
// native component manager) — `(component X a=1)` with later arguments,
// nested currying, Glimmer component classes, reactive curried arguments,
// contextual components yielded through `hash`, and arguments as dynamic
// components (`<@comp />`, `{{component @comp}}`).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { hash } from '@ember/helper';
import { run } from '@ember/runloop';
import { setupNativeRendering, textOf, htmlOf } from './-helpers';

const { module, test } = QUnit;

function commentCount(element) {
  let n = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) n++;
  return n;
}

module('gxt-native | curried components', function (hooks) {
  setupNativeRendering(hooks);

  test('(component X a=1): curried args, invocation args win, blocks come from the invocation', function (assert) {
    const Show = <template><p>{{@a}}-{{@b}}-{{yield}}</p></template>;
    const Root = <template>
      {{#let (component Show a="curried" b="curried") as |C|}}
        <C @b="invoked">block</C>
      {{/let}}
    </template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'curried-invoked-block');
  });

  test('nested currying: later layers override earlier ones', function (assert) {
    const Show = <template>{{@a}}{{@b}}{{@c}}</template>;
    const Root = <template>
      {{#let (component Show a=1 b=1) as |Inner|}}
        {{#let (component Inner b=2 c=2) as |Outer|}}
          <Outer @c={{3}} />
        {{/let}}
      {{/let}}
    </template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), '123');
  });

  test('a curried Glimmer component class: reactive curried args update in place', function (assert) {
    const made = [];
    class Label extends Component {
      constructor(owner, args) {
        super(owner, args);
        made.push(this);
      }
      get upper() {
        return String(this.args.text).toUpperCase();
      }
      <template><b>{{this.upper}}</b></template>
    }
    let root;
    class Root extends Component {
      @tracked text = 'hi';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        {{#let (component Label text=this.text) as |L|}}<L />{{/let}}
      </template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'HI');
    run(() => (root.text = 'yo'));
    assert.strictEqual(textOf(this.element), 'YO');
    assert.strictEqual(made.length, 1, 'updated, not re-created');
  });

  test('contextual components yielded through (hash …)', function (assert) {
    const Title = <template><h2>{{@size}}:{{yield}}</h2></template>;
    const Body = <template><section>{{@text}}</section></template>;
    const Card = <template>
      <article>{{yield (hash title=(component Title size="L") body=(component Body text=@text))}}</article>
    </template>;
    let root;
    class Root extends Component {
      @tracked text = 'one';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        <Card @text={{this.text}} as |card|>
          <card.title>Hello</card.title>
          {{component card.body}}
        </Card>
      </template>
    }
    this.render(Root);
    assert.strictEqual(
      htmlOf(this.element).replace(/\s+/g, ''),
      '<article><h2>L:Hello</h2><section>one</section></article>'
    );
    run(() => (root.text = 'two'));
    assert.strictEqual(this.element.querySelector('section').textContent, 'two');
  });

  test('<@comp /> and {{component @comp}} render a component passed as an argument', function (assert) {
    const A = <template><i>A{{@n}}</i></template>;
    const Host = <template><@comp @n={{1}} />{{component @comp n=2}}</template>;
    const Root = <template><Host @comp={{A}} /></template>;
    this.render(Root);
    assert.strictEqual(htmlOf(this.element).replace(/\s+/g, ''), '<i>A1</i><i>A2</i>');
  });

  test('a dynamic component swaps definitions, renders nothing for null, leaves no stray anchors', function (assert) {
    const A = <template><i>A</i></template>;
    const B = <template><b>B</b></template>;
    let root;
    class Root extends Component {
      @tracked which = A;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><div>{{component this.which}}</div></template>
    }
    this.render(Root);
    const box = this.element.querySelector('div');
    assert.strictEqual(htmlOf(box), '<i>A</i>');
    const comments = commentCount(box);
    run(() => (root.which = B));
    assert.strictEqual(htmlOf(box), '<b>B</b>');
    run(() => (root.which = null));
    assert.strictEqual(htmlOf(box), '');
    run(() => (root.which = A));
    assert.strictEqual(htmlOf(box), '<i>A</i>');
    assert.strictEqual(commentCount(box), comments, 'no anchor comment leaked by the swaps');
  });
});
