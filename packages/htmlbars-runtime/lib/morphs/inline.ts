import { symbol } from "htmlbars-util";
import { RegionMorph } from './region';
import { ExpressionSyntax, ParamsAndHash, Templates } from '../template';
import { Reference, InternedString, PushPullReference } from 'htmlbars-reference';
import { Helper } from '../environment';

const SAFE_BRAND = symbol("safe string");

abstract class Insertion {
  
}

class HtmlInsertion extends Insertion {
  
}

class TextInsertion extends Insertion {
  
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
  constructor(helper: Helper, params: ParamsAndHash) {
    super();
  }
  
  value(): any {
    
  }
}

export class HelperMorph extends RegionMorph {
  private trustingMorph: boolean;
  private helper: HelperInvocationReference;
  
  init({ path, params, trustingMorph }: { path: InternedString[], params: ParamsAndHash, templates: Templates }) {
    super.init();
    let helper = this.frame.lookupHelper(path);
    this._helper = HelperInvocationReference.fromStatements({ helper, params, frame: frame });
    this.trustingMorph = trustingMorph;
  }

  render() {
    let { _region, _helper, _trustingMorph } = this;
    _region.replace(insertionForUserContent(_helper.value(), _trustingMorph));
  }
}

// helpers

function insertionForUserContent(content, trustingMorph) {
  switch (typeof content) {
    case 'string':
      return insertionForText(content, trustingMorph);
    case 'object':
      if (content[SAFE_BRAND]) { return new HtmlInsertion(content); }
      if (content.nodeType)    { return new NodeInsertion(content); }
      /* falls through */
    default:
      throw new Error(`Helpers must return strings or safe strings, not ${content}`);
  }
}

function insertionForText(text, trustingMorph) {
  if (text === '') { return new EmptyInsertion(); }
  return trustingMorph ? new HtmlInsertion(text) : new TextInsertion(text);
}
