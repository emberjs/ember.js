import type { Nullable, SimpleElement, SimpleNode } from '@glimmer/interfaces';
import type { EndTag, Token } from 'simple-html-tokenizer';
import { COMMENT_NODE, TEXT_NODE } from '@glimmer/constants';
import { castToSimple, unwrap } from '@glimmer/debug-util';
import { tokenize } from 'simple-html-tokenizer';

import { replaceHTML, toInnerHTML } from './dom/simple-utils';

export type IndividualSnapshot = 'up' | 'down' | SimpleNode;
export type NodesSnapshot = IndividualSnapshot[];

export function snapshotIsNode(snapshot: IndividualSnapshot): snapshot is SimpleNode {
  return snapshot !== 'up' && snapshot !== 'down';
}

export function equalTokens(
  testFragment: SimpleElement | string | null,
  testHTML: SimpleElement | string,
  message: Nullable<string> = null
) {
  if (testFragment === null) {
    throw new Error(`Unexpectedly passed null to equalTokens`);
  }

  const fragTokens = generateTokens(testFragment);
  const htmlTokens = generateTokens(testHTML);

  cleanEmberIds(fragTokens.tokens);
  cleanEmberIds(htmlTokens.tokens);

  const equiv = QUnit.equiv(fragTokens.tokens, htmlTokens.tokens);

  if (equiv && fragTokens.html !== htmlTokens.html) {
    QUnit.assert.deepEqual(
      fragTokens.tokens,
      htmlTokens.tokens,
      message || 'expected tokens to match'
    );
  } else {
    QUnit.assert.pushResult({
      result: QUnit.equiv(fragTokens.tokens, htmlTokens.tokens),
      actual: fragTokens.html,
      expected: htmlTokens.html,
      message: message || 'expected tokens to match',
    });
  }

  // QUnit.assert.deepEqual(fragTokens.tokens, htmlTokens.tokens, msg);
}

function cleanEmberIds(tokens: Token[]) {
  let id = 0;

  tokens.forEach((token) => {
    const idAttr = 'attributes' in token && token.attributes.filter((a) => a[0] === 'id')[0];

    if (idAttr) {
      idAttr[1] = idAttr[1].replace(/ember(\d+|\*)/u, `ember${++id}`);
    }
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

// Under GXT (`__GXT_MODE__`), `equalTokens` ignores the comments GXT renders
// for its own bookkeeping, on both sides of the comparison:
//   ``           the empty `<!---->` placeholder at list/branch boundaries
//   `/?htmlRaw`  the boundary comments around `{{{triple-curly}}}` output
//   `$[N]`       the per-element id comment of GXT's SSR mode
//   `curried-start` / `curried-end`
//                the boundaries of a curried component rendered as content
//                (`{{this.Foo}}`, a yielded `(component)`)
// and GXT's SSR `data-node-id` attribute.
const MARKER_COMMENT_RE = /^(\$\[[^\]]*\]|\/?htmlRaw|curried-(?:start|end)|)$/u;

/**
 * Whether `node` is one of the comments GXT renders for its own bookkeeping
 * (see `MARKER_COMMENT_RE`). Always false outside GXT.
 */
export function isGxtMarkerNode(node: SimpleNode): boolean {
  return (
    __GXT_MODE__ && node.nodeType === COMMENT_NODE && MARKER_COMMENT_RE.test(node.nodeValue.trim())
  );
}

/**
 * The first node from `node` on (`node` itself, then its next siblings) that
 * is not a GXT marker comment (see `isGxtMarkerNode`); `node` itself outside
 * GXT.
 */
export function skipGxtMarkers(node: Nullable<SimpleNode>): Nullable<SimpleNode> {
  while (node !== null && isGxtMarkerNode(node)) {
    node = node.nextSibling;
  }
  return node;
}

function stripMarkers(tokens: Token[]): Token[] {
  const filtered = tokens
    .filter((token) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (token.type === 'Comment') {
        const text = (token as unknown as { chars: string }).chars ?? '';
        if (MARKER_COMMENT_RE.test(text.trim())) return false;
      }
      return true;
    })
    .map((token) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (token.type === 'StartTag' && 'attributes' in token && token.attributes) {
        token.attributes = token.attributes.filter((a) => a[0] !== 'data-node-id');
      }
      return token;
    });

  // Merge adjacent `Chars` tokens: removing a comment between two text
  // nodes leaves two `Chars` tokens where a browser-parsed string has one.
  const merged: Token[] = [];
  for (const token of filtered) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (token.type === 'Chars' && merged.length > 0) {
      const prev = merged[merged.length - 1] as Token & { chars?: string };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (prev && prev.type === 'Chars') {
        (prev as { chars: string }).chars =
          (prev.chars ?? '') + ((token as unknown as { chars: string }).chars ?? '');
        continue;
      }
    }
    merged.push(token);
  }
  return merged;
}

function generateTokens(divOrHTML: SimpleElement | string): { tokens: Token[]; html: string } {
  let div: SimpleElement;
  if (typeof divOrHTML === 'string') {
    div = castToSimple(document.createElement('div'));
    replaceHTML(div, divOrHTML);
  } else {
    div = divOrHTML;
  }

  let tokens = tokenize(toInnerHTML(div), {});
  if (__GXT_MODE__) {
    tokens = stripMarkers(tokens);
  }

  tokens = tokens.reduce((tokens, token) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (token.type === 'StartTag') {
      if (token.attributes) {
        token.attributes.sort((a, b) => {
          if (a[0] > b[0]) {
            return 1;
          }
          if (a[0] < b[0]) {
            return -1;
          }
          return 0;
        });
      }

      if (token.selfClosing) {
        token.selfClosing = false;
        tokens.push(token);
        tokens.push({ type: 'EndTag', tagName: token.tagName } as EndTag);
      } else {
        tokens.push(token);
      }
    } else {
      tokens.push(token);
    }

    return tokens;
  }, new Array<Token>());

  return { tokens, html: toInnerHTML(div) };
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
