import { symbol } from "htmlbars-util";
import { RegionMorph } from './region';
import { ExpressionSyntax, EvaluatedParamsAndHash, Templates } from '../template';
import { Reference, InternedString, PushPullReference } from 'htmlbars-reference';
import { Helper, Insertion as PrimitiveInsertion } from '../environment';

const SAFE_BRAND = symbol("safe string");

abstract class Insertion {
  
}

class HtmlInsertion extends Insertion {
  private html: string;
  
  constructor(content: string) {
    super();
    this.html = content;
  }
}

class TextInsertion extends Insertion {
  private text: string;
  
  constructor(text: string) {
    super();
    this.text = text;
  }
}

export class ValueMorph extends RegionMorph {
  private lastResult: Insertion = null;
  private lastValue: any = null;
  private reference: Reference;
  private InsertionType: typeof Insertion;
  
  init({ ref, trustingMorph }: { ref: ExpressionSyntax, trustingMorph: boolean }) {
    super.init();
    this.lastResult = null;
    this.reference = ref.evaluate(this.frame);
    this.InsertionType = trustingMorph ? HtmlInsertion : TextInsertion;
  }

  append() {
    
  }
  
  update() {
    
  }

  render() {
    let value = this.lastValue = this.reference.value();
  }
}

class HelperInvocationReference extends PushPullReference {
  private helper: Helper;
  private args: EvaluatedParamsAndHash;

  constructor(helper: Helper, args: EvaluatedParamsAndHash) {
    super();
    this.helper = helper;
    this.args = this._addSource(args);
  }
  
  value(): PrimitiveInsertion {
    let { helper, args }  = this;
    let { params, hash } = args.value();
    return helper(params, hash);
  }
}

export class HelperMorph extends RegionMorph {
  private trustingMorph: boolean;
  private invocation: HelperInvocationReference;

  init({ path, args, trustingMorph }: { path: InternedString[], args: EvaluatedParamsAndHash, trustingMorph: boolean }) {
    super.init();
    let helper = this.frame.lookupHelper(path);
    this.invocation = new HelperInvocationReference(helper, args);
    this.trustingMorph = trustingMorph;
  }

  append() {
    let insertion = insertionForUserContent(this.invocation.value(), this.trustingMorph);
    
  }

  render() {
    let { _region, _helper, _trustingMorph } = this;
    _region.replace(insertionForUserContent(_helper.value(), _trustingMorph));
  }
}

// helpers

function insertionForUserContent(content: PrimitiveInsertion, trustingMorph: boolean) {
  switch (typeof content) {
    case 'string':
      return insertionForText(content, trustingMorph);
    case 'object':
      if (content[SAFE_BRAND]) { return new HtmlInsertion(content); }
      if ((<Node>content).nodeType)    { return new NodeInsertion(content); }
      /* falls through */
    default:
      throw new Error(`Helpers must return strings or safe strings, not ${content}`);
  }
}

function insertionForText(text, trustingMorph) {
  if (text === '') { return new EmptyInsertion(); }
  return trustingMorph ? new HtmlInsertion(text) : new TextInsertion(text);
}
