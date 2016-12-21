import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Assert } from './vm';
import { Component, ComponentManager, ComponentDefinition } from '../../component/interfaces';
import { VM, UpdatingVM } from '../../vm';
import { CompiledArgs, EvaluatedArgs } from '../../compiled/expressions/args';
import { DynamicScope } from '../../environment';
import Bounds from '../../bounds';
import { InlineBlock } from '../../scanner';
import { CONSTANT_TAG, PathReference, ReferenceCache, combine, isConst, RevisionTag } from 'glimmer-reference';
import { FIXME, Option, expect } from 'glimmer-util';

export class PutDynamicComponentDefinitionOpcode extends Opcode {
  public type = "put-dynamic-component-definition";

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand<ComponentDefinition<Component>>();
    let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
    let definition = cache ? cache.peek() : reference.value();

    vm.frame.setImmediate(definition);

    if (cache) {
      vm.updateWith(new Assert(cache));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class PutComponentDefinitionOpcode extends Opcode {
  public type = "put-component-definition";

  constructor(private definition: ComponentDefinition<Component>) {
    super();
  }

  evaluate(vm: VM) {
    vm.frame.setImmediate(this.definition);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.definition.name)]
    };
  }
}

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";

  constructor(
    private args: CompiledArgs,
    private shadow: Option<InlineBlock>
  ) {
    super();
  }

  evaluate(vm: VM) {
    let { args: rawArgs, shadow } = this;

    let definition = vm.frame.getImmediate<ComponentDefinition<Component>>();
    let dynamicScope = vm.pushDynamicScope();
    let callerScope = vm.scope();

    let manager = definition.manager;
    let args = manager.prepareArgs(definition, rawArgs.evaluate(vm), dynamicScope);
    let hasDefaultBlock = !!args.blocks.default; // TODO Cleanup?
    let component = manager.create(vm.env, definition, args, dynamicScope, vm.getSelf(), hasDefaultBlock);
    let destructor = manager.getDestructor(component);
    if (destructor) vm.newDestroyable(destructor);

    let layout = manager.layoutFor(definition, component, vm.env);
    let selfRef = manager.getSelf(component);

    vm.beginCacheGroup();
    vm.stack().pushSimpleBlock();
    vm.pushRootScope(selfRef, layout.symbols);
    vm.invokeLayout(args, layout, callerScope, component, manager, shadow);

    vm.updateWith(new UpdateComponentOpcode(definition.name, component, manager, args, dynamicScope));
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = "update-component";

  constructor(
    private name: string,
    private component: Component,
    private manager: ComponentManager<Component>,
    private args: EvaluatedArgs,
    private dynamicScope: DynamicScope,
  ) {
    super();

    let componentTag = manager.getTag(component);

    if (componentTag) {
      this.tag = combine([args.tag, componentTag]);
    } else {
      this.tag = args.tag;
    }
  }

  evaluate(vm: UpdatingVM) {
    let { component, manager, args, dynamicScope } = this;

    manager.update(component, args, dynamicScope);
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
    let manager = vm.frame.getManager();
    let component = vm.frame.getComponent();

    let action = 'DidCreateElementOpcode#evaluate';
    manager.didCreateElement(component, vm.stack().expectConstructing(action), vm.stack().expectOperations(action));
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
    let shadow = vm.frame.getShadow();

    vm.pushCallerScope();
    if (!shadow) return;

    vm.invokeBlock(shadow, EvaluatedArgs.empty());
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$ARGS"]
    };
  }
}

export class DidRenderLayoutOpcode extends Opcode {
  public type = "did-render-layout";

  evaluate(vm: VM) {
    let manager = vm.frame.getManager();
    let component = vm.frame.getComponent();
    let bounds = vm.stack().popBlock();

    manager.didRenderLayout(component, bounds);

    vm.env.didCreate(component, manager);

    vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
  }
}

export class DidUpdateLayoutOpcode extends UpdatingOpcode {
  public type = "did-update-layout";
  public tag: RevisionTag = CONSTANT_TAG;

  constructor(
    private manager: ComponentManager<Component>,
    private component: Component,
    private bounds: Bounds
  ) {
    super();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, component, bounds } = this;

    manager.didUpdateLayout(component, bounds);

    vm.env.didUpdate(component, manager);
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
