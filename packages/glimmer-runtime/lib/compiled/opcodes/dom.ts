import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { DynamicScope } from '../../environment';
import { FIXME, InternedString, Opaque, Dict, dict } from 'glimmer-util';
import {
  CachedReference,
  Reference,
  ReferenceCache,
  RevisionTag,
  Revision,
  combineTagged,
  isConst as isConstReference,
  isModified
} from 'glimmer-reference';
import { ModifierManager } from '../../modifier/interfaces';
import { DOMHelper } from '../../dom/helper';
import { NULL_REFERENCE } from '../../references';
import { ValueReference } from '../../compiled/expressions/value';
import { CompiledArgs, EvaluatedArgs } from '../../compiled/expressions/args';
import { IChangeList } from '../../dom/change-lists';

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

class ClassListReference extends CachedReference<string> {
  public tag: RevisionTag;
  private list: Reference<string>[] = [];

  constructor(list: Reference<string>[]) {
    super();
    this.tag = combineTagged(list);
    this.list = list;
  }

  protected compute(): string {
    return toClassName(this.list);
  }
}

function toClassName(list: Reference<string>[]) {
  let ret = [];

  for (let i = 0; i < list.length; i++) {
    let value: FIXME<'use Opaque and normalize'> = list[i].value();
    if (value !== false && value !== null && value !== undefined) ret.push(value);
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
    let flattened = dict<Attribute>();
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
    let attr = 'class' as InternedString;
    let attributeManager = vm.env.attributeFor(element, attr, className, false);
    let attribute = new Attribute(element, attributeManager, attr, className);
    let opcode = attribute.flush(dom);

    if (opcode) {
      vm.updateWith(opcode);
    }

    for (let k = 0; k < flattenedKeys.length; k++) {
      let opcode = flattened[flattenedKeys[k]].flush(dom);
      if (opcode) vm.updateWith(opcode);
    }

    stack.closeElement();
  }
}

export class StaticAttrOpcode extends Opcode {
  public type = "static-attr";
  public namespace: InternedString;
  public name: InternedString;
  public value: ValueReference<string>;

  constructor({ namespace, name, value }: { namespace: InternedString, name: InternedString, value: InternedString }) {
    super();
    this.namespace = namespace;
    this.name = name;
    this.value = new ValueReference(value);
  }

  evaluate(vm: VM) {
    let { name, value, namespace } = this;
    if (namespace) {
      vm.stack().setAttributeNS(namespace, name, value, false);
    } else {
      vm.stack().setAttribute(name, value, false);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, namespace, name, value } = this;

    let details = dict<string>();

    if (namespace) {
      details["namespace"] = JSON.stringify(namespace);
    }

    details["name"] = JSON.stringify(name);
    details["value"] = JSON.stringify(value.value());

    return { guid, type, details };
  }
}

export class ModifierOpcode extends Opcode {
  public type = "modifier";
  public name: InternedString;
  public args: CompiledArgs;
  private manager: ModifierManager<Opaque>;

  constructor({ name, manager, args }: { name: InternedString, manager: ModifierManager<Opaque>, args: CompiledArgs }) {
    super();
    this.name = name;
    this.manager = manager;
    this.args = args;
  }

  evaluate(vm: VM) {
    let { manager } = this;
    let stack = vm.stack();
    let { element, dom } = stack;
    let args = this.args.evaluate(vm);
    let dynamicScope = vm.dynamicScope();

    let modifier = manager.install(element, args, dom, dynamicScope);
    let destructor = manager.getDestructor(modifier);

    if (destructor) {
      vm.newDestroyable(destructor);
    }

    vm.updateWith(new UpdateModifierOpcode({
      manager,
      modifier,
      element,
      dynamicScope,
      args
    }));
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name, args } = this;

    let details = dict<string>();

    details["type"] = JSON.stringify(type);
    details["name"] = JSON.stringify(name);
    details["args"] = JSON.stringify(args);

    return { guid, type, details };
  }
}

export class UpdateModifierOpcode extends UpdatingOpcode {
  public type = "update-modifier";

  private element: Element;
  private dynamicScope: DynamicScope;
  private args: EvaluatedArgs;
  private manager: ModifierManager<Opaque>;
  private modifier: Opaque;
  private lastUpdated: Revision;

  constructor({ manager, modifier, element, dynamicScope, args }: { manager: ModifierManager<Opaque>, modifier: Opaque, element: Element, dynamicScope: DynamicScope, args: EvaluatedArgs }) {
    super();
    this.modifier = modifier;
    this.manager = manager;
    this.element = element;
    this.dynamicScope = dynamicScope;
    this.args = args;
    this.tag = args.tag;
    this.lastUpdated = args.tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, modifier, element, dynamicScope, args, lastUpdated } = this;

    if (!args.tag.validate(lastUpdated)) {
      manager.update(modifier, element, args, vm.dom, dynamicScope);
      this.lastUpdated = args.tag.value();
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.args)]
    };
  }
}

export class Attribute {
  private changeList: IChangeList;
  private element: Element;
  private reference: Reference<Opaque>;
  private cache: ReferenceCache<Opaque>;
  private namespace: string | undefined;

  protected name: InternedString;

  public tag: RevisionTag;

  constructor(element: Element, changeList: IChangeList, name: InternedString, reference: Reference<Opaque>, namespace?: string) {
    this.element = element;
    this.reference = reference;
    this.changeList = changeList;
    this.tag = reference.tag;
    this.name = name;
    this.cache = null;
    this.namespace = namespace;
  }

  patch(dom: DOMHelper) {
    let { element, cache } = this;

    let value = cache.revalidate();

    if (isModified(value)) {
      this.changeList.updateAttribute(dom, element, this.name, value, this.namespace);
    }
  }

  flush(dom: DOMHelper): UpdatingOpcode {
    let { reference, element } = this;

    if (isConstReference(reference)) {
      let value = reference.value();
      this.changeList.setAttribute(dom, element, this.name, value, this.namespace);
    } else {
      let cache = this.cache = new ReferenceCache(reference);
      let value = cache.peek();
      this.changeList.setAttribute(dom, element, this.name, value, this.namespace);
      return new PatchElementOpcode(this);
    }
  }

  toJSON(): Dict<string> {
    let { element, namespace, name, cache } = this;

    let formattedElement = formatElement(element);
    let lastValue = cache.peek() as string;

    if (namespace) {
      return {
        element: formattedElement,
        type: 'attribute',
        namespace,
        name,
        lastValue
      };
    }

    return {
      element: formattedElement,
      type: 'attribute',
      namespace,
      name,
      lastValue
    };
  }
}

function formatElement(element: Element): string {
  return JSON.stringify(`<${element.tagName.toLowerCase()} />`);
}

export class DynamicAttrNSOpcode extends Opcode {
  public type = "dynamic-attr";
  public name: InternedString;
  public namespace: InternedString;
  public isTrusting: boolean;

  constructor({ name, namespace, isTrusting }: { name: InternedString, namespace: InternedString, isTrusting: boolean }) {
    super();
    this.name = name;
    this.namespace = namespace;
    this.isTrusting = isTrusting;
  }

  evaluate(vm: VM) {
    let { name, namespace, isTrusting } = this;
    let reference = vm.frame.getOperand();
    vm.stack().setAttributeNS(namespace, name, reference, isTrusting);
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
  public isTrusting: boolean;

  constructor({ name, isTrusting }: { name: InternedString, isTrusting: boolean }) {
    super();
    this.name = name;
    this.isTrusting = isTrusting;
  }

  evaluate(vm: VM) {
    let { name, isTrusting } = this;
    let reference = vm.frame.getOperand();
    vm.stack().setAttribute(name, reference, isTrusting);
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, name } = this;

    let details = dict<string>();

    details["name"] = JSON.stringify(name);
    details["value"] = "$OPERAND";

    return { guid, type, details };
  }
}

export class PatchElementOpcode extends UpdatingOpcode {
  public type = "patch-element";

  private operation: Attribute;

  constructor(operation: Attribute) {
    super();
    this.tag = operation.tag;
    this.operation = operation;
  }

  evaluate(vm: UpdatingVM) {
    this.operation.patch(vm.env.getDOM());
  }

  toJSON(): OpcodeJSON {
    let { _guid, type, operation } = this;

    return {
      guid: _guid,
      type,
      details: operation.toJSON()
    };
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
