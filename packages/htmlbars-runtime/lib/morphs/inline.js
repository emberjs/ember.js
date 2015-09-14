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
  init({ ref, trustingMorph }) {
    super.init();
    this._lastResult = null;
    this._ref = ref.evaluate(this._frame);
    this._InsertionType = trustingMorph ? HtmlInsertion : TextInsertion;
  }

  append() {
    let value = this._lastValue = this._ref.value();
    this._region.append(new this._InsertionType(value));
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

  append() {
    let { _region, _helper, _trustingMorph } = this;
    _region.append(insertionForUserContent(_helper.value(), _trustingMorph));
  }

  update() {
    let { _region, _helper, _trustingMorph } = this;
    _region.update(insertionForUserContent(_helper.value(), _trustingMorph));
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
      throw new Error("Helpers must return strings or safe strings");
  }
}

function insertionForText(text, trustingMorph) {
  if (text === '') { return new EmptyInsertion(); }
  return trustingMorph ? new HtmlInsertion(text) : new TextInsertion(text);
}
