import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { FIXME, InternedString, dict } from 'glimmer-util';
import { PathReference, Reference, isConst as isConstReference } from 'glimmer-reference';
import { DOMHelper } from '../../dom';
import { NULL_REFERENCE } from '../../references';
import { ValueReference } from '../../compiled/expressions/value';

abstract class DOMUpdatingOpcode extends UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class TextOpcode extends Opcode {
  public type = "text";
  public text: InternedString;

  constructor({ text }: { text: InternedString }) {
    super();
    this.text = text;
  }

  evaluate(vm: VM) {
    vm.stack().appendText(this.text);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.text)]
    };
  }
}

export class OpenPrimitiveElementOpcode extends Opcode {
  public type = "open-primitive-element";
  public tag: InternedString;

  constructor({ tag }: { tag: InternedString }) {
    super();
    this.tag = tag;
  }

  evaluate(vm: VM) {
    vm.stack().openElement(this.tag);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.tag)]
    };
  }
}

export class OpenDynamicPrimitiveElementOpcode extends Opcode {
  public type = "open-dynamic-primitive-element";

  evaluate(vm: VM) {
    let tagName = vm.frame.getOperand().value() as FIXME<'user string to InternedString'>;
    vm.stack().openElement(tagName);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

class ClassList {
  private list: Reference<string>[] = null;
  private isConst = true;

  append(reference: Reference<string>) {
    let { list, isConst } = this;

    if (list === null) list = this.list = [];

    list.push(reference);
    this.isConst = isConst && isConstReference(reference);
  }

  toReference(): Reference<string> {
    let { list, isConst } = this;

    if (!list) return NULL_REFERENCE;

    if (isConst) return new ValueReference(toClassName(list));

    return new ClassListReference(list);
  }

}

class ClassListReference implements Reference<string> {
  private list: Reference<string>[] = [];

  constructor(list: Reference<string>[]) {
    this.list = list;
  }

  value(): string {
    return toClassName(this.list);
  }

  isDirty() { return true; }
  destroy() {}
}

function toClassName(list: Reference<string>[]) {
  let ret = [];

  for (let i = 0; i < list.length; i++) {
    let value = list[i].value();
    if (value !== null) ret.push(value);
  }

  return (ret.length === 0) ? null : ret.join(' ');
}

export class CloseElementOpcode extends Opcode {
  public type = "close-element";

  evaluate(vm: VM) {
    let dom = vm.env.getDOM();
    let stack = vm.stack();
    let { element, elementOperations: { groups } } = stack;

    let classList = new ClassList();
    let flattened = dict<ElementOperation>();
    let flattenedKeys = [];

    // This is a hardcoded merge strategy:
    // 1. Classes are merged together split by whitespace
    // 2. Other attributes are first-write-wins (which means invocation
    //    wins over top-level element in components)

    for (let i = 0; i < groups.length; i++) {
      for (let j = 0; j < groups[i].length; j++) {
        let op = groups[i][j];
        let name = op['name'] as FIXME<string>;
        let reference = op['reference'] as FIXME<Reference<string>>;
        if (name === 'class') {
          classList.append(reference);
        } else if (!flattened[name]) {
          flattenedKeys.push(name);
          flattened[name] = op;
        }
      }
    }

    let className = classList.toReference();

    if (isConstReference(className)) {
      let value = className.value();
      if (value !== null) dom.setAttribute(element, 'class', value);
    } else {
      vm.updateWith(new NonNamespacedAttribute('class' as InternedString, className).flush(dom, element));
    }

    for (let k = 0; k < flattenedKeys.length; k++) {
      let opcode = flattened[flattenedKeys[k]].flush(dom, element);
      if (opcode) vm.updateWith(opcode);
    }

    stack.closeElement();
  }
}

export class StaticAttrOpcode extends Opcode {
  public type = "static-attr";
  public name: InternedString;
  public value: ValueReference<string>;
  public namespace: InternedString;

  constructor({ name, value, namespace }: { name: InternedString, value: InternedString, namespace: InternedString }) {
    super();
    this.name = name;
    this.value = new ValueReference(value);
    this.namespace = namespace;
  }

  evaluate(vm: VM) {
    let { name, value, namespace } = this;

    if (namespace) {
      vm.stack().setAttributeNS(name, value, namespace);
    } else {
      vm.stack().setAttribute(name, value);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name, value, namespace } = this;

    let details = dict<string>();

    details["name"] = JSON.stringify(name);
    details["value"] = JSON.stringify(value.value());

    if (namespace) {
      details["namespace"] = JSON.stringify(namespace);
    }

    return { guid, type, details };
  }
}

export interface ElementOperation {
  flush(dom: DOMHelper, element: Element): UpdatingOpcode;
}

interface ElementPatchOperation extends ElementOperation {
  apply(dom: DOMHelper, element: Element, lastValue: any): any;
  toJSON(): string[];
}

export class NamespacedAttribute implements ElementPatchOperation {
  name: InternedString;
  reference: Reference<string>;
  namespace: InternedString;

  constructor(name: InternedString, reference: Reference<string>, namespace: InternedString) {
    this.name = name;
    this.reference = reference;
    this.namespace = namespace;
  }

  flush(dom: DOMHelper, element: Element): PatchElementOpcode {
    let { reference } = this;
    let value = this.apply(dom, element);

    if (!isConstReference(reference)) {
      return new PatchElementOpcode(element, this, value);
    }
  }

  apply(dom: DOMHelper, element: Element, lastValue: string = null): any {
    let {
      name,
      reference,
      namespace
    } = this;

    let value = reference.value();

    if (value === lastValue) {
      return lastValue;
    } else if (value === null) {
      dom.removeAttributeNS(element, name, namespace);
    } else {
      dom.setAttributeNS(element, name, value, namespace);
      return value;
    }
  }

  toJSON(): string[] {
    return ['AttributeNS', this.name];
  }
}

export class NonNamespacedAttribute implements ElementPatchOperation {
  name: InternedString;
  reference: Reference<string>;

  constructor(name: InternedString, value: Reference<string>) {
    this.name = name;
    this.reference = value;
  }

  flush(dom: DOMHelper, element: Element): PatchElementOpcode {
    let { reference } = this;
    let value = this.apply(dom, element);

    if (!isConstReference(reference)) {
      return new PatchElementOpcode(element, this, value);
    }
  }

  apply(dom: DOMHelper, element: Element, lastValue: any = null): any {
    let { name, reference } = this;
    let value = reference.value();

    if (value === lastValue) {
      return lastValue;
    } else if (value === null) {
      dom.removeAttribute(element, name);
    } else {
      dom.setAttribute(element, name, value);
      return value;
    }
  }

  toJSON(): string[] {
    return ['Attribute', this.name];
  }
}

export class Property implements ElementPatchOperation {
  name: InternedString;
  reference: PathReference<any>;

  constructor(name: InternedString, value: PathReference<any>) {
    this.name = name;
    this.reference = value;
  }

  flush(dom: DOMHelper, element: Element): PatchElementOpcode {
    let { reference } = this;
    let value = this.apply(dom, element);

    if (!isConstReference(reference)) {
      return new PatchElementOpcode(element, this, value);
    }
  }

  apply(dom: DOMHelper, element: Element, lastValue: any = null): any {
    let { name, reference } = this;
    let value = reference.value();

    if (value === lastValue) {
      return lastValue;
    } else {
      dom.setProperty(element, name, value);
      return value;
    }
  }

  toJSON(): string[] {
    return ['Property', this.name];
  }
}

export class DynamicAttrNSOpcode extends Opcode {
  public type = "dynamic-attr";
  public name: InternedString;
  public namespace: InternedString;

  constructor({ name, namespace }: { name: InternedString, namespace: InternedString }) {
    super();
    this.name = name;
    this.namespace = namespace;
  }

  evaluate(vm: VM) {
    let { name, namespace } = this;
    let reference = vm.frame.getOperand();
    vm.stack().setAttributeNS(name, reference, namespace);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name, namespace } = this;

    let details = dict<string>();

    details["name"] = JSON.stringify(name);
    details["value"] = "$OPERAND";

    if (namespace) {
      details["namespace"] = JSON.stringify(namespace);
    }

    return { guid, type, details };
  }
}

export class DynamicAttrOpcode extends Opcode {
  public type = "dynamic-attr";
  public name: InternedString;

  constructor({ name }: { name: InternedString }) {
    super();
    this.name = name;
  }

  evaluate(vm: VM) {
    let { name } = this;
    let reference = vm.frame.getOperand();
    vm.stack().setAttribute(name, reference);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name } = this;

    let details = dict<string>();

    details["name"] = JSON.stringify(name);
    details["value"] = "$OPERAND";

    return { guid, type, details };
  }
}

export class DynamicPropOpcode extends Opcode {
  public type = "dynamic-prop";
  public name: InternedString;

  constructor({ name }: { name: InternedString }) {
    super();
    this.name = name;
  }

  evaluate(vm: VM) {
    let { name } = this;
    let reference = vm.frame.getOperand();
    vm.stack().setProperty(name, reference);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name } = this;

    let details = dict<string>();

    details["name"] = JSON.stringify(name);
    details["value"] = "$OPERAND";

    return { guid, type, details };
  }
}

export class PatchElementOpcode extends DOMUpdatingOpcode {
  public type = "patch-element";

  private element: Element;
  private attribute: ElementPatchOperation;
  private lastValue: any;

  constructor(element: Element, attribute: ElementPatchOperation, lastValue: any) {
    super();
    this.element = element;
    this.attribute = attribute;
    this.lastValue = lastValue;
  }

  evaluate(vm: UpdatingVM) {
    this.lastValue = this.attribute.apply(vm.env.getDOM(), this.element, this.lastValue);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, element, attribute, lastValue } = this;

    let details = dict<string>();

    let [attributeType, attributeName] = attribute.toJSON();

    details["element"] = JSON.stringify(`<${element.tagName.toLowerCase()} />`);
    details["type"] = JSON.stringify(attributeType);
    details["name"] = JSON.stringify(attributeName);
    details["lastValue"] = JSON.stringify(lastValue);

    return { guid, type, details };
  }
}

export class CommentOpcode extends Opcode {
  public type = "comment";
  public comment: InternedString;

  constructor({ comment }: { comment: InternedString }) {
    super();
    this.comment = comment;
  }

  evaluate(vm: VM) {
    vm.stack().appendComment(this.comment);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.comment)]
    };
  }
}
