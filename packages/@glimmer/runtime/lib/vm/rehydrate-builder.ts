import { NewElementBuilder, ElementBuilder, RemoteBlockTracker } from "./element-builder";

import { Environment } from '../environment';
import Bounds, { bounds, Cursor } from '../bounds';
import { Simple, Option, Opaque } from "@glimmer/interfaces";
import { DynamicContentWrapper } from './content/dynamic';
import { expect, assert, Stack } from "@glimmer/util";
import { SVG_NAMESPACE } from '../dom/helper';

export class RehydratingCursor extends Cursor {
  candidate: Option<Simple.Node> = null;
  openBlockDepth: number;
  injectedOmittedNode = false;
  constructor(element: Simple.Element, nextSibling: Option<Simple.Node>, public readonly startingBlockDepth: number) {
    super(element, nextSibling);
    this.openBlockDepth = startingBlockDepth - 1;
  }
}

export class RehydrateBuilder extends NewElementBuilder implements ElementBuilder {
  private unmatchedAttributes: Option<Simple.Attribute[]> = null;
  protected cursorStack: Stack<RehydratingCursor>;
  private blockDepth = 0;

  // private candidate: Option<Simple.Node> = null;

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error("Rehydration with nextSibling not supported");
    this.candidate = this.currentCursor!.element.firstChild;
    assert(this.candidate && isComment(this.candidate) && this.candidate.nodeValue === '%+block:0%', 'Must have opening comment <!--%+block:0%--> for rehydration.');
  }

  get currentCursor(): Option<RehydratingCursor> {
    return this.cursorStack.current;
  }

  get candidate(): Option<Simple.Node> {
    if (this.currentCursor) {
      return this.currentCursor.candidate!;
    }

    return null;
  }

  set candidate(node: Option<Simple.Node>) {
    this.currentCursor!.candidate = node;
  }

  pushElement(element: Simple.Element, nextSibling: Option<Simple.Node>) {
    let { blockDepth = 0 } = this;
    let cursor = new RehydratingCursor(element, nextSibling, blockDepth);
    let currentCursor = this.currentCursor;
    if (currentCursor) {
      if (currentCursor.candidate) {
        /**
         * <div>   <---------------  currentCursor.element
         *   <!--%+block:1%-->
         *   <div> <---------------  currentCursor.candidate -> cursor.element
         *     <!--%+block:2%--> <-  currentCursor.candidate.firstChild -> cursor.candidate
         *     Foo
         *     <!--%-block:2%-->
         *   </div>
         *   <!--%-block:1%-->  <--  becomes currentCursor.candidate
         */

        // where to rehydrate from if we are in rehydration mode
        cursor.candidate = element.firstChild;
        // where to continue when we pop
        currentCursor.candidate = element.nextSibling;
      }
    }
    this.cursorStack.push(cursor);
  }

  private clearMismatch(candidate: Simple.Node) {
    let current: Option<Simple.Node> = candidate;
    let currentCursor = this.currentCursor;
    if (currentCursor !== null) {
      let openBlockDepth = currentCursor.openBlockDepth;
      if (openBlockDepth >= currentCursor.startingBlockDepth) {
        while (current && !(isComment(current) && getCloseBlockDepth(current) === openBlockDepth)) {
          current = this.remove(current);
        }
        assert(current !== null, 'should have found closing block');
      } else {
        while (current !== null) {
          current = this.remove(current);
        }
      }
      // current cursor parentNode should be openCandidate if element
      // or openCandidate.parentNode if comment
      currentCursor.nextSibling = current;
      // disable rehydration until we popElement or closeBlock for openBlockDepth
      currentCursor.candidate = null;
    }
  }

  __openBlock(): void {
    let { currentCursor } = this;
    if (currentCursor === null) return;

    let blockDepth = this.blockDepth;

    this.blockDepth++;

    let { candidate } = currentCursor;
    if (candidate === null) return;

    if (isComment(candidate) && getOpenBlockDepth(candidate) === blockDepth) {
      currentCursor.candidate = this.remove(candidate);
      currentCursor.openBlockDepth = blockDepth;
    } else {
      this.clearMismatch(candidate);
    }
  }

  __closeBlock(): void {
    let { currentCursor } = this;
    if (currentCursor === null) return;

    // openBlock is the last rehydrated open block
    let openBlockDepth = currentCursor.openBlockDepth;

    // this currently is the expected next open block depth
    this.blockDepth--;

    let { candidate } = currentCursor;
    // rehydrating
    if (candidate !== null) {
      assert(openBlockDepth === this.blockDepth, 'when rehydrating, openBlockDepth should match this.blockDepth here');
      if (isComment(candidate) &&
          getCloseBlockDepth(candidate) === openBlockDepth
        ) {
        currentCursor.candidate = this.remove(candidate);
        currentCursor.openBlockDepth--;
      } else {
        this.clearMismatch(candidate);
      }
    // if the openBlockDepth matches the blockDepth we just closed to
    // then restore rehydration
    }
    if (currentCursor.openBlockDepth === this.blockDepth) {
      assert(
        currentCursor.nextSibling !== null &&
        isComment(currentCursor.nextSibling) &&
        getCloseBlockDepth(currentCursor.nextSibling) === openBlockDepth, "expected close block to match rehydrated open block");
      currentCursor.candidate = this.remove(currentCursor.nextSibling!);
      currentCursor.openBlockDepth--;
    }
  }

  __appendNode(node: Simple.Node): Simple.Node {
    let { candidate } = this;

    // This code path is only used when inserting precisely one node. It needs more
    // comparison logic, but we can probably lean on the cases where this code path
    // is actually used.
    if (candidate) {
      return candidate;
    } else {
      return super.__appendNode(node);
    }
  }

  __appendHTML(html: string): Bounds {
    let candidateBounds = this.markerBounds();

    if (candidateBounds) {
      let first = candidateBounds.firstNode()!;
      let last = candidateBounds.lastNode()!;

      let newBounds = bounds(this.element, first.nextSibling!, last.previousSibling!);

      this.remove(first);
      this.remove(last);

      return newBounds;
    } else {
      return super.__appendHTML(html);
    }
  }

  protected remove(node: Simple.Node): Option<Simple.Node> {
    let element = expect(node.parentNode, `cannot remove a detached node`) as Simple.Element;
    let next = node.nextSibling;
    element.removeChild(node);
    return next;
  }

  private markerBounds(): Option<Bounds> {
    let _candidate = this.candidate;

    if (_candidate && isMarker(_candidate)) {
      let first = _candidate;
      let last = expect(first.nextSibling, `BUG: serialization markers must be paired`);

      while (last && !isMarker(last)) {
        last = expect(last.nextSibling, `BUG: serialization markers must be paired`);
      }

      return bounds(this.element, first, last);
    } else {
      return null;
    }
  }

  __appendText(string: string): Simple.Text {
    let { candidate } = this;

    if (candidate) {
      if (isTextNode(candidate)) {
        candidate.nodeValue = string;
        this.candidate = candidate.nextSibling;
        return candidate;
      } else if (candidate && (isSeparator(candidate) || isEmpty(candidate))) {
        this.candidate = candidate.nextSibling;
        this.remove(candidate);
        return this.__appendText(string);
      } else if (isEmpty(candidate)) {
        let next = this.remove(candidate);
        this.candidate = next;
        let text = this.dom.createTextNode(string);
        this.dom.insertBefore(this.element, text, next);
        return text;
      } else {
        this.clearMismatch(candidate);
        return super.__appendText(string);
      }
    } else {
      return super.__appendText(string);
    }
  }

  __appendComment(string: string): Simple.Comment {
    let _candidate = this.candidate;
    if (_candidate && isComment(_candidate)) {
      // TODO should not rehydrated a special comment
      _candidate.nodeValue = string;
      this.candidate =_candidate.nextSibling;
      return _candidate;
    } else if (_candidate) {
      this.clearMismatch(_candidate);
    }

    return super.__appendComment(string);
  }

  __openElement(tag: string): Simple.Element {
    let _candidate = this.candidate;

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

  __setAttribute(name: string, value: string, namespace: Option<string>): void {
    let unmatched = this.unmatchedAttributes;

    if (unmatched) {
      let attr = findByName(unmatched, name);
      if (attr) {
        attr.value = value;
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }

    return super.__setAttribute(name, value, namespace);
  }

  __setProperty(name: string, value: string): void {
    let unmatched = this.unmatchedAttributes;

    if (unmatched) {
      let attr = findByName(unmatched, name);
      if (attr) {
        attr.value = value;
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }

    return super.__setProperty(name, value);
  }

  __flushElement(parent: Simple.Element, constructing: Simple.Element): void {
    let { unmatchedAttributes: unmatched } = this;
    if (unmatched) {
      for (let i=0; i<unmatched.length; i++) {
        this.constructing!.removeAttribute(unmatched[i].name);
      }
      this.unmatchedAttributes = null;
    } else {
      super.__flushElement(parent, constructing);
    }
  }

  appendCautiousDynamicContent(value: Opaque): DynamicContentWrapper {
    let content = super.appendCautiousDynamicContent(value);
    content.update(this.env, value);
    return content;
  }

  willCloseElement() {
    let { candidate, currentCursor } = this;

    if (candidate !== null) {
      this.clearMismatch(candidate);
    }

    if (currentCursor && currentCursor.injectedOmittedNode) {
      this.popElement();
    }

    super.willCloseElement();
  }

  getMarker(element: HTMLElement, guid: string): Simple.Node {
    let marker = element.querySelector(`script[glmr="${guid}"]`);
    if (marker) {
      return marker;
    }

    throw new Error('Cannot find serialized cursor for `in-element`');
  }

  __pushRemoteElement(element: Simple.Element, cursorId: string, nextSibling: Option<Simple.Node> = null) {
    let marker = this.getMarker(element as HTMLElement, cursorId);

    if (marker.parentNode === element) {
      let currentCursor = this.currentCursor;
      let candidate = currentCursor!.candidate;

      this.pushElement(element, nextSibling);

      currentCursor!.candidate = candidate;
      this.candidate = this.remove(marker);

      let tracker = new RemoteBlockTracker(element);
      this.pushBlockTracker(tracker, true);
    }
  }

  didAppendBounds(bounds: Bounds): Bounds {
    super.didAppendBounds(bounds);
    if (this.candidate) {
      let last = bounds.lastNode();
      this.candidate = last && last.nextSibling;
    }
    return bounds;
  }
}

function isTextNode(node: Simple.Node): node is Simple.Text {
  return node.nodeType === 3;
}

function isComment(node: Simple.Node): node is Simple.Comment {
  return node.nodeType === 8;
}

function getOpenBlockDepth(node: Simple.Comment): Option<number> {
  let boundsDepth = node.nodeValue!.match(/^%\+block:(\d+)%$/);

  if (boundsDepth && boundsDepth[1]) {
    return Number(boundsDepth[1] as string);
  } else {
    return null;
  }
}

function getCloseBlockDepth(node: Simple.Comment): Option<number> {
  let boundsDepth = node.nodeValue!.match(/^%\-block:(\d+)%$/);

  if (boundsDepth && boundsDepth[1]) {
    return Number(boundsDepth[1] as string);
  } else {
    return null;
  }
}

function isElement(node: Simple.Node): node is Simple.Element {
  return node.nodeType === 1;
}

function isMarker(node: Simple.Node): boolean {
  return node.nodeType === 8 && node.nodeValue === '%glimmer%';
}

function isSeparator(node: Simple.Node): boolean {
  return node.nodeType === 8 && node.nodeValue === '%sep%';
}

function isEmpty(node: Simple.Node): boolean {
  return node.nodeType === 8 && node.nodeValue === '%empty%';
}
function isSameNodeType(candidate: Simple.Element, tag: string) {
  if (candidate.namespaceURI === SVG_NAMESPACE) {
    return candidate.tagName === tag;
  }
  return candidate.tagName === tag.toUpperCase();
}

function findByName(array: Simple.Attribute[], name: string): Simple.Attribute | undefined {
  for (let i = 0; i < array.length; i++) {
    let attr = array[i];
    if (attr.name === name) return attr;
  }

  return undefined;
}

export function rehydrationBuilder(env: Environment, cursor: Cursor) {
  return RehydrateBuilder.forInitialRender(env, cursor);
}
