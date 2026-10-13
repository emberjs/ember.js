// gxt NATIVE layer: Glimmer template semantics the native build gets from gxt
// (Inc 9) — dynamic content (G15: a `{{value}}` renders text / trusted HTML /
// a DOM node / a component by what the value IS, switching on change), kept
// whitespace, `{{#each}}` primitive rows keyed by value, `{{#each-in}}` (G5),
// `{{#let}}` shadowing its own initializer, `{{#in-element}}` at mount.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import { hash } from '@ember/helper';
import { set } from '@ember/object';
import { run } from '@ember/runloop';
import { setupNativeRendering, htmlOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | content', function (hooks) {
  setupNativeRendering(hooks);

  test('a {{value}} follows its kind: text → SafeString → node → component → text', function (assert) {
    const Badge = <template><b>badge</b></template>;
    const node = document.createElement('em');
    node.textContent = 'node';
    let root;
    class Root extends Component {
      @tracked value = 'plain <i>text</i>';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><p>{{this.value}}</p></template>
    }
    this.render(Root);
    const para = () => this.element.querySelector('p');
    assert.strictEqual(para().textContent, 'plain <i>text</i>', 'a string is text (escaped)');
    run(() => (root.value = htmlSafe('<i>trusted</i>')));
    assert.strictEqual(htmlOf(para()), '<i>trusted</i>', 'a SafeString is trusted HTML');
    run(() => (root.value = node));
    assert.strictEqual(para().firstElementChild, node, 'a DOM node is inserted as-is');
    run(() => (root.value = Badge));
    assert.strictEqual(htmlOf(para()), '<b>badge</b>', 'a component value renders the component');
    run(() => (root.value = 42));
    assert.strictEqual(htmlOf(para()), '42', 'back to text');
    assert.false(node.isConnected, 'the node left with its value');
  });

  test('newline whitespace between mustaches renders (Glimmer text nodes)', function (assert) {
    const a = 'a';
    const b = 'b';
    this.render(<template><p>{{a}}
  {{b}}</p></template>);
    assert.strictEqual(this.element.querySelector('p').textContent, 'a\n  b');
  });

  test('{{#each}} keeps a moved primitive row (@identity is the value)', function (assert) {
    let root;
    class Root extends Component {
      @tracked items = [1, 2, 3];
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#each this.items as |n i|}}<li>{{i}}:{{n}}</li>{{/each}}</template>
    }
    this.render(Root);
    const third = this.element.querySelectorAll('li')[2];
    run(() => (root.items = [1, 3]));
    const rows = this.element.querySelectorAll('li');
    assert.deepEqual(Array.from(rows, (r) => r.textContent), ['0:1', '1:3']);
    assert.strictEqual(rows[1], third, 'the `3` row moved, it was not re-created');
  });

  test('{{#each-in}}: keys and values, value updates, added keys (set), else', function (assert) {
    const obj = { a: 1, b: 2 };
    let root;
    class Root extends Component {
      @tracked source = obj;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#each-in this.source as |k v|}}[{{k}}={{v}}]{{else}}empty{{/each-in}}</template>
    }
    this.render(Root);
    assert.strictEqual(this.element.textContent, '[a=1][b=2]');
    run(() => set(obj, 'b', 3));
    assert.strictEqual(this.element.textContent, '[a=1][b=3]');
    run(() => set(obj, 'c', 4));
    assert.strictEqual(this.element.textContent, '[a=1][b=3][c=4]');
    run(() => (root.source = new Map([['m', 'M']])));
    assert.strictEqual(this.element.textContent, '[m=M]');
    run(() => (root.source = {}));
    assert.strictEqual(this.element.textContent, 'empty');
  });

  test('{{#let (hash …) as |hash|}} reads the OUTER hash', function (assert) {
    this.render(<template>{{#let (hash value="ok") as |hash|}}{{hash.value}}{{/let}}</template>);
    assert.strictEqual(this.element.textContent, 'ok');
  });

  test('{{#in-element}} finds a destination rendered earlier in the same render', function (assert) {
    const byId = (id) => document.getElementById(id);
    this.render(<template>[<div id="native-ie-target"></div>][{{#in-element (byId "native-ie-target")}}in{{/in-element}}after]</template>);
    assert.strictEqual(document.getElementById('native-ie-target').textContent, 'in');
    assert.strictEqual(this.element.textContent, '[in][after]');
  });
});
