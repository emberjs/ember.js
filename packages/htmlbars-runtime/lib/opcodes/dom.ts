import { Opcode, UpdatingOpcode } from '../opcodes';
import { VM, UpdatingVM } from '../vm';
import { InternedString } from 'htmlbars-util';
import { StaticAttr, DynamicAttr, DynamicProp, AddClass, Comment } from '../template';
import { ClassList } from '../builder';
import { ChainableReference } from 'htmlbars-reference';

abstract class DOMOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
}

abstract class DOMUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class TextOpcode extends DOMOpcode {
  public type = "text";
  private text: InternedString;

  constructor(text: InternedString) {
    super();
    this.text = text;
  }

  evaluate(vm: VM<any>) {
    vm.stack().appendText(this.text);
  }
}

export class OpenPrimitiveElementOpcode extends DOMOpcode {
  public type = "open-primitive-element";
  private tag: InternedString;

  constructor(tag: InternedString) {
    super();
    this.tag = tag;
  }

  evaluate(vm: VM<any>) {
    vm.stack().openElement(this.tag);
  }
}

export class CloseElementOpcode extends DOMOpcode {
  public type = "close-element";

  evaluate(vm: VM<any>) {
    let { element, classList, classNames } = vm.stack().closeElement();

    if (classList) {
      vm.updateWith(new UpdateAttributeOpcode(element, "class", classList, classNames));
    }
  }
}

export class StaticAttrOpcode extends DOMOpcode {
  public type = "static-attr";
  public name: InternedString;
  public value: InternedString;
  public namespace: InternedString;

  constructor(attr: StaticAttr) {
    super();
    this.name = attr.name;
    this.value = attr.value;
    this.namespace = attr.namespace;
  }

  evaluate(vm: VM<any>) {
    let { name, value, namespace } = this;

    if (this.namespace) {
      vm.stack().setAttributeNS(name, value, namespace);
    } else {
      vm.stack().setAttribute(name, value);
    }
  }
}

export class DynamicAttrOpcode extends DOMOpcode {
  public type = "dynamic-attr";
  public name: InternedString;
  public value: InternedString;
  public namespace: InternedString;

  constructor(attr: DynamicAttr) {
    super();
    this.name = attr.name;
    this.namespace = attr.namespace;
  }

  evaluate(vm: VM<any>) {
    let { name, namespace } = this;
    let reference = vm.registers.args.params.nth(0);
    let value = reference.value();

    if (this.namespace) {
      vm.stack().setAttributeNS(name, value, namespace);
    } else {
      vm.stack().setAttribute(name, value);
    }

    vm.updateWith(new UpdateAttributeOpcode(vm.stack().element, name, reference, value));
  }
}

export class UpdateAttributeOpcode extends DOMUpdatingOpcode {
  public type = "update-attribute";

  private element: Element;
  private name: string;
  private namespace: string;
  private reference: ChainableReference;
  private lastValue: string;

  constructor(element: Element, name: string, reference: ChainableReference, lastValue: string, namespace?: string) {
    super();
    this.element = element;
    this.name = name;
    this.reference = reference;
    this.lastValue = lastValue;
    this.namespace = namespace;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.reference.value();

    if (value !== this.lastValue) {
      if (this.namespace) {
        vm.dom.setAttributeNS(this.element, this.name, value, this.namespace);
      } else {
        vm.dom.setAttribute(this.element, this.name, value);
      }

      this.lastValue = value;
    }
  }
}

export class DynamicPropOpcode extends DOMOpcode {
  public type = "dynamic-prop";
  public name: InternedString;
  public value: InternedString;

  constructor(attr: DynamicProp) {
    super();
    this.name = attr.name;
  }

  evaluate(vm: VM<any>) {
    let { name } = this;
    let element = vm.stack().element;
    let reference = vm.registers.args.params.nth(0);
    let value = reference.value();

    element[<string>name] = value;

    vm.updateWith(new UpdatePropertyOpcode(element, name, reference, value));
  }
}

export class UpdatePropertyOpcode extends DOMUpdatingOpcode {
  public type = "update-property";

  private element: Element;
  private name: string;
  private reference: ChainableReference;
  private lastValue: any;

  constructor(element: Element, name: string, reference: ChainableReference, lastValue: any) {
    super();
    this.element = element;
    this.name = name;
    this.reference = reference;
    this.lastValue = lastValue;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.reference.value();

    if (value !== this.lastValue) {
      this.lastValue = this.element[this.name] = value;
    }
  }
}

export class AddClassOpcode extends DOMOpcode {
  public type = "add-class";

  evaluate(vm: VM<any>) {
    vm.stack().addClass(vm.registers.args.params.nth(0));
  }
}

export class CommentOpcode extends DOMOpcode {
  public type = "comment";
  public value: InternedString;

  constructor(comment: Comment) {
    super();
    this.value = comment.value;
  }

  evaluate(vm: VM<any>) {
    vm.stack().appendComment(this.value);
  }
}