import { InternedString, symbol } from "htmlbars-util";
import { RegionMorph } from './region';
import { ExpressionSyntax, EvaluatedParamsAndHash, Templates } from '../template';
import { Reference, PushPullReference } from 'htmlbars-reference';
import { Frame, Helper, Insertion as PrimitiveInsertion } from '../environment';
import { Morph, MorphConstructor, Bounds, bounds, clear } from '../morph';
import { ElementStack } from '../builder';

const SAFE_BRAND = symbol("safe string");

type ContentInitOptions = { content: Reference, trustingMorph: boolean };
type ContentInsertion = Morph<ContentInitOptions>;
type ContentInsertionConstructor = MorphConstructor<ContentInitOptions>;

class HtmlInsertion extends Morph<ContentInitOptions> {
  private reference: Reference;
  private lastBounds: Bounds = null;
  private lastValue: string = null;
  public parentNode: HTMLElement;

  init({ content }: ContentInitOptions) {
    this.reference = content;

    if (!(this.parentNode instanceof HTMLElement)) {
      throw new Error(`You cannot insert HTML (using triple-curlies or htmlSafe) into an SVG context: ${this.parentNode.tagName}`)
    }
  }

  append(stack: ElementStack) {
    let html = this.lastValue = <string>this.reference.value();
    this.lastBounds = stack.insertHTMLBefore(null, html);
  }

  update() {
    let html = <string>this.reference.value();

    if (this.lastValue !== html) {
      let nextSibling = clear(this.lastBounds);
      let { first, last } = this.frame.dom().insertHTMLBefore(this.parentNode, nextSibling, html);
      this.lastBounds = bounds(this.parentNode, first, last);
      this.lastValue = html;
    }
  }
}

class TextInsertion extends Morph<ContentInitOptions> {
  private reference: Reference;
  private lastNode: Text = null;
  private lastValue: string = null;

  init({ content }: ContentInitOptions) {
    this.reference = content;
  }

  append(stack: ElementStack) {
    let text = this.lastValue = <string>this.reference.value();
    this.lastNode = stack.appendText(text);
  }

  update() {
    let text = <string>this.reference.value();
    if (text !== this.lastValue) {
      this.lastValue = text;
      this.lastNode.nodeValue = text;
    }
  }
}

export const ValueMorph = {
  specialize(options: ContentInitOptions): ContentInsertionConstructor {
    if (options.trustingMorph) return HtmlInsertion;
    else return TextInsertion;
  }
}

export class HelperMorph extends Morph<any> {
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
    let inner = stack.initializeMorph<ContentInitOptions>(insertion, { content: this.reference, trustingMorph });

    inner.append(stack);
  }

  update() {

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
