import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Assert } from './vm';
import { Component, ComponentManager, ComponentDefinition } from '../../component/interfaces';
import { VM, UpdatingVM } from '../../vm';
import { CompiledArgs, EvaluatedArgs } from '../../compiled/expressions/args';
import { Templates } from '../../syntax/core';
import { DynamicScope } from '../../environment';
import { InternedString, Opaque } from 'glimmer-util';
import { ReferenceCache, Revision, combine, isConst } from 'glimmer-reference';

export class PutDynamicComponentDefinitionOpcode extends Opcode {
  public type = "put-dynamic-component-definition";

  private args: CompiledArgs;

  constructor({ args }: { args: CompiledArgs }) {
    super();
    this.args = args;
  }

  evaluate(vm: VM) {
    let definitionRef = vm.frame.getOperand();
    let cache = isConst(definitionRef) ? undefined : new ReferenceCache(definitionRef);
    let definition = cache ? cache.peek() : definitionRef.value();

    let args = this.args.evaluate(vm).withInternal();
    vm.frame.setArgs(args);
    args.internal["definition"] = definition;

    if (cache) {
      vm.updateWith(new Assert(cache));
    }
  }
}

export interface PutComponentDefinitionOptions {
  args: CompiledArgs;
  definition: ComponentDefinition<Opaque>;
}

export class PutComponentDefinitionOpcode extends Opcode {
  public type = "put-component-definition";
  private args: CompiledArgs;
  private definition: ComponentDefinition<Opaque>;

  constructor({ args, definition }: PutComponentDefinitionOptions) {
    super();
    this.args = args;
    this.definition = definition;
  }

  evaluate(vm: VM) {
    let args = this.args.evaluate(vm).withInternal();
    args.internal["definition"] = this.definition;
    vm.frame.setArgs(args);
  }
}

export interface OpenComponentOptions {
  shadow: InternedString[];
  templates: Templates;
}

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  public definition: ComponentDefinition<Opaque>;
  public args: CompiledArgs;
  public shadow: InternedString[];
  public templates: Templates;

  constructor({ shadow, templates }: OpenComponentOptions) {
    super();
    this.shadow = shadow;
    this.templates = templates;
  }

  evaluate(vm: VM) {
    let { shadow, templates } = this;
    let args = vm.frame.getArgs();
    let definition = args.internal["definition"] as ComponentDefinition<Opaque>;

    vm.pushDynamicScope();
    let dynamicScope = vm.dynamicScope();

    let manager = definition.manager;
    let hasDefaultBlock = templates && !!templates.default; // TODO Cleanup?
    let component = manager.create(definition, args, dynamicScope, hasDefaultBlock);
    let destructor = manager.getDestructor(component);
    if (destructor) vm.newDestroyable(destructor);
    args.internal["component"] = component;
    args.internal["definition"] = definition;
    args.internal["shadow"] = shadow;

    vm.beginCacheGroup();
    let layout = manager.layoutFor(definition, component, vm.env);
    let callerScope = vm.scope();
    let selfRef = manager.getSelf(component);
    vm.pushRootScope(selfRef, layout.symbols);
    vm.invokeLayout({ templates, args, shadow, layout, callerScope });
    vm.env.didCreate(component, manager);

    vm.updateWith(new UpdateComponentOpcode({ name: definition.name, component, manager, args, dynamicScope }));
  }
}

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = "update-component";

  private name: string;
  private component: Component;
  private manager: ComponentManager<Opaque>;
  private args: EvaluatedArgs;
  private dynamicScope: DynamicScope;
  private lastUpdated: Revision;

  constructor({ name, component, manager, args, dynamicScope } : { name: string, component: Component, manager: ComponentManager<any>, args: EvaluatedArgs, dynamicScope: DynamicScope }) {
    super();

    let tag;
    let componentTag = manager.getTag(component);

    if (componentTag) {
      tag = this.tag = combine([args.tag, componentTag]);
    } else {
      tag = this.tag = args.tag;
    }

    this.name = name;
    this.component = component;
    this.manager = manager;
    this.args = args;
    this.dynamicScope = dynamicScope;
    this.lastUpdated = tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { component, manager, tag, args, dynamicScope, lastUpdated } = this;

    if (!tag.validate(lastUpdated)) {
      manager.update(component, args, dynamicScope);
      vm.env.didUpdate(component, manager);
      this.lastUpdated = tag.value();
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.name)]
    };
  }
}

export class DidCreateElementOpcode extends Opcode {
  public type = "did-create-element";

  evaluate(vm: VM) {
    let args = vm.frame.getArgs();
    let internal = args.internal;
    let definition = internal['definition'] as ComponentDefinition<Opaque>;
    let manager = definition.manager;
    let component: Component = internal['component'];

    manager.didCreateElement(component, vm.stack().element, vm.stack().elementOperations);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$ARGS"]
    };
  }
}

// Slow path for non-specialized component invocations. Uses an internal
// named lookup on the args.
export class ShadowAttributesOpcode extends Opcode {
  public type = "shadow-attributes";

  evaluate(vm: VM) {
    let args = vm.frame.getArgs();
    let internal = args.internal;
    let shadow: InternedString[] = internal['shadow'] as InternedString[];

    let named = args.named;

    if (!shadow) return;

    shadow.forEach(name => {
      vm.stack().setAttribute(name, named.get(name), false);
    });
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$ARGS"]
    };
  }
}

export class CloseComponentOpcode extends Opcode {
  public type = "close-component";

  evaluate(vm: VM) {
    vm.popScope();
    vm.popDynamicScope();
    vm.commitCacheGroup();
  }
}
