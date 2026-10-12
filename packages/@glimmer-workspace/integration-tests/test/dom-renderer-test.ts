import type {
  Bounds,
  DOMRenderer,
  Nullable,
  RenderResult,
  SimpleComment,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from '@glimmer/interfaces';
import { on } from '@ember/modifier';
import { run } from '@ember/runloop';
import { template } from '@ember/template-compiler/runtime';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';
import { artifacts, RuntimeOpImpl } from '@glimmer/program';
import {
  clientBuilder,
  ConcreteBounds,
  inTransaction,
  renderComponent,
  runtimeOptions,
} from '@glimmer/runtime';
import { tracked } from '@glimmer/tracking';
import ResolverImpl from '@ember/-internals/glimmer/lib/resolver';

type Kind = 'element' | 'text' | 'comment';

/**
 * A node that is not a DOM node.
 * It has none of the members of `Node`,
 * so a direct DOM access by the VM fails on it.
 */
class TreeNode {
  parent: TreeNode | null = null;
  children: TreeNode[] = [];
  attrs = new Map<string, string>();
  props = new Map<string, unknown>();
  listeners = new Map<string, EventListener[]>();

  constructor(
    readonly kind: Kind,
    public value: string
  ) {}
}

const node = (value: SimpleNode) => value as unknown as TreeNode;
const simple = <T extends SimpleNode>(value: TreeNode | null) => value as unknown as T;

class TreeRenderer implements DOMRenderer {
  createElement(tag: string): SimpleElement {
    return simple(new TreeNode('element', tag));
  }

  createElementNS(_namespace: unknown, tag: string): SimpleElement {
    return this.createElement(tag);
  }

  createTextNode(text: string): SimpleText {
    return simple(new TreeNode('text', text));
  }

  createComment(data: string): SimpleComment {
    return simple(new TreeNode('comment', data));
  }

  insertBefore(parent: SimpleElement, child: SimpleNode, reference: Nullable<SimpleNode>): void {
    let target = node(parent);
    let inserted = node(child);

    if (inserted.parent) {
      this.removeChild(simple(inserted.parent), child);
    }

    let index = reference === null ? target.children.length : this.indexOf(reference);

    target.children.splice(index, 0, inserted);
    inserted.parent = target;
  }

  insertHTMLBefore(parent: SimpleElement, reference: Nullable<SimpleNode>, html: string): Bounds {
    let text = this.createTextNode(html);

    this.insertBefore(parent, text, reference);

    return new ConcreteBounds(parent, text, text);
  }

  removeChild(parent: SimpleElement, child: SimpleNode): void {
    node(parent).children.splice(this.indexOf(child), 1);
    node(child).parent = null;
  }

  clearChildren(element: SimpleElement): void {
    for (let child of node(element).children) {
      child.parent = null;
    }

    node(element).children = [];
  }

  parentNode(child: SimpleNode): Nullable<SimpleNode> {
    return simple(node(child).parent);
  }

  firstChild(parent: SimpleNode): Nullable<SimpleNode> {
    return simple(node(parent).children[0] ?? null);
  }

  lastChild(parent: SimpleNode): Nullable<SimpleNode> {
    let { children } = node(parent);

    return simple(children[children.length - 1] ?? null);
  }

  nextSibling(child: SimpleNode): Nullable<SimpleNode> {
    return this.sibling(child, 1);
  }

  previousSibling(child: SimpleNode): Nullable<SimpleNode> {
    return this.sibling(child, -1);
  }

  querySelector(): Nullable<SimpleElement> {
    return null;
  }

  isNode(value: unknown): value is SimpleNode {
    return value instanceof TreeNode;
  }

  isFragment(_value: unknown): _value is SimpleDocumentFragment {
    return false;
  }

  isElement(value: SimpleNode): value is SimpleElement {
    return node(value).kind === 'element';
  }

  isText(value: SimpleNode): value is SimpleText {
    return node(value).kind === 'text';
  }

  isComment(value: SimpleNode): value is SimpleComment {
    return node(value).kind === 'comment';
  }

  tagName(element: SimpleElement): string {
    return node(element).value;
  }

  namespaceURI(): Nullable<string> {
    return null;
  }

  nodeValue(value: SimpleNode): Nullable<string> {
    return node(value).value;
  }

  setNodeValue(target: SimpleNode, value: string): void {
    node(target).value = value;
  }

  attributeNames(element: SimpleElement): string[] {
    return Array.from(node(element).attrs.keys());
  }

  getAttribute(element: SimpleElement, name: string): Nullable<string> {
    return node(element).attrs.get(name) ?? null;
  }

  setAttribute(element: SimpleElement, name: string, value: string): void {
    node(element).attrs.set(name, value);
  }

  removeAttribute(element: SimpleElement, name: string): void {
    node(element).attrs.delete(name);
  }

  hasProperty(element: SimpleElement, name: string): boolean {
    return node(element).props.has(name);
  }

  getProperty(element: SimpleElement, name: string): unknown {
    return node(element).props.get(name);
  }

  setProperty(element: SimpleElement, name: string, value: unknown): void {
    node(element).props.set(name, value);
  }

  addEventListener(element: SimpleElement, eventName: string, callback: EventListener): void {
    let { listeners } = node(element);

    listeners.set(eventName, (listeners.get(eventName) ?? []).concat(callback));
  }

  removeEventListener(element: SimpleElement, eventName: string, callback: EventListener): void {
    let { listeners } = node(element);

    listeners.set(
      eventName,
      (listeners.get(eventName) ?? []).filter((listener) => listener !== callback)
    );
  }

  private indexOf(child: SimpleNode): number {
    let { parent } = node(child);

    return parent ? parent.children.indexOf(node(child)) : -1;
  }

  private sibling(child: SimpleNode, offset: number): Nullable<SimpleNode> {
    let { parent } = node(child);

    return simple(parent?.children[this.indexOf(child) + offset] ?? null);
  }
}

function print(target: TreeNode): string {
  if (target.kind === 'text') return target.value;
  if (target.kind === 'comment') return `<!--${target.value}-->`;

  let attrs = '';

  for (let [name, value] of target.attrs) {
    attrs += ` ${name}="${value}"`;
  }

  return `<${target.value}${attrs}>${target.children.map(print).join('')}</${target.value}>`;
}

function find(target: TreeNode, tag: string): TreeNode | undefined {
  if (target.kind === 'element' && target.value === tag) return target;

  for (let child of target.children) {
    let found = find(child, tag);

    if (found) return found;
  }

  return undefined;
}

function setup(component: object) {
  let dom = new TreeRenderer();
  let sharedArtifacts = artifacts();
  let context = new EvaluationContextImpl(
    sharedArtifacts,
    (heap) => new RuntimeOpImpl(heap),
    runtimeOptions(
      { dom },
      { isInteractive: true, enableDebugTooling: false, onTransactionCommit() {} },
      sharedArtifacts,
      new ResolverImpl()
    )
  );
  let { env } = context;
  let root = node(dom.createElement('root'));
  let result: RenderResult | undefined;

  inTransaction(env, () => {
    result = renderComponent(
      context,
      clientBuilder(env, { element: simple(root), nextSibling: null }),
      {},
      component
    ).sync();
  });

  return {
    root,
    html: () => root.children.map(print).join(''),
    /**
     * The run loop runs the destructors of the removed content before `rerender` returns.
     */
    rerender: () => run(() => inTransaction(env, () => result?.rerender())),
  };
}

QUnit.module('[integration] DOMRenderer that is not a DOM');

QUnit.test('it renders and updates elements, attributes, and text', (assert) => {
  class State {
    @tracked title = 'one';
    @tracked name = 'Zoey';
  }

  let state = new State();
  let { html, rerender } = setup(
    template('<box title={{state.title}} kind="static">Hello, {{state.name}}!</box>', {
      strictMode: true,
      scope: () => ({ state }),
    })
  );

  assert.strictEqual(html(), '<box title="one" kind="static">Hello, Zoey!</box>');

  state.title = 'two';
  state.name = 'Tomster';
  rerender();

  assert.strictEqual(html(), '<box title="two" kind="static">Hello, Tomster!</box>');
});

QUnit.test('it renders and updates blocks', (assert) => {
  class State {
    @tracked show = true;
    @tracked items = ['a', 'b', 'c'];
  }

  let state = new State();
  let { html, rerender } = setup(
    template(
      '{{#if state.show}}<yes></yes>{{else}}<no></no>{{/if}}' +
        '<list>{{#each state.items key="@identity" as |item|}}<row>{{item}}</row>{{/each}}</list>',
      { strictMode: true, scope: () => ({ state }) }
    )
  );

  assert.strictEqual(html(), '<yes></yes><list><row>a</row><row>b</row><row>c</row></list>');

  state.show = false;
  state.items = ['c', 'a', 'd'];
  rerender();

  assert.strictEqual(html(), '<no></no><list><row>c</row><row>a</row><row>d</row></list>');

  state.items = [];
  rerender();

  assert.strictEqual(html(), '<no></no><list><!----></list>');
});

QUnit.test('the `on` modifier uses the listeners of the renderer', (assert) => {
  class State {
    @tracked show = true;
  }

  let state = new State();
  let press = () => assert.step('press');
  let { root, rerender } = setup(
    template('{{#if state.show}}<button {{on "press" press}}></button>{{/if}}', {
      strictMode: true,
      scope: () => ({ state, on, press }),
    })
  );

  let button = find(root, 'button');
  let listeners = () => button?.listeners.get('press') ?? [];

  assert.strictEqual(listeners().length, 1, 'the render adds the listener');

  listeners()[0]?.(new Event('press'));
  assert.verifySteps(['press']);

  state.show = false;
  rerender();

  assert.strictEqual(listeners().length, 0, 'the removal of the element removes the listener');
});
