import { type Option, type SimpleElement, type SimpleNode } from '@glimmer/interfaces';
import { castToSimple, COMMENT_NODE, TEXT_NODE } from '@glimmer/util';
import { type EndTag, type Token, tokenize } from 'simple-html-tokenizer';

import { replaceHTML, toInnerHTML } from './dom/simple-utils';

export type IndividualSnapshot = 'up' | 'down' | SimpleNode;
export type NodesSnapshot = IndividualSnapshot[];

export function snapshotIsNode(snapshot: IndividualSnapshot): snapshot is SimpleNode {
  return snapshot !== 'up' && snapshot !== 'down';
}

export function equalTokens(
  testFragment: SimpleElement | string | null,
  testHTML: SimpleElement | string,
  message: Option<string> = null
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
      idAttr[1] = idAttr[1].replace(/ember(\d+|\*)/, `ember${++id}`);
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
  let node: Option<SimpleNode> = element.firstChild;

  while (node) {
    if (!isMarker(node)) {
      snapshot.push(node);
    }
    node = node.nextSibling;
  }

  return snapshot;
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

  tokens = tokens.reduce((tokens, token) => {
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

  peek(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.snapshot[this.pos] as IndividualSnapshot;
  }

  next(): Option<IndividualSnapshot> {
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
    const token = this.snapshot[this.pos++] as IndividualSnapshot;

    if (token === 'down') {
      this.depth++;
    } else if (token === 'up') {
      this.depth--;
    }

    return token;
  }
}
