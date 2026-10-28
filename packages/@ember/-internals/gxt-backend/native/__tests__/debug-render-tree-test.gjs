// gxt NATIVE layer: `renderer:-dom`.debugRenderTree.capture() → gxt
// captureRenderTree over the owner's render roots, with component names from
// the native `resolveComponentName` host hook (not gxt's internal `NativeComponent`
// factory / template wrapper names).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { capabilities, on, setModifierManager } from '@ember/modifier';
import { run } from '@ember/runloop';
import { setupNativeRendering } from './-helpers';

const { module, test } = QUnit;

function names(nodes, out = []) {
  for (const node of nodes) {
    out.push(node.name);
    names(node.children, out);
  }
  return out;
}

module('gxt-native | debugRenderTree', function (hooks) {
  setupNativeRendering(hooks);

  test('capture() names Ember components by their definition', function (assert) {
    const InnerTemplateOnly = <template><i>{{@v}}</i></template>;
    const Badge = setComponentTemplate(<template><b>badge</b></template>, templateOnly('my-app/badge', 'Badge'));
    class OuterCard extends Component {
      <template><section><InnerTemplateOnly @v="1" /><Badge /></section></template>
    }
    this.render(OuterCard);

    const renderer = this.owner.lookup('renderer:-dom');
    const tree = renderer.debugRenderTree.capture();
    const all = names(tree);

    assert.strictEqual(tree.length, 1, 'one root for this owner');
    assert.strictEqual(tree[0].name, '{ROOT}', 'the renderComponent root is {ROOT} (Glimmer parity)');
    assert.ok(all.includes('InnerTemplateOnly'), `template-only gxt component named by its binding (${all.join(', ')})`);
    assert.ok(all.includes('Badge'), 'templateOnly() definition named by its definition name');
    assert.notOk(all.includes('NativeComponent'), 'never the native factory name');
    assert.strictEqual(tree[0].type, 'component');
    assert.ok(tree[0].bounds && tree[0].bounds.firstNode, 'bounds captured');
  });

  test('capture() lists element modifiers under the component rendering the element', function (assert) {
    // Glimmer (`ComponentElementOperations#addModifier`): a `modifier` node per
    // element modifier — name, arguments, the manager's debug instance (null
    // for `on`), the element as bounds — under the component rendering it,
    // even from inside a block.
    const instances = [];
    function tagged() {}
    setModifierManager(
      () => ({
        capabilities: capabilities('3.22'),
        createModifier() {
          const instance = { tagged: true };
          instances.push(instance);
          return instance;
        },
        installModifier() {},
        updateModifier() {},
        destroyModifier() {},
      }),
      tagged
    );
    const Leaf = <template><u>leaf</u></template>;
    let card;
    class Card extends Component {
      @tracked show = true;
      go = () => {};
      constructor(owner, args) {
        super(owner, args);
        card = this;
      }
      <template>
        <section><button {{on "click" this.go}}>go</button>{{#if this.show}}<i {{tagged "x" tone="red"}}>i</i><Leaf />{{/if}}</section>
      </template>
    }
    this.render(Card);
    const renderer = this.owner.lookup('renderer:-dom');
    const sectionEl = this.element.querySelector('section');
    const capture = () => renderer.debugRenderTree.capture()[0];

    const [onNode, taggedNode, leafNode] = capture().children;
    assert.strictEqual(onNode.type, 'modifier');
    assert.strictEqual(onNode.name, 'on');
    assert.strictEqual(onNode.instance, null, '`on` has no debug instance');
    assert.deepEqual(onNode.args.named, {});
    assert.strictEqual(onNode.args.positional[0], 'click');
    assert.strictEqual(onNode.args.positional[1], card.go);
    assert.strictEqual(onNode.bounds.parentElement, sectionEl);
    assert.strictEqual(onNode.bounds.firstNode, sectionEl.querySelector('button'));
    assert.strictEqual(onNode.bounds.lastNode, sectionEl.querySelector('button'));
    assert.deepEqual(onNode.children, []);

    // a modifier on an element inside `{{#if}}` (beside one component)
    assert.strictEqual(taggedNode.type, 'modifier');
    assert.strictEqual(taggedNode.name, 'tagged', 'a custom manager: the definition name');
    assert.strictEqual(taggedNode.instance, instances[0], 'a custom manager: its modifier');
    assert.deepEqual(taggedNode.args, { positional: ['x'], named: { tone: 'red' } });
    assert.strictEqual(taggedNode.bounds.firstNode, sectionEl.querySelector('i'));
    assert.strictEqual(leafNode.type, 'component');
    assert.strictEqual(leafNode.name, 'Leaf');

    // a removed element's modifier leaves the tree
    run(() => (card.show = false));
    const children = capture().children;
    assert.deepEqual(
      children.map((node) => node.name),
      ['on'],
      'only the button modifier is left'
    );
  });

  test('capture(): a modifier replaced on the same element leaves the tree', function (assert) {
    const manager = () => ({
      capabilities: capabilities('3.22'),
      createModifier() {
        return {};
      },
      installModifier() {},
      updateModifier() {},
      destroyModifier() {},
    });
    function first() {}
    function second() {}
    setModifierManager(manager, first);
    setModifierManager(manager, second);
    let probe;
    class Probe extends Component {
      @tracked current = first;
      constructor(owner, args) {
        super(owner, args);
        probe = this;
      }
      <template><b {{this.current "v"}}>b</b></template>
    }
    this.render(Probe);
    const renderer = this.owner.lookup('renderer:-dom');
    const modifierNames = () =>
      renderer.debugRenderTree
        .capture()[0]
        .children.filter((node) => node.type === 'modifier')
        .map((node) => node.name);
    assert.deepEqual(modifierNames(), ['first']);
    // a new definition re-creates the modifier on the same element
    run(() => (probe.current = second));
    assert.deepEqual(modifierNames(), ['second'], 'the replaced modifier is gone');
  });

  test('capture() is scoped to the renderer owner and drops destroyed roots', function (assert) {
    const Leaf = <template>leaf</template>;
    this.render(Leaf);
    const renderer = this.owner.lookup('renderer:-dom');
    assert.strictEqual(renderer.debugRenderTree.capture().length, 1);
    this.result.destroy();
    this.result = null;
    assert.strictEqual(renderer.debugRenderTree.capture().length, 0);
  });
});
