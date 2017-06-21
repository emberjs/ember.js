import { NewElementBuilder, ElementBuilder, ElementOperations } from "./element-builder";

import { Environment } from '../environment';
import Bounds, { bounds } from '../bounds';
import { Simple, Option, Opaque } from "@glimmer/interfaces";
import { DynamicContentWrapper } from './content/dynamic';
import { expect, assert } from "@glimmer/util";

export class RehydrateBuilder extends NewElementBuilder implements ElementBuilder {
  // The node that will be compared against the last operation
  private _candidate: Option<Simple.Node>;

  // The last node that matched
  private lastMatchedNode: Option<Simple.Node> = null;
  private unmatchedAttributes: Option<Simple.Attribute[]> = null;
  private blockDepth = 0;

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error("Rehydration with nextSibling not supported");
    this._candidate = parentNode.firstChild;
  }

  get candidate(): Option<Simple.Node> {
    let candidate = this._candidate;
    if (!candidate) return null;

    if (isComment(candidate) && getCloseBoundsDepth(candidate) === this.blockDepth) {
      return null;
    } else {
      return candidate;
    }
  }

  private clearMismatch(candidate: Simple.Node) {
    if (isComment(candidate)) {
      let depth = getOpenBoundsDepth(candidate);

      if (depth !== null) {
        this.clearBlock(depth);
        return;
      }
    }

    let current: Option<Simple.Node> = candidate;
    let until = this.nextSibling;

    while (current && current !== until) {
      current = remove(current);
    }

    this._candidate = null;
  }

  private clearBlock(depth: number) {
    let current: Option<Simple.Node> = this._candidate;

    while (current && !(isComment(current) && getCloseBoundsDepth(current) === depth)) {
      current = remove(current);
    }

    assert(current && isComment(current) && getCloseBoundsDepth(current) === depth, 'An opening block should be paired with a closing block comment');

    this._candidate = remove(current!);
  }

  __openBlock(): void {
    let { candidate } = this;

    if (candidate) {
      if (isComment(candidate)) {
        let depth = getOpenBoundsDepth(candidate);
        if (depth !== null) this.blockDepth = depth;
        this._candidate = remove(candidate);
        return;
      } else {
        this.clearMismatch(candidate);
      }
    }
  }

  __closeBlock(): void {
    let { _candidate: candidate } = this;

    if (candidate) {
      if (isComment(candidate)) {
        let depth = getCloseBoundsDepth(candidate);
        if (depth !== null) this.blockDepth = depth - 1;
        this._candidate = remove(candidate);
        return;
      } else {
        this.clearMismatch(candidate);
      }
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

      remove(first);
      remove(last);

      return newBounds;
    } else {
      return super.__appendHTML(html);
    }
  }

  private markerBounds(): Option<Bounds> {
    let { _candidate } = this;

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
      if (isEmpty(candidate)) {
        let next = this._candidate = remove(candidate);
        let text = this.dom.createTextNode(string);
        this.dom.insertBefore(this.element, text, next);
        return text;
      }

      if (isTextNode(candidate)) {
        candidate.nodeValue = string;
        this.lastMatchedNode = candidate;
        this._candidate = candidate.nextSibling;
        return candidate;
      } else if (candidate && (isSeparator(candidate) || isEmpty(candidate))) {
        this._candidate = candidate.nextSibling;
        remove(candidate);
        return this.__appendText(string);
      } else {
        this.clearMismatch(candidate);
        return super.__appendText(string);
      }
    } else {
      return super.__appendText(string);
    }
  }

  __appendComment(string: string): Simple.Comment {
    let { _candidate } = this;

    if (_candidate && isComment(_candidate)) {
      _candidate.nodeValue = string;
      this.lastMatchedNode = _candidate;
      this._candidate = _candidate.nextSibling;
      return _candidate;
    } else if (_candidate) {
      this.clearMismatch(_candidate);
    }

    return super.__appendComment(string);
  }

  __openElement(tag: string, _operations?: ElementOperations): Simple.Element {
    let { _candidate } = this;

    if (_candidate && isElement(_candidate) && _candidate.tagName === tag.toUpperCase()) {
      this.unmatchedAttributes = [].slice.call(_candidate.attributes);
      this._candidate = _candidate.firstChild;
      return _candidate;
    } else if (_candidate) {
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
    let { candidate } = this;

    if (candidate) {
      this.clearMismatch(candidate);
    }

    this._candidate = this.element.nextSibling;
    this.lastMatchedNode = this.element;
    super.willCloseElement();
  }

  pushRemoteElement(element: Simple.Element, nextSibling: Option<Simple.Node> = null) {
    throw unimplemented();
  }

  popRemoteElement() {
    throw unimplemented();
  }

  didAppendBounds(bounds: Bounds): Bounds {
    super.didAppendBounds(bounds);
    let last = bounds.lastNode();
    this._candidate = last && last.nextSibling;
    return bounds;
  }

  didOpenElement(element: Simple.Element): Simple.Element {
    super.didOpenElement(element);
    this._candidate = element.firstChild;
    return element;
  }

  // finalize(): void {
  //   super.finalize();

  //   let next = this.lastMatchedNode && this.lastMatchedNode.nextSibling;

  //   if (next) clear(bounds(this.element, next, this.element.lastChild!));
  // }
}

function isTextNode(node: Simple.Node): node is Simple.Text {
  return node.nodeType === 3;
}

function isComment(node: Simple.Node): node is Simple.Comment {
  return node.nodeType === 8;
}

function getOpenBoundsDepth(node: Simple.Comment): Option<number> {
  let boundsDepth = node.nodeValue!.match(/^%\+bounds:(\d+)%$/);

  if (boundsDepth && boundsDepth[1]) {
    return Number(boundsDepth[1] as string);
  } else {
    return null;
  }
}

function getCloseBoundsDepth(node: Simple.Comment): Option<number> {
  let boundsDepth = node.nodeValue!.match(/^%\-bounds:(\d+)%$/);

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

function remove(node: Simple.Node): Option<Simple.Node> {
  let element = expect(node.parentNode, `cannot remove a detached node`) as Simple.Element;
  let next = node.nextSibling;
  element.removeChild(node);
  return next;
}

function findByName(array: Simple.Attribute[], name: string): Simple.Attribute | undefined {
  for (let i = 0; i < array.length; i++) {
    let attr = array[i];
    if (attr.name === name) return attr;
  }

  return undefined;
}

function unimplemented() {
  return new Error('Not implemented');
}
