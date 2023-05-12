import type {
  AttrNamespace,
  Bounds,
  ElementBuilder,
  Environment,
  Maybe,
  Nullable,
  SimpleAttr,
  SimpleComment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from "@glimmer/interfaces";
import {
  assert,
  castToBrowser,
  castToSimple,
  COMMENT_NODE,
  expect,
  NS_SVG,
  type Stack,
} from '@glimmer/util';

import { ConcreteBounds, CursorImpl } from '../bounds';
import { CURSOR_STACK, NewElementBuilder, RemoteLiveBlock } from './element-builder';

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

export class RehydrateBuilder extends NewElementBuilder implements ElementBuilder {
  private unmatchedAttributes: Nullable<SimpleAttr[]> = null;
  declare [CURSOR_STACK]: Stack<RehydratingCursor>; // Hides property on base class
  blockDepth = 0;
  startingBlockOffset: number;

  constructor(env: Environment, parentNode: SimpleElement, nextSibling: Nullable<SimpleNode>) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error('Rehydration with nextSibling not supported');

    let node = this.currentCursor!.element.firstChild;

    while (node !== null) {
      if (isOpenBlock(node)) {
        break;
      }
      node = node.nextSibling;
    }

    assert(node, 'Must have opening comment for rehydration.');
    this.candidate = node;
    const startingBlockOffset = getBlockDepth(node);
    if (startingBlockOffset !== 0) {
      // We are rehydrating from a partial tree and not the root component
      // We need to add an extra block before the first block to rehydrate correctly
      // The extra block is needed since the renderComponent API creates a synthetic component invocation which generates the extra block
      const newBlockDepth = startingBlockOffset - 1;
      const newCandidate = this.dom.createComment(`%+b:${newBlockDepth}%`);

      node.parentNode!.insertBefore(newCandidate, this.candidate);
      let closingNode = node.nextSibling;
      while (closingNode !== null) {
        if (isCloseBlock(closingNode) && getBlockDepth(closingNode) === startingBlockOffset) {
          break;
        }
        closingNode = closingNode.nextSibling;
      }

      assert(closingNode, 'Must have closing comment for starting block comment');
      const newClosingBlock = this.dom.createComment(`%-b:${newBlockDepth}%`);
      node.parentNode!.insertBefore(newClosingBlock, closingNode.nextSibling);
      this.candidate = newCandidate;
      this.startingBlockOffset = newBlockDepth;
    } else {
      this.startingBlockOffset = 0;
    }
  }

  get currentCursor(): Nullable<RehydratingCursor> {
    return this[CURSOR_STACK].current;
  }

  get candidate(): Nullable<SimpleNode> {
    if (this.currentCursor) {
      return this.currentCursor.candidate!;
    }

    return null;
  }

  set candidate(node: Nullable<SimpleNode>) {
    const currentCursor = this.currentCursor!;

    currentCursor.candidate = node;
  }

  disableRehydration(nextSibling: Nullable<SimpleNode>) {
    const currentCursor = this.currentCursor!;

    // rehydration will be disabled until we either:
    // * hit popElement (and return to using the parent elements cursor)
    // * hit closeBlock and the next sibling is a close block comment
    //   matching the expected openBlockDepth
    currentCursor.candidate = null;
    currentCursor.nextSibling = nextSibling;
  }

  enableRehydration(candidate: Nullable<SimpleNode>) {
    const currentCursor = this.currentCursor!;

    currentCursor.candidate = candidate;
    currentCursor.nextSibling = null;
  }

  override pushElement(
    /** called from parent constructor before we initialize this */
    this:
      | RehydrateBuilder
      | (NewElementBuilder & Partial<Pick<RehydrateBuilder, 'blockDepth' | 'candidate'>>),
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
      cursor.candidate = element.firstChild;
      this.candidate = element.nextSibling;
    }

    this[CURSOR_STACK].push(cursor);
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
          if (isCloseBlock(current)) {
            const closeBlockDepth = getBlockDepthWithOffset(current, this.startingBlockOffset);
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

    const { tagName } = currentCursor.element;

    if (
      isOpenBlock(candidate) &&
      getBlockDepthWithOffset(candidate, this.startingBlockOffset) === blockDepth
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
        isCloseBlock(candidate) &&
        getBlockDepthWithOffset(candidate, this.startingBlockOffset) === openBlockDepth
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

    if (isRehydrating === false) {
      // check if nextSibling matches our expected close block
      // if so, we remove the close block comment and
      // restore rehydration after clearMismatch disabled
      const nextSibling = currentCursor.nextSibling;
      if (
        nextSibling !== null &&
        isCloseBlock(nextSibling) &&
        getBlockDepthWithOffset(nextSibling, this.startingBlockOffset) === this.blockDepth
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
      const first = candidateBounds.firstNode()!;
      const last = candidateBounds.lastNode()!;

      const newBounds = new ConcreteBounds(this.element, first.nextSibling!, last.previousSibling!);

      const possibleEmptyMarker = this.remove(first);
      this.remove(last);

      if (possibleEmptyMarker !== null && isEmpty(possibleEmptyMarker)) {
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
    const element = expect(node.parentNode, `cannot remove a detached node`) as SimpleElement;
    const next = node.nextSibling;
    element.removeChild(node);
    return next;
  }

  private markerBounds(): Nullable<Bounds> {
    const _candidate = this.candidate;

    if (_candidate && isMarker(_candidate)) {
      const first = _candidate;
      let last = expect(first.nextSibling, `BUG: serialization markers must be paired`);

      while (last && !isMarker(last)) {
        last = expect(last.nextSibling, `BUG: serialization markers must be paired`);
      }

      return new ConcreteBounds(this.element, first, last);
    } else {
      return null;
    }
  }

  override __appendText(string: string): SimpleText {
    const { candidate } = this;

    if (candidate) {
      if (isTextNode(candidate)) {
        if (candidate.nodeValue !== string) {
          candidate.nodeValue = string;
        }
        this.candidate = candidate.nextSibling;

        return candidate;
      } else if (isSeparator(candidate)) {
        this.candidate = this.remove(candidate);

        return this.__appendText(string);
      } else if (isEmpty(candidate) && string === '') {
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
    if (_candidate && isComment(_candidate)) {
      if (_candidate.nodeValue !== string) {
        _candidate.nodeValue = string;
      }

      this.candidate = _candidate.nextSibling;
      return _candidate;
    } else if (_candidate) {
      this.clearMismatch(_candidate);
    }

    return super.__appendComment(string);
  }

  override __openElement(tag: string): SimpleElement {
    const _candidate = this.candidate;

    if (_candidate && isElement(_candidate) && isSameNodeType(_candidate, tag)) {
      this.unmatchedAttributes = [].slice.call(_candidate.attributes);
      return _candidate;
    } else if (_candidate) {
      if (isElement(_candidate) && _candidate.tagName === 'TBODY') {
        this.pushElement(_candidate, null);
        this.currentCursor!.injectedOmittedNode = true;
        return this.__openElement(tag);
      }
      this.clearMismatch(_candidate);
    }

    return super.__openElement(tag);
  }

  override __setAttribute(name: string, value: string, namespace: Nullable<AttrNamespace>): void {
    const unmatched = this.unmatchedAttributes;

    if (unmatched) {
      const attr = findByName(unmatched, name);
      if (attr) {
        if (attr.value !== value) {
          attr.value = value;
        }
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }

    return super.__setAttribute(name, value, namespace);
  }

  override __setProperty(name: string, value: string): void {
    const unmatched = this.unmatchedAttributes;

    if (unmatched) {
      const attr = findByName(unmatched, name);
      if (attr) {
        if (attr.value !== value) {
          attr.value = value;
        }
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }

    return super.__setProperty(name, value);
  }

  override __flushElement(parent: SimpleElement, constructing: SimpleElement): void {
    const { unmatchedAttributes: unmatched } = this;
    if (unmatched) {
      for (const attr of unmatched) {
        this.constructing!.removeAttribute(attr.name);
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

  getMarker(element: HTMLElement, guid: string): Nullable<SimpleNode> {
    const marker = element.querySelector(`script[glmr="${guid}"]`);
    if (marker) {
      return castToSimple(marker);
    }
    return null;
  }

  override __pushRemoteElement(
    element: SimpleElement,
    cursorId: string,
    insertBefore: Maybe<SimpleNode>
  ): Nullable<RemoteLiveBlock> {
    const marker = this.getMarker(castToBrowser(element, 'HTML'), cursorId);

    assert(
      !marker || marker.parentNode === element,
      `expected remote element marker's parent node to match remote element`
    );

    // when insertBefore is not present, we clear the element
    if (insertBefore === undefined) {
      while (element.firstChild !== null && element.firstChild !== marker) {
        this.remove(element.firstChild);
      }
      insertBefore = null;
    }

    const cursor = new RehydratingCursor(element, null, this.blockDepth);
    this[CURSOR_STACK].push(cursor);

    if (marker === null) {
      this.disableRehydration(insertBefore);
    } else {
      this.candidate = this.remove(marker);
    }

    const block = new RemoteLiveBlock(element);
    return this.pushLiveBlock(block, true);
  }

  override didAppendBounds(bounds: Bounds): Bounds {
    super.didAppendBounds(bounds);
    if (this.candidate) {
      const last = bounds.lastNode();
      this.candidate = last && last.nextSibling;
    }
    return bounds;
  }
}

function isTextNode(node: SimpleNode): node is SimpleText {
  return node.nodeType === 3;
}

function isComment(node: SimpleNode): node is SimpleComment {
  return node.nodeType === 8;
}

function isOpenBlock(node: SimpleNode): node is SimpleComment {
  return node.nodeType === COMMENT_NODE && node.nodeValue.lastIndexOf('%+b:', 0) === 0;
}

function isCloseBlock(node: SimpleNode): node is SimpleComment {
  return node.nodeType === COMMENT_NODE && node.nodeValue.lastIndexOf('%-b:', 0) === 0;
}

function getBlockDepth(node: SimpleComment): number {
  return parseInt(node.nodeValue.slice(4), 10);
}

function getBlockDepthWithOffset(node: SimpleComment, offset: number): number {
  return getBlockDepth(node) - offset;
}

function isElement(node: SimpleNode): node is SimpleElement {
  return node.nodeType === 1;
}

function isMarker(node: SimpleNode): boolean {
  return node.nodeType === 8 && node.nodeValue === '%glmr%';
}

function isSeparator(node: SimpleNode): boolean {
  return node.nodeType === 8 && node.nodeValue === '%|%';
}

function isEmpty(node: SimpleNode): boolean {
  return node.nodeType === 8 && node.nodeValue === '% %';
}

function isSameNodeType(candidate: SimpleElement, tag: string) {
  if (candidate.namespaceURI === NS_SVG) {
    return candidate.tagName === tag;
  }
  return candidate.tagName === tag.toUpperCase();
}

function findByName(array: SimpleAttr[], name: string): SimpleAttr | undefined {
  for (const attr of array) {
    if (attr.name === name) return attr;
  }

  return undefined;
}

export function rehydrationBuilder(env: Environment, cursor: CursorImpl): ElementBuilder {
  return RehydrateBuilder.forInitialRender(env, cursor);
}
