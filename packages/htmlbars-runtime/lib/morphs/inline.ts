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
    let html = this.lastValue = <string>this.reference.value();
    this.initializeBounds(stack.insertHTMLBefore(null, html));
  }

  update() {
    let html = <string>this.reference.value();

    if (this.lastValue !== html) {
      this.replaceWithBounds(this.frame.dom().insertHTMLBefore(this.parentNode, this.nextSibling(), html))
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
    let text = this.lastValue = <string>this.reference.value();
    let node = this.node = stack.appendText(text);
    this.initializeBounds(new SingleNodeBounds(this.parentNode, node));
  }

  update() {
    let text = <string>this.reference.value();

    if (text === '' || text === null || text === undefined) {
      this.empty();
    } else if (text !== this.lastValue) {
      this.lastValue = text;
      this.node.nodeValue = text;
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
    let content = <any>this.reference.value();
    let trustingMorph = this.trustingMorph;

    let insertion = insertionForUserContent(content, trustingMorph);
    let inner = this.inner = stack.initializeMorph<ContentInitOptions>(insertion, { content: this.reference, trustingMorph });

    inner.append(stack);
  }

  update() {
    this.inner.update();
  }
}

// export class ValueMorph extends RegionMorph<{ ref: ExpressionSyntax, trustingMorph: boolean }> {
//   private lastResult: ContentInsertion = null;
//   private lastValue: any = null;
//   private lastNode: Text = null;
//   private reference: Reference;
//   private InsertionType: ContentInsertionConstructor;

//   init({ ref, trustingMorph }: { ref: ExpressionSyntax, trustingMorph: boolean }) {
//     this.lastResult = null;
//     this.reference = ref.evaluate(this.frame);
//     this.InsertionType = trustingMorph ? HtmlInsertion : TextInsertion;
//   }

//   append(stack: ElementStack) {
//     let value = this.reference.value();
//     let insertion = this.lastResult = stack.initializeMorph(this.InsertionType, { content: this.reference.value() });
//     insertion.append(stack);
//   }

//   update() {
//     let value = this.reference.value();
//     if (value !== this.lastValue) {
//       this.lastResult.update();
//     }
//   }

//   render() {
//     let value = this.lastValue = this.reference.value();
//   }
// }


// export class HelperMorph extends RegionMorph {
//   private trustingMorph: boolean;
//   private invocation: HelperInvocationReference;

//   init({ path, args, trustingMorph }: { path: InternedString[], args: EvaluatedParamsAndHash, trustingMorph: boolean }) {
//     super.init();
//     let helper = this.frame.lookupHelper(path);
//     this.invocation = new HelperInvocationReference(helper, args);
//     this.trustingMorph = trustingMorph;
//   }

//   append() {
//     let insertion = insertionForUserContent(this.invocation.value(), this.trustingMorph);

//   }

//   render() {
//     let { _region, _helper, _trustingMorph } = this;
//     _region.replace(insertionForUserContent(_helper.value(), _trustingMorph));
//   }
// }

// helpers

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
