import { InternedString, symbol } from "htmlbars-util";
import { RegionMorph } from './region';
import { ExpressionSyntax, EvaluatedParamsAndHash, Templates } from '../template';
import { Reference, PushPullReference } from 'htmlbars-reference';
import { Frame, Helper, Insertion as PrimitiveInsertion } from '../environment';
import { ElementStack } from '../builder';

import {
  Morph,
  ContentMorph,
  EmptyableMorph,
  SingleNodeBounds,
  ContentMorphConstructor,
  MorphConstructor,
  MorphClass,
  Bounds,
  bounds,
  clear
} from '../morph';

const SAFE_BRAND = symbol("safe string");

type ContentInitOptions = { content: Reference, trustingMorph: boolean };
type ContentInsertion = Morph;
type ContentInsertionConstructor = ContentMorphConstructor<ContentInitOptions>;

class HtmlInsertion extends EmptyableMorph {
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
    super.append(stack);
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

class TextInsertion extends EmptyableMorph {
  private reference: Reference;
  private node: Text = null;
  private lastValue: string = null;

  init({ content }: ContentInitOptions) {
    this.reference = content;
  }

  append(stack: ElementStack) {
    super.append(stack);
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

export const ValueMorph = {
  specialize(options): MorphClass<HtmlInsertion | TextInsertion> {
    if (options.trustingMorph) return HtmlInsertion;
    else return TextInsertion;
  }
}

export class HelperMorph extends EmptyableMorph {
  private reference: Reference;
  private inner: ContentInsertion = null;
  private trustingMorph: boolean;

  init({ content, trustingMorph }: ContentInitOptions) {
    this.reference = content;
    this.trustingMorph = trustingMorph;
  }

  append(stack: ElementStack) {
    super.append(stack);
    let content = <any>this.reference.value();
    let trustingMorph = this.trustingMorph;

    let insertion = insertionForUserContent(content, trustingMorph);
    let inner = this.inner = stack.initializeMorph(insertion, { content: this.reference, trustingMorph });

    inner.append(stack);
  }

  update() {
    this.inner.update();
  }
}

function insertionForUserContent(content: any, trustingMorph: boolean): ContentInsertionConstructor {
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

function insertionForText(text: string, trustingMorph: boolean): ContentInsertionConstructor {
  // if (text === '') { return new EmptyInsertion(); }
  return trustingMorph ? HtmlInsertion : TextInsertion;
}
