import { InternedString, symbol } from "htmlbars-util";
import { ExpressionSyntax, EvaluatedParamsAndHash, Templates } from '../template';
import { Reference, PushPullReference } from 'htmlbars-reference';
import { Frame, Helper, Insertion as PrimitiveInsertion } from '../environment';
import { ElementStack } from '../builder';

import {
  Morph,
  ContentMorph,
  EmptyableMorph,
  SingleNodeBounds,
  MorphConstructor,
  MorphClass,
  Bounds,
  bounds,
  createMorph,
  clear
} from '../morph';

const SAFE_BRAND = symbol("safe string");

type ContentInitOptions = { content: Reference, trustingMorph: boolean };

export abstract class InsertionMorph extends EmptyableMorph {
  static specialize(options): MorphConstructor<HtmlInsertion | TextInsertion, ContentInitOptions> {
    if (options.trustingMorph) return HtmlInsertion;
    else return TextInsertion;
  }
}

class HtmlInsertion extends InsertionMorph {
  private reference: Reference;
  private lastValue: string = null;
  public parentNode: HTMLElement & Element;

  init({ content }: ContentInitOptions) {
    this.reference = content;

    if (!(this.parentNode instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.parentNode.tagName}`)
    }
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
    let html = this.lastValue = <string>this.reference.value();
    this.didInsertContent(stack.insertHTMLBefore(null, html));
  }

  update() {
    let html = <string>this.reference.value();

    if (this.lastValue !== html) {
      let nextSibling = this.nextSiblingForContent();
      this.didInsertContent(this.frame.dom().insertHTMLBefore(this.parentNode, nextSibling, html))
      this.lastValue = html;
    }
  }
}

class TextInsertion extends InsertionMorph {
  private reference: Reference;
  private node: Text = null;
  private lastValue: string = null;

  init({ content }: ContentInitOptions) {
    this.reference = content;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
    let text = this.lastValue = <string>this.reference.value();
    let node = this.node = stack.appendText(text);
    this.didInsertContent(new SingleNodeBounds(this.parentNode, node));
  }

  update() {
    let text = <string>this.reference.value();

    if (text === '' || text === null || text === undefined) {
      this.didBecomeEmpty();
    } else if (text !== this.lastValue) {
      this.lastValue = text;
      (<Node>this.node).nodeValue = text;
    }
  }
}

export class HelperMorph extends EmptyableMorph {
  private reference: Reference;
  private inner: InsertionMorph = null;
  private trustingMorph: boolean;

  init({ content, trustingMorph }: ContentInitOptions) {
    this.reference = content;
    this.trustingMorph = trustingMorph;
  }

  append(stack: ElementStack) {
    this.willAppend(stack);
    let content = <any>this.reference.value();
    let trustingMorph = this.trustingMorph;

    let insertion = insertionForUserContent(content, trustingMorph);
    let inner = this.inner = createMorph(insertion, this.parentNode, this.frame, { content: this.reference, trustingMorph });

    inner.append(stack);
  }

  update() {
    this.inner.update();
  }
}

function insertionForUserContent(content: any, trustingMorph: boolean): typeof InsertionMorph {
  switch (typeof content) {
    case 'string':
      return insertionForText(content, trustingMorph);
    case 'object':
      if (<string>SAFE_BRAND in content) { return HtmlInsertion; }
      // if ((<Node>content).nodeType)    { return NodeInsertion; }
      /* falls through */
    default:
      throw new Error(`Helpers must return strings or safe strings, not ${content}`);
  }
}

function insertionForText(text: string, trustingMorph: boolean): typeof HtmlInsertion | typeof TextInsertion {
  // if (text === '') { return new EmptyInsertion(); }
  return trustingMorph ? HtmlInsertion : TextInsertion;
}
