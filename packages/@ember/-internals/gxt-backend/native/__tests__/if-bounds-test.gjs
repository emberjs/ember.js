// gxt NATIVE layer: `{{#if}}` renders Glimmer's DOM. Glimmer renders an
// `{{#if}}` as one resettable block: an EMPTY block appends `<!---->`, a block
// with content owns exactly its nodes (no anchor comment), and a branch swap
// re-renders the block in place (gxt `IfCondition`, EMBER_NATIVE
// `settleNativeBounds` / `parkPlaceholder`).
//
// The DOM is compared with its comments KEPT: `domOf` prints each comment as
// `<!---->`, `nodesOf` prints elements and text, and `#` for each comment.
// (Locals are not named after the template's tags: a strict-mode template
// would resolve `<p>` to a local `p`.)
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { run } from '@ember/runloop';
import { setupNativeRendering } from './-helpers';

const { module, test } = QUnit;

/** innerHTML with every comment printed as `<!---->` (gxt's node ids dropped). */
function domOf(element) {
  return element.innerHTML
    .replace(/ data-node-id="\d+"/g, '')
    .replace(/<!--[\s\S]*?-->/g, '<!---->');
}

/** The child nodes in order: an element / text as its text, a comment as `#`. */
function nodesOf(element) {
  return Array.from(element.childNodes, (node) => (node.nodeType === 8 ? '#' : node.textContent));
}

module('gxt-native | {{#if}} block bounds (Glimmer DOM)', function (hooks) {
  setupNativeRendering(hooks);

  test('a branch with content has no anchor comment; an empty branch is <!---->', function (assert) {
    let root;
    class Root extends Component {
      @tracked show = true;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><p>x{{#if this.show}}<b>A</b>{{/if}}y</p></template>
    }
    this.render(Root);
    const para = this.element.querySelector('p');
    assert.strictEqual(domOf(para), 'x<b>A</b>y');
    run(() => (root.show = false));
    assert.strictEqual(domOf(para), 'x<!---->y');
    run(() => (root.show = true));
    assert.strictEqual(domOf(para), 'x<b>A</b>y');
  });

  test('{{else}} and {{else if}}: the next branch renders in place, never with an anchor', function (assert) {
    let root;
    class Root extends Component {
      @tracked mode = 'a';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      get isA() {
        return this.mode === 'a';
      }
      get isB() {
        return this.mode === 'b';
      }
      <template>
        <p>x{{#if this.isA}}<b>A</b>{{else if this.isB}}<i>B</i>{{else}}c{{/if}}y</p>
      </template>
    }
    this.render(Root);
    const para = this.element.querySelector('p');
    assert.strictEqual(domOf(para), 'x<b>A</b>y');
    run(() => (root.mode = 'b'));
    assert.strictEqual(domOf(para), 'x<i>B</i>y');
    run(() => (root.mode = 'c'));
    assert.strictEqual(domOf(para), 'xcy');
    run(() => (root.mode = 'a'));
    assert.strictEqual(domOf(para), 'x<b>A</b>y');
  });

  test('a branch that is itself an empty block shows one <!---->', function (assert) {
    let root;
    class Root extends Component {
      @tracked outer = true;
      @tracked inner = false;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><p>x{{#if this.outer}}{{#if this.inner}}<b>B</b>{{/if}}{{/if}}y</p></template>
    }
    this.render(Root);
    const para = this.element.querySelector('p');
    assert.strictEqual(domOf(para), 'x<!---->y');
    run(() => (root.inner = true));
    assert.strictEqual(domOf(para), 'x<b>B</b>y');
    run(() => (root.outer = false));
    assert.strictEqual(domOf(para), 'x<!---->y');
    run(() => (root.outer = true));
    assert.strictEqual(domOf(para), 'x<b>B</b>y');
  });

  test('{{#each}} rows that start and end with {{#if}}: move, swap, remove, clear', function (assert) {
    class Item {
      @tracked a;
      @tracked b;
      constructor(id, a, b) {
        this.id = id;
        this.a = a;
        this.b = b;
      }
    }
    const [one, two, three, four, five] = [
      new Item(1, true, true),
      new Item(2, true, false),
      new Item(3, false, true),
      new Item(4, false, false),
      new Item(5, true, true),
    ];
    let root;
    class Root extends Component {
      @tracked items = [one, two, three, four];
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        <ul>{{#each this.items key="id" as |item|}}{{#if item.a}}<li>a{{item.id}}</li>{{/if}}<li>{{item.id}}</li>{{#if item.b}}<li>b{{item.id}}</li>{{/if}}{{/each}}</ul>
      </template>
    }
    this.render(Root);
    const list = this.element.querySelector('ul');
    // Each row: its `{{#each}}` row marker (`#`), then Glimmer's item DOM — an
    // empty `{{#if}}` is `#`, one with content its `<li>`. The list's own
    // boundary comments open and close it.
    const expected = () => [
      '#',
      ...root.items.flatMap((i) => [
        '#',
        ...(i.a ? [`a${i.id}`] : ['#']),
        `${i.id}`,
        ...(i.b ? [`b${i.id}`] : ['#']),
      ]),
      '#',
    ];
    const step = (label, change) => {
      run(change);
      assert.deepEqual(nodesOf(list), expected(), label);
    };
    assert.deepEqual(nodesOf(list), expected(), 'initial');
    step('toggle the edge blocks', () => {
      one.a = false;
      four.b = true;
      three.a = true;
    });
    step('move (reverse)', () => (root.items = [four, three, two, one]));
    step('swap', () => (root.items = [one, three, two, four]));
    step('toggle after the moves', () => {
      one.b = false;
      four.a = true;
      two.b = true;
    });
    step('remove', () => (root.items = [one, four]));
    step('insert between', () => (root.items = [one, five, four]));
    step('toggle the neighbours', () => {
      four.a = false;
      one.b = true;
    });
    step('clear', () => (root.items = []));
    step('re-create', () => (root.items = [two, three]));
    step('toggle after re-create', () => (two.a = false));
  });
});
