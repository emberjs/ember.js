import { getAttrNamespace } from "htmlbars-util";
import { Morph } from "../morph";

export class AttrMorph extends Morph {
  static specialize({ name, value, namespace }) { // jshint ignore:line
    namespace = namespace || getAttrNamespace(name);
    return namespace ? SetAttributeNSMorph : SetAttributeMorph;
  }

  init({ name, value: syntax }) {
    this._name = name;
    this._value = syntax.evaluate(this._frame);
    this._lastValue = false;
    this.isDynamic = true;
  }

  _setLastValue(value) {
    // we should probably disallow certain kinds of values here if we can
    // get away with it.
    if (value === null || value === undefined || value === false) {
      this._lastValue = false;
      return false;
    } else {
      this._lastValue = value;
      return value;
    }
  }
}

class SetAttributeMorph extends AttrMorph {
  append() {
    let contentValue = this._setLastValue(this._value.value());
    atomicSetAttribute(this._frame, this.parentNode, this._name, contentValue);
  }
}

class SetAttributeNSMorph extends AttrMorph {
  init(attrs) {
    super(attrs);
    this._namespace = attrs.namespace;
  }

  append() {
    let contentValue = this._setLastValue(this._value.value());
    atomicSetAttributeNS(this._frame, this.parentNode, this._name, this._namespace, contentValue);
  }
}

export class SetPropertyMorph extends AttrMorph {
  append() {
    let contentValue = this._setLastValue(this._value.value());
    this.parentNode[this._name] = contentValue;
  }
}

// helpers

function atomicSetAttribute(frame, element, name, value) {
  if (value === false) {
    frame.dom().removeAttribute(element, name);
  } else {
    frame.dom().setAttribute(element, name, value);
  }
}

function atomicSetAttributeNS({ env: { dom } }, element, name, namespace, value) {
  if (value === false) {
    dom.removeAttribute(element, name);
  } else {
    dom.setAttributeNS(element, name, namespace, value);
  }
}
