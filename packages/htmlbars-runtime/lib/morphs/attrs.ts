import { InternedString, getAttrNamespace } from "htmlbars-util";
import { Morph } from "../morph";
import { Reference } from 'htmlbars-reference';
import { ExpressionSyntax } from '../template';
import { Frame } from '../environment';

interface AttrMorphOptions {
  name: InternedString;
  value: ExpressionSyntax;
  namespace?: InternedString;
}

export class AttrMorph extends Morph {
  static specialize({ name, value, namespace }: AttrMorphOptions): typeof AttrMorph {
    namespace = namespace || getAttrNamespace(name);
    return <any>(namespace ? SetAttributeNSMorph : SetAttributeMorph);
  }

  protected name: InternedString;
  protected value: Reference;
  protected lastValue: any = false;

  init({ name, value }: AttrMorphOptions) {
    this.name = name;
    this.value = value.evaluate(this.frame);
  }

  _setLastValue(value) {
    // we should probably disallow certain kinds of values here if we can
    // get away with it.
    if (value === null || value === undefined || value === false) {
      this.lastValue = false;
      return false;
    } else {
      this.lastValue = value;
      return value;
    }
  }

  append() {}
  update() {}
  destroy() {}
}

class SetAttributeMorph extends AttrMorph {
  append() {
    let contentValue = this._setLastValue(this.value.value());
    atomicSetAttribute(this.frame, this.parentNode, this.name, contentValue);
  }
}

interface SetAttributeNSMorphOptions extends AttrMorphOptions {
  namespace: InternedString;
}

class SetAttributeNSMorph extends AttrMorph {
  private namespace: InternedString;

  init(attrs: SetAttributeNSMorphOptions) {
    super.init(attrs);
    this.namespace = attrs.namespace;
  }

  append() {
    let contentValue = this._setLastValue(this.value.value());
    atomicSetAttributeNS(this.frame, this.parentNode, this.name, this.namespace, contentValue);
  }
}

export class SetPropertyMorph extends AttrMorph {
  append() {
    let contentValue = this._setLastValue(this.value.value());
    this.parentNode[<string>this.name] = contentValue;
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

function atomicSetAttributeNS(frame: Frame, element, name, namespace, value) {
  if (value === false) {
    frame.dom().removeAttribute(element, name);
  } else {
    frame.dom().setAttributeNS(element, name, namespace, value);
  }
}
