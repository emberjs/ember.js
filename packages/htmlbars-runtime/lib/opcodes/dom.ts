import { Opcode } from '../opcodes';
import { VM } from '../vm';
import { InternedString } from 'htmlbars-util';
import { StaticAttr, DynamicAttr, DynamicProp, AddClass, Comment } from '../template';

abstract class DOMOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
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
    return null;
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
    return null;
  }
}

export class CloseElementOpcode extends DOMOpcode {
  public type = "close-element";

  evaluate(vm: VM<any>) {
    let { element, classList } = vm.stack().closeElement();

    return null;
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
    let value = vm.registers.args.params.nth(0);

    if (this.namespace) {
      vm.stack().setAttributeNS(name, value.value(), namespace);
    } else {
      vm.stack().setAttribute(name, value.value());
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
    let value = vm.registers.args.params.nth(0);

    vm.stack().element[<string>name] = value.value();
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