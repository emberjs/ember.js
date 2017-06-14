import { NewElementBuilder, ElementBuilder, ElementOperations } from "./element-builder";

import { Environment } from '../environment';
import Bounds, { bounds } from '../bounds';
import { Simple, Option, Opaque } from "@glimmer/interfaces";
import { DynamicContentWrapper } from './content/dynamic';
import { expect } from "@glimmer/util";

export class RehydrateBuilder extends NewElementBuilder implements ElementBuilder {
  private candidate: Option<Simple.Node>;
  private unmatchedAttributes: Option<Simple.Attribute[]> = null;

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error("Rehydration with nextSibling not supported");
    this.candidate = parentNode.firstChild;
  }

  reportMismatch(node: Opaque) {
    // console.log(`MISMATCH`, `expected`, this.candidate, `got`, node);
  }

  reportMatch() {
    // console.log(`   MATCH`, this.candidate);
  }

  __appendNode(node: Simple.Node): Simple.Node {
    let { candidate } = this;

    if (candidate) {
      this.reportMatch();
      return candidate;
    } else {
      this.reportMismatch(node);
      return super.__appendNode(node);
    }
  }

  __appendHTML(html: string): Bounds {
    let candidateBounds = this.markerBounds();

    if (candidateBounds) {
      this.reportMatch();
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
    let { candidate } = this;

    if (candidate && isMarker(candidate)) {
      let first = candidate;
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

    if (candidate && isTextNode(candidate)) {
      this.reportMatch();
      candidate.nodeValue = string;
      return candidate;
    } else if (candidate && isSeparator(candidate)) {
      this.candidate = candidate.nextSibling;
      remove(candidate);
      return this.__appendText(string);
    } else {
      this.reportMismatch(string);
      return super.__appendText(string);
    }
  }

  __appendComment(string: string): Simple.Comment {
    let { candidate } = this;

    if (candidate && isComment(candidate)) {
      this.reportMatch();
      candidate.nodeValue = string;
      return candidate;
    } else {
      this.reportMismatch(string);
      this.candidate = null;
      return super.__appendComment(string);
    }
  }

  __openElement(tag: string, _operations?: ElementOperations): Simple.Element {
    let { candidate } = this;

    if (candidate && isElement(candidate) && candidate.tagName === tag.toUpperCase()) {
      this.reportMatch();
      this.unmatchedAttributes = [].slice.call(candidate.attributes);
      return candidate;
    } else {
      this.reportMismatch(tag);
      this.candidate = null;
      return super.__openElement(tag);
    }
  }

  __setAttribute(name: string, value: string, namespace: Option<string>): void {
    let unmatched = this.unmatchedAttributes!;
    let attr = unmatched.find(a => a.name === name);

    if (attr) {
      attr.value = value;
      unmatched.splice(unmatched.indexOf(attr), 1);
    } else {
      super.__setAttribute(name, value, namespace);
    }
  }

  __setProperty(name: string, value: string): void {
    let unmatched = this.unmatchedAttributes!;
    let attr = unmatched.find(a => a.name === name);

    if (attr) {
      unmatched.splice(unmatched.indexOf(attr), 1);
    }

    super.__setProperty(name, value);
  }

  __flushElement(parent: Simple.Element, constructing: Simple.Element): void {
    let { candidate, unmatchedAttributes: unmatched } = this;

    if (candidate) {
      for (let i=0; i<unmatched!.length; i++) {
        this.constructing!.removeAttribute(unmatched![i].name);
      }
      this.unmatchedAttributes = null;
    } else {
      this.reportMismatch(null);
      super.__flushElement(parent, constructing);
    }
  }

  appendCautiousDynamicContent(value: Opaque): DynamicContentWrapper {
    let content = super.appendCautiousDynamicContent(value);
    content.update(this.env, value);
    return content;
  }

  willCloseElement() {
    this.candidate = this.element.nextSibling;
    super.willCloseElement();
  }

  pushRemoteElement(element: Simple.Element, nextSibling: Option<Simple.Node> = null) {
    throw unimplemented();
  }

  popRemoteElement() {
    throw unimplemented();
  }

  didAppendNode<T extends Simple.Node>(node: T): T {
    console.log(node);
    super.didAppendNode(node);
    this.candidate = node.nextSibling;
    return node;
  }

  didAppendBounds(bounds: Bounds): Bounds {
    super.didAppendBounds(bounds);
    let last = bounds.lastNode();
    this.candidate = last && last.nextSibling;
    return bounds;
  }

  didOpenElement(element: Simple.Element): Simple.Element {
    super.didOpenElement(element);
    this.candidate = element.firstChild;
    return element;
  }
}

function isTextNode(node: Simple.Node): node is Simple.Text {
  return node.nodeType === 3;
}

function isComment(node: Simple.Node): node is Simple.Comment {
  return node.nodeType === 8;
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

function remove(node: Simple.Node): void {
  let element = expect(node.parentNode, `cannot remove a detached node`) as Simple.Element;
  element.removeChild(node);
}

function unimplemented() {
  return new Error('Not implemented');
}
