import type { Nullable, SimpleElement, SimpleNode } from '@glimmer/interfaces';
import { COMMENT_NODE, TEXT_NODE } from '@glimmer/constants';
import { unwrap } from '@glimmer/debug-util';

import { toInnerHTML } from './dom/simple-utils';

export type IndividualSnapshot = 'up' | 'down' | SimpleNode;
export type NodesSnapshot = IndividualSnapshot[];

export function snapshotIsNode(snapshot: IndividualSnapshot): snapshot is SimpleNode {
  return snapshot !== 'up' && snapshot !== 'down';
}

// -- HTML equivalence (replaces simple-html-tokenizer) ----------------------
//
// Compares two HTML fragments for semantic equivalence by normalizing
// attribute order via the browser's DOM parser. Ember ID attributes
// are normalized to a stable counter so order-independent tests pass.

function normalizeHTML(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  sortAttributes(container);
  return container.innerHTML;
}

function sortAttributes(element: Element): void {
  for (const child of Array.from(element.children)) {
    if (child.attributes.length > 1) {
      const attrs = Array.from(child.attributes).map((a) => [a.name, a.value] as const);
      attrs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      for (const [name] of attrs) {
        child.removeAttribute(name);
      }
      for (const [name, value] of attrs) {
        child.setAttribute(name, value);
      }
    }
    sortAttributes(child);
  }
}

function cleanEmberIds(html: string): string {
  let id = 0;
  return html.replace(/ember(\d+|\*)/gu, () => `ember${++id}`);
}

export function equalTokens(
  testFragment: SimpleElement | string | null,
  testHTML: SimpleElement | string,
  message: Nullable<string> = null
) {
  if (testFragment === null) {
    throw new Error(`Unexpectedly passed null to equalTokens`);
  }

  const fragHTML = typeof testFragment === 'string' ? testFragment : toInnerHTML(testFragment);
  const expectedHTML = typeof testHTML === 'string' ? testHTML : toInnerHTML(testHTML);

  const normalizedFrag = cleanEmberIds(normalizeHTML(fragHTML));
  const normalizedExpected = cleanEmberIds(normalizeHTML(expectedHTML));

  QUnit.assert.pushResult({
    result: normalizedFrag === normalizedExpected,
    actual: fragHTML,
    expected: expectedHTML,
    message: message || 'expected tokens to match',
  });
}

function isMarker(node: SimpleNode) {
  if (node.nodeType === COMMENT_NODE && node.nodeValue === '') {
    return true;
  }

  if (node.nodeType === TEXT_NODE && node.nodeValue === '') {
    return true;
  }

  return false;
}

export function generateSnapshot(element: SimpleElement): SimpleNode[] {
  const snapshot: SimpleNode[] = [];
  let node: Nullable<SimpleNode> = element.firstChild;

  while (node) {
    if (!isMarker(node)) {
      snapshot.push(node);
    }
    node = node.nextSibling;
  }

  return snapshot;
}

export function equalSnapshots(a: SimpleNode[], b: SimpleNode[]) {
  QUnit.assert.strictEqual(a.length, b.length, 'Same number of nodes');
  for (let i = 0; i < b.length; i++) {
    QUnit.assert.strictEqual(a[i], b[i], 'Nodes are the same');
  }
}

export function isServerMarker(node: SimpleNode) {
  return node.nodeType === COMMENT_NODE && node.nodeValue.charAt(0) === '%';
}

export function normalizeSnapshot(
  oldSnapshot: NodesSnapshot,
  newSnapshot: NodesSnapshot,
  except: SimpleNode[]
): { oldSnapshot: IndividualSnapshot[]; newSnapshot: IndividualSnapshot[] } {
  const oldIterator = new SnapshotIterator(oldSnapshot);
  const newIterator = new SnapshotIterator(newSnapshot);

  const normalizedOld: IndividualSnapshot[] = [];
  const normalizedNew: IndividualSnapshot[] = [];

  while (true) {
    const nextOld = oldIterator.peek();
    const nextNew = newIterator.peek();

    if (nextOld === null && newIterator.peek() === null) break;

    if (
      (nextOld && snapshotIsNode(nextOld) && except.indexOf(nextOld) > -1) ||
      (nextNew && snapshotIsNode(nextNew) && except.indexOf(nextNew) > -1)
    ) {
      oldIterator.skip();
      newIterator.skip();
    } else {
      normalizedOld.push(oldIterator.next() as IndividualSnapshot);
      normalizedNew.push(newIterator.next() as IndividualSnapshot);
    }
  }

  return { oldSnapshot: normalizedOld, newSnapshot: normalizedNew };
}

class SnapshotIterator {
  private depth = 0;
  private pos = 0;

  constructor(private snapshot: NodesSnapshot) {}

  peek(): Nullable<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.snapshot[this.pos] ?? null;
  }

  next(): Nullable<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.nextNode() || null;
  }

  skip(): void {
    const skipUntil = this.depth;
    this.nextNode();

    if (this.snapshot[this.pos] === 'down') {
      do {
        this.nextNode();
      } while (this.depth !== skipUntil);
    }
  }

  private nextNode(): IndividualSnapshot {
    const token = this.snapshot[this.pos++];

    if (token === 'down') {
      this.depth++;
    } else if (token === 'up') {
      this.depth--;
    }

    return unwrap(token);
  }
}
