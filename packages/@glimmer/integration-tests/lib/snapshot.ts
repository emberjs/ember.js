import { SimpleNode, NodeType, SimpleElement } from '@simple-dom/interface';
import { Option } from '@glimmer/interfaces';
import { replaceHTML, toInnerHTML } from './dom/simple-utils';
import { tokenize, EndTag, Token } from 'simple-html-tokenizer';

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

  let fragTokens = generateTokens(testFragment);
  let htmlTokens = generateTokens(testHTML);

  // let msg = "Expected: " + htmlTokens.html + "; Actual: " + fragTokens.html;

  // if (message) { msg += " (" + message + ")"; }

  let equiv = QUnit.equiv(fragTokens.tokens, htmlTokens.tokens);

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

function isMarker(node: SimpleNode) {
  if (node.nodeType === NodeType.COMMENT_NODE && node.nodeValue === '') {
    return true;
  }

  if (node.nodeType === NodeType.TEXT_NODE && node.nodeValue === '') {
    return true;
  }

  return false;
}

export function generateSnapshot(element: SimpleElement): SimpleNode[] {
  let snapshot: SimpleNode[] = [];
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
    div = document.createElement('div') as SimpleElement;
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
  return node.nodeType === NodeType.COMMENT_NODE && node.nodeValue!.charAt(0) === '%';
}

export function normalizeSnapshot(
  oldSnapshot: NodesSnapshot,
  newSnapshot: NodesSnapshot,
  except: Array<SimpleNode>
) {
  let oldIterator = new SnapshotIterator(oldSnapshot);
  let newIterator = new SnapshotIterator(newSnapshot);

  let normalizedOld = [];
  let normalizedNew = [];

  while (true) {
    let nextOld = oldIterator.peek();
    let nextNew = newIterator.peek();

    if (nextOld === null && newIterator.peek() === null) break;

    if (
      (nextOld && snapshotIsNode(nextOld) && except.indexOf(nextOld) > -1) ||
      (nextNew && snapshotIsNode(nextNew) && except.indexOf(nextNew) > -1)
    ) {
      oldIterator.skip();
      newIterator.skip();
    } else {
      normalizedOld.push(oldIterator.next());
      normalizedNew.push(newIterator.next());
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
    return this.snapshot[this.pos];
  }

  next(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.nextNode() || null;
  }

  skip(): void {
    let skipUntil = this.depth;
    this.nextNode();

    if (this.snapshot[this.pos] === 'down') {
      do {
        this.nextNode();
      } while (this.depth !== skipUntil);
    }
  }

  private nextNode(): IndividualSnapshot {
    let token = this.snapshot[this.pos++];

    if (token === 'down') {
      this.depth++;
    } else if (token === 'up') {
      this.depth--;
    }

    return token;
  }
}
