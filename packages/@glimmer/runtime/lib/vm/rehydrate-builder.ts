import type {
  AttrNamespace,
  Bounds,
  RenderAdapter,
  Environment,
  Maybe,
  Nullable,
  SimpleComment,
  SimpleElement,
  SimpleNode,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { StackImpl as Stack } from '@glimmer/util/lib/collections';
import { NS_SVG } from '@glimmer/constants/lib/dom';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';

import { ConcreteBounds, CursorImpl } from '../bounds';
import { NewTreeBuilder, RemoteBlock } from './element-builder';

export const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';

export function isSerializationFirstNode(node: SimpleNode): boolean {
  return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
}

export class RehydratingCursor extends CursorImpl {
  candidate: Nullable<SimpleNode> = null;
  openBlockDepth: number;
  injectedOmittedNode = false;
  constructor(
    element: SimpleElement,
    nextSibling: Nullable<SimpleNode>,
    public readonly startingBlockDepth: number
  ) {
    super(element, nextSibling);
    this.openBlockDepth = startingBlockDepth - 1;
  }
}

export class RehydrateTree extends NewTreeBuilder implements TreeBuilder {
  private unmatchedAttributes: Nullable<string[]> = null;
  declare cursors: Stack<RehydratingCursor>; // Hides property on base class
  blockDepth = 0;
  startingBlockOffset: number;

  constructor(env: Environment, parentNode: SimpleElement, nextSibling: Nullable<SimpleNode>) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error('Rehydration with nextSibling not supported');

    const { adapter } = this;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    let node = adapter.firstChild(this.currentCursor!.element);

    while (node !== null) {
      if (isOpenBlock(adapter, node)) {
        break;
      }
      node = adapter.nextSibling(node);
    }

    assert(node, 'Must have opening comment for rehydration.');
    this.candidate = node;
    const startingBlockOffset = getBlockDepth(adapter, node);
    if (startingBlockOffset !== 0) {
      // We are rehydrating from a partial tree and not the root component
      // We need to add an extra block before the first block to rehydrate correctly
      // The extra block is needed since the renderComponent API creates a synthetic component invocation which generates the extra block
      const newBlockDepth = startingBlockOffset - 1;
      const newCandidate = adapter.createComment(`%+b:${newBlockDepth}%`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      const parent = adapter.parentNode(node)! as SimpleElement;

      adapter.insertBefore(parent, newCandidate, this.candidate);
      let closingNode = adapter.nextSibling(node);
      while (closingNode !== null) {
        if (
          isCloseBlock(adapter, closingNode) &&
          getBlockDepth(adapter, closingNode) === startingBlockOffset
        ) {
          break;
        }
        closingNode = adapter.nextSibling(closingNode);
      }

      assert(closingNode, 'Must have closing comment for starting block comment');
      const newClosingBlock = adapter.createComment(`%-b:${newBlockDepth}%`);
      adapter.insertBefore(parent, newClosingBlock, adapter.nextSibling(closingNode));
      this.candidate = newCandidate;
      this.startingBlockOffset = newBlockDepth;
    } else {
      this.startingBlockOffset = 0;
    }
  }

  get currentCursor(): Nullable<RehydratingCursor> {
    return this.cursors.current;
  }

  get candidate(): Nullable<SimpleNode> {
    if (this.currentCursor) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      return this.currentCursor.candidate!;
    }

    return null;
  }

  set candidate(node: Nullable<SimpleNode>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    const currentCursor = this.currentCursor!;

    currentCursor.candidate = node;
  }

  disableRehydration(nextSibling: Nullable<SimpleNode>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    const currentCursor = this.currentCursor!;

    // rehydration will be disabled until we either:
    // * hit popElement (and return to using the parent elements cursor)
    // * hit closeBlock and the next sibling is a close block comment
    //   matching the expected openBlockDepth
    currentCursor.candidate = null;
    currentCursor.nextSibling = nextSibling;
  }

  enableRehydration(candidate: Nullable<SimpleNode>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    const currentCursor = this.currentCursor!;

    currentCursor.candidate = candidate;
    currentCursor.nextSibling = null;
  }

  override pushElement(
    /** called from parent constructor before we initialize this */
    this:
      | RehydrateTree
      | (NewTreeBuilder & Partial<Pick<RehydrateTree, 'blockDepth' | 'candidate'>>),
    element: SimpleElement,
    nextSibling: Maybe<SimpleNode> = null
  ) {
    const cursor = new RehydratingCursor(element, nextSibling, this.blockDepth || 0);

    /**
     * <div>   <---------------  currentCursor.element
     *   <!--%+b:1%--> <-------  would have been removed during openBlock
     *   <div> <---------------  currentCursor.candidate -> cursor.element
     *     <!--%+b:2%--> <-----  currentCursor.candidate.firstChild -> cursor.candidate
     *     Foo
     *     <!--%-b:2%-->
     *   </div>
     *   <!--%-b:1%-->  <------  becomes currentCursor.candidate
     */
    if (this.candidate !== null) {
      cursor.candidate = this.adapter.firstChild(element);
      this.candidate = this.adapter.nextSibling(element);
    }

    this.cursors.push(cursor);
  }

  // clears until the end of the current container
  // either the current open block or higher
  private clearMismatch(candidate: SimpleNode) {
    let current: Nullable<SimpleNode> = candidate;
    const currentCursor = this.currentCursor;
    if (currentCursor !== null) {
      const openBlockDepth = currentCursor.openBlockDepth;
      if (openBlockDepth >= currentCursor.startingBlockDepth) {
        while (current) {
          if (isCloseBlock(this.adapter, current)) {
            const closeBlockDepth = getBlockDepthWithOffset(
              this.adapter,
              current,
              this.startingBlockOffset
            );
            if (openBlockDepth >= closeBlockDepth) {
              break;
            }
          }
          current = this.remove(current);
        }
      } else {
        while (current !== null) {
          current = this.remove(current);
        }
      }
      // current cursor parentNode should be openCandidate if element
      // or openCandidate.parentNode if comment
      this.disableRehydration(current);
    }
  }

  override __openBlock(): void {
    const { currentCursor } = this;
    if (currentCursor === null) return;

    const blockDepth = this.blockDepth;

    this.blockDepth++;

    const { candidate } = currentCursor;
    if (candidate === null) return;

    const tagName = this.adapter.tagName(currentCursor.element);

    if (
      isOpenBlock(this.adapter, candidate) &&
      getBlockDepthWithOffset(this.adapter, candidate, this.startingBlockOffset) === blockDepth
    ) {
      this.candidate = this.remove(candidate);
      currentCursor.openBlockDepth = blockDepth;
    } else if (tagName !== 'TITLE' && tagName !== 'SCRIPT' && tagName !== 'STYLE') {
      this.clearMismatch(candidate);
    }
  }

  override __closeBlock(): void {
    const { currentCursor } = this;
    if (currentCursor === null) return;

    // openBlock is the last rehydrated open block
    const openBlockDepth = currentCursor.openBlockDepth;

    // this currently is the expected next open block depth
    this.blockDepth--;

    const { candidate } = currentCursor;

    let isRehydrating = false;

    if (candidate !== null) {
      isRehydrating = true;
      //assert(
      //  openBlockDepth === this.blockDepth,
      //  'when rehydrating, openBlockDepth should match this.blockDepth here'
      //);

      if (
        isCloseBlock(this.adapter, candidate) &&
        getBlockDepthWithOffset(this.adapter, candidate, this.startingBlockOffset) ===
          openBlockDepth
      ) {
        const nextSibling = this.remove(candidate);
        this.candidate = nextSibling;
        currentCursor.openBlockDepth--;
      } else {
        // close the block and clear mismatch in parent container
        // we will be either at the end of the element
        // or at the end of our containing block
        this.clearMismatch(candidate);
        isRehydrating = false;
      }
    }

    if (!isRehydrating) {
      // check if nextSibling matches our expected close block
      // if so, we remove the close block comment and
      // restore rehydration after clearMismatch disabled
      const nextSibling = currentCursor.nextSibling;
      if (
        nextSibling !== null &&
        isCloseBlock(this.adapter, nextSibling) &&
        getBlockDepthWithOffset(this.adapter, nextSibling, this.startingBlockOffset) ===
          this.blockDepth
      ) {
        // restore rehydration state
        const candidate = this.remove(nextSibling);
        this.enableRehydration(candidate);

        currentCursor.openBlockDepth--;
      }
    }
  }

  override __appendNode(node: SimpleNode): SimpleNode {
    const { candidate } = this;

    // This code path is only used when inserting precisely one node. It needs more
    // comparison logic, but we can probably lean on the cases where this code path
    // is actually used.
    if (candidate) {
      return candidate;
    } else {
      return super.__appendNode(node);
    }
  }

  override __appendHTML(html: string): Bounds {
    const candidateBounds = this.markerBounds();

    if (candidateBounds) {
      const first = candidateBounds.firstNode();

      const last = candidateBounds.lastNode();

      const newBounds = new ConcreteBounds(
        this.element,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        this.adapter.nextSibling(first)!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        this.adapter.previousSibling(last)!
      );

      const possibleEmptyMarker = this.remove(first);
      this.remove(last);

      if (possibleEmptyMarker !== null && isEmpty(this.adapter, possibleEmptyMarker)) {
        this.candidate = this.remove(possibleEmptyMarker);

        if (this.candidate !== null) {
          this.clearMismatch(this.candidate);
        }
      }

      return newBounds;
    } else {
      return super.__appendHTML(html);
    }
  }

  protected remove(node: SimpleNode): Nullable<SimpleNode> {
    const { adapter } = this;
    const element = expect(
      adapter.parentNode(node),
      `cannot remove a detached node`
    ) as SimpleElement;
    const next = adapter.nextSibling(node);
    adapter.removeChild(element, node);
    return next;
  }

  private markerBounds(): Nullable<Bounds> {
    const _candidate = this.candidate;

    const { adapter } = this;

    if (_candidate && isMarker(adapter, _candidate)) {
      const first = _candidate;
      let last = expect(adapter.nextSibling(first), `BUG: serialization markers must be paired`);

      while (!isMarker(adapter, last)) {
        last = expect(adapter.nextSibling(last), `BUG: serialization markers must be paired`);
      }

      return new ConcreteBounds(this.element, first, last);
    } else {
      return null;
    }
  }

  override __appendText(string: string): SimpleText {
    const { candidate, adapter } = this;

    if (candidate) {
      if (adapter.isText(candidate)) {
        if (adapter.nodeValue(candidate) !== string) {
          adapter.setNodeValue(candidate, string);
        }
        this.candidate = adapter.nextSibling(candidate);

        return candidate;
      } else if (isSeparator(adapter, candidate)) {
        this.candidate = this.remove(candidate);

        return this.__appendText(string);
      } else if (isEmpty(adapter, candidate) && string === '') {
        this.candidate = this.remove(candidate);

        return this.__appendText(string);
      } else {
        this.clearMismatch(candidate);

        return super.__appendText(string);
      }
    } else {
      return super.__appendText(string);
    }
  }

  override __appendComment(string: string): SimpleComment {
    const _candidate = this.candidate;
    const { adapter } = this;
    if (_candidate && adapter.isComment(_candidate)) {
      if (adapter.nodeValue(_candidate) !== string) {
        adapter.setNodeValue(_candidate, string);
      }

      this.candidate = adapter.nextSibling(_candidate);
      return _candidate;
    } else if (_candidate) {
      this.clearMismatch(_candidate);
    }

    return super.__appendComment(string);
  }

  override __openElement(tag: string): SimpleElement {
    const _candidate = this.candidate;
    const { adapter } = this;

    if (_candidate && adapter.isElement(_candidate) && isSameNodeType(adapter, _candidate, tag)) {
      this.unmatchedAttributes = adapter.attributeNames(_candidate);
      return _candidate;
    } else if (_candidate) {
      if (adapter.isElement(_candidate) && adapter.tagName(_candidate) === 'TBODY') {
        this.pushElement(_candidate, null);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        this.currentCursor!.injectedOmittedNode = true;
        return this.__openElement(tag);
      }
      this.clearMismatch(_candidate);
    }

    return super.__openElement(tag);
  }

  /**
   * Reuses the attribute `name` of the candidate element, if it has one.
   */
  private matchAttribute(name: string, value: string): boolean {
    const unmatched = this.unmatchedAttributes;

    if (unmatched) {
      const index = unmatched.indexOf(name);

      if (index !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        const element = this.constructing!;

        if (this.adapter.getAttribute(element, name) !== value) {
          this.adapter.setAttribute(element, name, value);
        }
        unmatched.splice(index, 1);
        return true;
      }
    }

    return false;
  }

  override __setAttribute(name: string, value: string, namespace: Nullable<AttrNamespace>): void {
    if (this.matchAttribute(name, value)) {
      return;
    }

    return super.__setAttribute(name, value, namespace);
  }

  override __setProperty(name: string, value: string): void {
    if (this.matchAttribute(name, value)) {
      return;
    }

    return super.__setProperty(name, value);
  }

  override __flushElement(parent: SimpleElement, constructing: SimpleElement): void {
    const { unmatchedAttributes: unmatched } = this;
    if (unmatched) {
      for (const name of unmatched) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        this.adapter.removeAttribute(this.constructing!, name);
      }
      this.unmatchedAttributes = null;
    } else {
      super.__flushElement(parent, constructing);
    }
  }

  override willCloseElement() {
    const { candidate, currentCursor } = this;

    if (candidate !== null) {
      this.clearMismatch(candidate);
    }

    if (currentCursor && currentCursor.injectedOmittedNode) {
      this.popElement();
    }

    super.willCloseElement();
  }

  getMarker(element: SimpleElement, guid: string): Nullable<SimpleNode> {
    return this.adapter.querySelector(element, `script[glmr="${guid}"]`);
  }

  override __pushRemoteElement(
    element: SimpleElement,
    cursorId: string,
    insertBefore: Maybe<SimpleNode>
  ): RemoteBlock {
    const { adapter } = this;
    const marker = this.getMarker(element, cursorId);

    assert(
      !marker || adapter.parentNode(marker) === element,
      `expected remote element marker's parent node to match remote element`
    );

    // when insertBefore is not present, we clear the element
    if (insertBefore === undefined) {
      let first = adapter.firstChild(element);

      while (first !== null && first !== marker) {
        first = this.remove(first);
      }
      insertBefore = null;
    }

    const cursor = new RehydratingCursor(element, null, this.blockDepth);
    this.cursors.push(cursor);

    if (marker === null) {
      this.disableRehydration(insertBefore);
    } else {
      this.candidate = this.remove(marker);
    }

    const block = new RemoteBlock(adapter, element);
    return this.pushBlock(block, true);
  }

  override didAppendBounds(bounds: Bounds): Bounds {
    super.didAppendBounds(bounds);
    if (this.candidate) {
      const last = bounds.lastNode();
      this.candidate = this.adapter.nextSibling(last);
    }
    return bounds;
  }
}

function isOpenBlock(adapter: RenderAdapter, node: SimpleNode): node is SimpleComment {
  return adapter.isComment(node) && adapter.nodeValue(node)?.lastIndexOf('%+b:', 0) === 0;
}

function isCloseBlock(adapter: RenderAdapter, node: SimpleNode): node is SimpleComment {
  return adapter.isComment(node) && adapter.nodeValue(node)?.lastIndexOf('%-b:', 0) === 0;
}

function getBlockDepth(adapter: RenderAdapter, node: SimpleComment): number {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- a comment has a value
  return parseInt(adapter.nodeValue(node)!.slice(4), 10);
}

function getBlockDepthWithOffset(
  adapter: RenderAdapter,
  node: SimpleComment,
  offset: number
): number {
  return getBlockDepth(adapter, node) - offset;
}

function isMarker(adapter: RenderAdapter, node: SimpleNode): boolean {
  return adapter.isComment(node) && adapter.nodeValue(node) === '%glmr%';
}

function isSeparator(adapter: RenderAdapter, node: SimpleNode): boolean {
  return adapter.isComment(node) && adapter.nodeValue(node) === '%|%';
}

function isEmpty(adapter: RenderAdapter, node: SimpleNode): boolean {
  return adapter.isComment(node) && adapter.nodeValue(node) === '% %';
}

function isSameNodeType(adapter: RenderAdapter, candidate: SimpleElement, tag: string) {
  if (adapter.namespaceURI(candidate) === NS_SVG) {
    return adapter.tagName(candidate) === tag;
  }
  return adapter.tagName(candidate) === tag.toUpperCase();
}

export function rehydrationBuilder(env: Environment, cursor: CursorImpl): TreeBuilder {
  return RehydrateTree.forInitialRender(env, cursor);
}
