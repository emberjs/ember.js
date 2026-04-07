import { getAssert } from './assert-helpers';
import equalTokens from './equal-tokens';
import { classes, equalsElement, regex } from './matchers';
import { getContext } from './test-context';

export const TextNode = window.Text;
export const HTMLElement = window.HTMLElement;
export const Comment = window.Comment;

export function getElement(): HTMLElement {
  let context = getContext();
  if (!context) {
    throw new Error('Test context is not set up.');
  }

  let element = context['element'];
  if (!element) {
    throw new Error('`element` property on test context is not set up.');
  }

  return element;
}

export function isMarker(node: unknown): node is Comment | typeof TextNode {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export function assertHTML(html: string): void {
  equalTokens(getElement(), html, `#qunit-fixture content should be: \`${html}\``);
}

export function assertElement(
  node: ChildNode | null,
  {
    ElementType = HTMLElement,
    tagName,
    attrs = null,
    content = null,
  }: {
    ElementType?: typeof HTMLElement;
    tagName: string;
    attrs?: Record<string, unknown> | null;
    content?: unknown;
  }
) {
  if (!node || !(node instanceof ElementType)) {
    throw new Error(`Expecting a ${ElementType.name}, but got ${String(node)}`);
  }

  equalsElement(getAssert(), node, tagName, attrs, content);
}

export interface ClassicComponentShape {
  ElementType?: typeof HTMLElement;
  tagName: string;
  attrs?: Record<string, unknown>;
  content?: unknown;
}

export function assertClassicComponentElement(
  node: ChildNode | null,
  shape: ClassicComponentShape
): void;
export function assertClassicComponentElement(shape: ClassicComponentShape): void;
export function assertClassicComponentElement(
  ...args: [node: ChildNode | null, shape: ClassicComponentShape] | [shape: ClassicComponentShape]
): void {
  let node = args.length === 2 ? args[0] : getElement().firstChild;
  let shape = args.length === 2 ? args[1] : args[0];

  let attrs = Object.assign({
    id: regex(/^ember\d*$/),
    class: classes('ember-view'),
    ...shape.attrs,
  });

  assertElement(node, {
    ElementType: shape.ElementType ?? HTMLElement,
    tagName: shape.tagName,
    attrs,
    content: shape.content,
  });
}

export function assertSameNode(actual: ChildNode | undefined, expected: ChildNode | undefined) {
  getAssert().strictEqual(actual, expected, 'DOM node stability');
}

export function assertInvariants(oldSnapshot: ChildNode[], newSnapshot?: ChildNode[]): void {
  newSnapshot = newSnapshot || takeSnapshot();

  getAssert().strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

  for (let i = 0; i < oldSnapshot.length; i++) {
    assertSameNode(newSnapshot[i], oldSnapshot[i]);
  }
}

export function takeSnapshot() {
  let snapshot: ChildNode[] = [];

  let node = getElement().firstChild;

  while (node) {
    if (!isMarker(node)) {
      snapshot.push(node);
    }

    node = node.nextSibling;
  }

  return snapshot;
}
