import { symbol } from "../../htmlbars-util";
import { HelperInvocationReference } from '../reference';

import {
  HtmlInsertion,
  TextInsertion,
  NodeInsertion,
  EmptyInsertion,
  RegionMorph,
} from "./region";

const SAFE_BRAND = symbol("safe string");

export class ValueMorph extends RegionMorph {
  init({ ref: syntax, trustingMorph }) {
    super.init();
    this._lastResult = null;
    this._ref = syntax.evaluate(this._frame);
    this._InsertionType = trustingMorph ? HtmlInsertion : TextInsertion;
  }

  render() {
    let value = this._lastValue = this._ref.value();
    this._region.replace(new this._InsertionType(value));
  }
}

export class HelperMorph extends RegionMorph {
  init({ path, params, trustingMorph }) {
    super.init();
    let { _frame } = this;
    let helper = this._frame.lookupHelper(path);
    this._helper = HelperInvocationReference.fromStatements({ helper, params,  frame: _frame });
    this._trustingMorph = trustingMorph;
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
