import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import * as Simple from '../../dom/interfaces';
import { FIX_REIFICATION } from '../../dom/interfaces';
import { Environment } from '../../environment';
import { FIXME, Option, Maybe, Opaque, Dict, dict, unwrap, expect } from 'glimmer-util';
import {
  CachedReference,
  Reference,
  ReferenceCache,
  RevisionTag,
  Revision,
  PathReference,
  combineTagged,
  isConst as isConstReference,
  isModified
} from 'glimmer-reference';
import { ModifierManager } from '../../modifier/interfaces';
import { NULL_REFERENCE, PrimitiveReference } from '../../references';
import { CompiledArgs, EvaluatedArgs } from '../../compiled/expressions/args';
import { AttributeManager } from '../../dom/attribute-managers';
import { ElementOperations } from '../../builder';
import { Assert } from './vm';

export class TextOpcode extends Opcode {
  public type = "text";

  constructor(private text: string) {
    super();
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

  constructor(private tag: string) {
    super();
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

export class PushRemoteElementOpcode extends Opcode {
  public type = "push-remote-element";

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand<Simple.Element>();
    let cache = isConstReference(reference) ? undefined : new ReferenceCache(reference);
    let element = cache ? cache.peek() : reference.value();

    vm.stack().pushRemoteElement(element);

    if (cache) {
      vm.updateWith(new Assert(cache));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ['$OPERAND']
    };
  }
}

export class PopRemoteElementOpcode extends Opcode {
  public type = "pop-remote-element";

  evaluate(vm: VM) {
    vm.stack().popRemoteElement();
  }
}

export class OpenComponentElementOpcode extends Opcode {
  public type = "open-component-element";

  constructor(private tag: string) {
    super();
  }

  evaluate(vm: VM) {
    vm.stack().openElement(this.tag, new ComponentElementOperations(vm.env));
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
    let tagName = vm.frame.getOperand<string>().value();
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
  private list: Option<Reference<string>[]> = null;
  private isConst = true;

  append(reference: Reference<string>) {
    let { list, isConst } = this;

    if (list === null) list = this.list = [];

    list.push(reference);
    this.isConst = isConst && isConstReference(reference);
  }

  toReference(): Reference<Option<string>> {
    let { list, isConst } = this;

    if (!list) return NULL_REFERENCE;

    if (isConst) return PrimitiveReference.create(toClassName(list));

    return new ClassListReference(list);
  }

}

class ClassListReference extends CachedReference<Option<string>> {
  public tag: RevisionTag;
  private list: Reference<string>[] = [];

  constructor(list: Reference<string>[]) {
    super();
    this.tag = combineTagged(list);
    this.list = list;
  }

  protected compute(): Option<string> {
    return toClassName(this.list);
  }
}

function toClassName(list: Reference<string>[]): Option<string> {
  let ret: Opaque[] = [];

  for (let i = 0; i < list.length; i++) {
    let value: FIXME<Opaque, 'use Opaque and normalize'> = list[i].value();
    if (value !== false && value !== null && value !== undefined) ret.push(value);
  }

  return (ret.length === 0) ? null : ret.join(' ');
}

export class SimpleElementOperations implements ElementOperations {
  private opcodes: Option<UpdatingOpcode[]> = null;
  private classList: Option<ClassList> = null;

  constructor(private env: Environment) {
  }

  addStaticAttribute(element: Simple.Element, name: string, value: string) {
    if (name === 'class') {
      this.addClass(PrimitiveReference.create(value));
    } else {
      this.env.getAppendOperations().setAttribute(element, name, value);
    }
  }

  addStaticAttributeNS(element: Simple.Element, namespace: string, name: string, value: string) {
    this.env.getAppendOperations().setAttribute(element, name, value, namespace);
  }

  addDynamicAttribute(element: Simple.Element, name: string, reference: PathReference<string>, isTrusting: boolean) {
    if (name === 'class') {
      this.addClass(reference);
    } else {
      let attributeManager = this.env.attributeFor(element, name, isTrusting);
      let attribute = new DynamicAttribute(element, attributeManager, name, reference);

      this.addAttribute(attribute);
    }
  }

  addDynamicAttributeNS(element: Simple.Element, namespace: Simple.Namespace, name: string, reference: PathReference<string>, isTrusting: boolean) {
    let attributeManager = this.env.attributeFor(element, name, isTrusting, namespace);
    let nsAttribute = new DynamicAttribute(element, attributeManager, name, reference, namespace);

    this.addAttribute(nsAttribute);
  }

  flush(element: Simple.Element, vm: VM) {
    let { env } = vm;
    let { opcodes, classList } = this;

    for (let i = 0; opcodes && i < opcodes.length; i++) {
      vm.updateWith(opcodes[i]);
    }

    if (classList) {
      let attributeManager = env.attributeFor(element, 'class', false);
      let attribute = new DynamicAttribute(element, attributeManager, 'class', classList.toReference());
      let opcode = attribute.flush(env);

      if (opcode) {
        vm.updateWith(opcode);
      }
    }

    this.opcodes = null;
    this.classList = null;
  }

  private addClass(reference: PathReference<string>) {
    let { classList } = this;

    if (!classList) {
      classList = this.classList = new ClassList();
    }

    classList.append(reference);
  }

  private addAttribute(attribute: Attribute) {
    let opcode = attribute.flush(this.env);

    if (opcode) {
      let { opcodes } = this;

      if (!opcodes) {
        opcodes = this.opcodes = [];
      }

      opcodes.push(opcode);
    }
  }
}

export class ComponentElementOperations implements ElementOperations {
  private attributeNames: Option<string[]> = null;
  private attributes: Option<Attribute[]> = null;
  private classList: Option<ClassList> = null;

  constructor(private env: Environment) {
  }

  addStaticAttribute(element: Simple.Element, name: string, value: string) {
    if (name === 'class') {
      this.addClass(PrimitiveReference.create(value));
    } else if (this.shouldAddAttribute(name)) {
      this.addAttribute(name, new StaticAttribute(element, name, value));
    }
  }

  addStaticAttributeNS(element: Simple.Element, namespace: string, name: string, value: string) {
    if (this.shouldAddAttribute(name)) {
      this.addAttribute(name, new StaticAttribute(element, name, value, namespace));
    }
  }

  addDynamicAttribute(element: Simple.Element, name: string, reference: PathReference<string>, isTrusting: boolean) {
    if (name === 'class') {
      this.addClass(reference);
    } else if (this.shouldAddAttribute(name)) {
      let attributeManager = this.env.attributeFor(element, name, isTrusting);
      let attribute = new DynamicAttribute(element, attributeManager, name, reference);

      this.addAttribute(name, attribute);
    }
  }

  addDynamicAttributeNS(element: Simple.Element, namespace: Simple.Namespace, name: string, reference: PathReference<string>, isTrusting: boolean) {
    if (this.shouldAddAttribute(name)) {
      let attributeManager = this.env.attributeFor(element, name, isTrusting, namespace);
      let nsAttribute = new DynamicAttribute(element, attributeManager, name, reference, namespace);

      this.addAttribute(name, nsAttribute);
    }
  }

  flush(element: Simple.Element, vm: VM) {
    let { env } = this;
    let { attributes, classList } = this;

    for (let i = 0; attributes && i < attributes.length; i++) {
      let opcode = attributes[i].flush(env);

      if (opcode) {
        vm.updateWith(opcode);
      }
    }

    if (classList) {
      let attributeManager = env.attributeFor(element, 'class', false);
      let attribute = new DynamicAttribute(element, attributeManager, 'class', classList.toReference());
      let opcode = attribute.flush(env);

      if (opcode) {
        vm.updateWith(opcode);
      }
    }
  }

  private shouldAddAttribute(name: string): boolean {
    return !this.attributeNames || this.attributeNames.indexOf(name) === -1;
  }

  private addClass(reference: PathReference<string>) {
    let { classList } = this;

    if (!classList) {
      classList = this.classList = new ClassList();
    }

    classList.append(reference);
  }

  private addAttribute(name: string, attribute: Attribute) {
    let { attributeNames, attributes } = this;

    if (!attributeNames) {
      attributeNames = this.attributeNames = [];
      attributes = this.attributes = [];
    }

    attributeNames.push(name);
    unwrap(attributes).push(attribute);
  }
}

export class FlushElementOpcode extends Opcode {
  public type = "flush-element";

  evaluate(vm: VM) {
    let stack = vm.stack();

    let action = 'FlushElementOpcode#evaluate';
    stack.expectOperations(action).flush(stack.expectConstructing(action), vm);
    stack.flushElement();
  }
}

export class CloseElementOpcode extends Opcode {
  public type = "close-element";

  evaluate(vm: VM) {
    vm.stack().closeElement();
  }
}

export class PopElementOpcode extends Opcode {
  public type = "pop-element";

  evaluate(vm: VM) {
    vm.stack().popElement();
  }
}

export interface StaticAttrOptions {
  namespace: string;
  name: string;
  value: string;
}

export class StaticAttrOpcode extends Opcode {
  public type = "static-attr";

  constructor(
    public namespace: Option<string>,
    public name: string,
    public value: string
  ) {
    super();
  }

  evaluate(vm: VM) {
    let { name, value, namespace } = this;
    if (namespace) {
      vm.stack().setStaticAttributeNS(namespace, name, value);
    } else {
      vm.stack().setStaticAttribute(name, value);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, namespace, name, value } = this;

    let details = dict<string>();

    if (namespace) {
      details["namespace"] = JSON.stringify(namespace);
    }

    details["name"] = JSON.stringify(name);
    details["value"] = JSON.stringify(value);

    return { guid, type, details };
  }
}

export class ModifierOpcode extends Opcode {
  public type = "modifier";

  constructor(
    private name: string,
    private manager: ModifierManager<Opaque>,
    private args: CompiledArgs
  ) {
    super();
  }

  evaluate(vm: VM) {
    let { manager } = this;
    let stack = vm.stack();
    let { constructing: element, updateOperations } = stack;
    let args = this.args.evaluate(vm);
    let dynamicScope = vm.dynamicScope();
    let modifier = manager.create(element as FIX_REIFICATION<Element>, args, dynamicScope, updateOperations);

    vm.env.scheduleInstallModifier(modifier, manager);
    let destructor = manager.getDestructor(modifier);

    if (destructor) {
      vm.newDestroyable(destructor);
    }

    vm.updateWith(new UpdateModifierOpcode(
      manager,
      modifier,
      args
    ));
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
  private lastUpdated: Revision;

  constructor(
    private manager: ModifierManager<Opaque>,
    private modifier: Opaque,
    private args: EvaluatedArgs
  ) {
    super();
    this.tag = args.tag;
    this.lastUpdated = args.tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, modifier, tag, lastUpdated } = this;

    if (!tag.validate(lastUpdated)) {
      vm.env.scheduleUpdateModifier(modifier, manager);
      this.lastUpdated = tag.value();
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

export interface Attribute {
  name: string;
  flush(env: Environment): Option<UpdatingOpcode>;
}

export class StaticAttribute implements Attribute {
  constructor(
    private element: Simple.Element,
    public name: string,
    private value: string,
    private namespace?: string
  ) {}

  flush(env: Environment): Option<UpdatingOpcode> {
    env.getAppendOperations().setAttribute(this.element, this.name, this.value, this.namespace);
    return null;
  }
}

export class DynamicAttribute implements Attribute  {
  private cache: Option<ReferenceCache<Opaque>> = null;

  public tag: RevisionTag;

  constructor(
    private element: Simple.Element,
    private attributeManager: AttributeManager,
    public name: string,
    private reference: Reference<Opaque>,
    private namespace?: Simple.Namespace
  ) {
    this.tag = reference.tag;
  }

  patch(env: Environment) {
    let { element, cache } = this;

    let value = expect(cache, 'must patch after flush').revalidate();

    if (isModified(value)) {
      this.attributeManager.updateAttribute(env, element as FIXME<Element, 'needs to be reified properly'>, value, this.namespace);
    }
  }

  flush(env: Environment): Option<UpdatingOpcode> {
    let { reference, element } = this;

    if (isConstReference(reference)) {
      let value = reference.value();
      this.attributeManager.setAttribute(env, element, value, this.namespace);
      return null;
    } else {
      let cache = this.cache = new ReferenceCache(reference);
      let value = cache.peek();
      this.attributeManager.setAttribute(env, element, value, this.namespace);
      return new PatchElementOpcode(this);
    }
  }

  toJSON(): Dict<Option<string>> {
    let { element, namespace, name, cache } = this;

    let formattedElement = formatElement(element);
    let lastValue = expect(cache, 'must serialize after flush').peek() as string;

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
      namespace: namespace === undefined ? null : namespace,
      name,
      lastValue
    };
  }
}

function formatElement(element: Simple.Element): string {
  return JSON.stringify(`<${element.tagName.toLowerCase()} />`);
}

export class DynamicAttrNSOpcode extends Opcode {
  public type = "dynamic-attr";

  constructor(
    public name: string,
    public namespace: string,
    public isTrusting: Maybe<boolean>
  ) {
    super();
  }

  evaluate(vm: VM) {
    let { name, namespace, isTrusting } = this;
    let reference = vm.frame.getOperand<string>();
    vm.stack().setDynamicAttributeNS(namespace, name, reference, !!isTrusting);
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

  constructor(
    public name: string,
    public isTrusting: Maybe<boolean>
  ) {
    super();
  }

  evaluate(vm: VM) {
    let { name, isTrusting } = this;
    let reference = vm.frame.getOperand<string>();
    vm.stack().setDynamicAttribute(name, reference, !!isTrusting);
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

  private operation: DynamicAttribute;

  constructor(operation: DynamicAttribute) {
    super();
    this.tag = operation.tag;
    this.operation = operation;
  }

  evaluate(vm: UpdatingVM) {
    this.operation.patch(vm.env);
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

  constructor(public comment: string) {
    super();
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
