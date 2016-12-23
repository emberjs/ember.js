import { OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Assert } from './vm';
import { Component, ComponentManager, ComponentDefinition } from '../../component/interfaces';
import { UpdatingVM } from '../../vm';
import { CompiledArgs, EvaluatedArgs } from '../../compiled/expressions/args';
import { DynamicScope } from '../../environment';
import Bounds from '../../bounds';
import { CONSTANT_TAG, ReferenceCache, combine, isConst, RevisionTag } from 'glimmer-reference';
import { APPEND_OPCODES, OpcodeName as Op } from '../../opcodes';

APPEND_OPCODES.add(Op.PutDynamicComponent, vm => {
  let reference = vm.frame.getOperand<ComponentDefinition<Component>>();
  let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
  let definition = cache ? cache.peek() : reference.value();

  vm.frame.setImmediate(definition);

  if (cache) {
    vm.updateWith(new Assert(cache));
  }
});

APPEND_OPCODES.add(Op.PutComponent, (vm, { op1: _component }) => {
  let definition = vm.constants.getOther<ComponentDefinition<Component>>(_component);
  vm.frame.setImmediate(definition);
});

APPEND_OPCODES.add(Op.OpenComponent, (vm, { op1: _args, op2: _shadow }) => {
  let rawArgs = vm.constants.getExpression<CompiledArgs>(_args);
  let shadow = vm.constants.getBlock(_shadow);

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
});

// export class DidCreateElementOpcode extends Opcode {
//   public type = "did-create-element";

//   evaluate(vm: VM) {
//     let manager = vm.frame.getManager();
//     let component = vm.frame.getComponent();

//     let action = 'DidCreateElementOpcode#evaluate';
//     manager.didCreateElement(component, vm.stack().expectConstructing(action), vm.stack().expectOperations(action));
//   }

//   toJSON(): OpcodeJSON {
//     return {
//       guid: this._guid,
//       type: this.type,
//       args: ["$ARGS"]
//     };
//   }
// }

APPEND_OPCODES.add(Op.DidCreateElement, vm => {
  let manager = vm.frame.getManager();
  let component = vm.frame.getComponent();

  let action = 'DidCreateElementOpcode#evaluate';
  manager.didCreateElement(component, vm.stack().expectConstructing(action), vm.stack().expectOperations(action));
});

// export class ShadowAttributesOpcode extends Opcode {
//   public type = "shadow-attributes";

//   evaluate(vm: VM) {
//     let shadow = vm.frame.getShadow();

//     vm.pushCallerScope();
//     if (!shadow) return;

//     vm.invokeBlock(shadow, EvaluatedArgs.empty());
//   }

//   toJSON(): OpcodeJSON {
//     return {
//       guid: this._guid,
//       type: this.type,
//       args: ["$ARGS"]
//     };
//   }
// }

// Slow path for non-specialized component invocations. Uses an internal
// named lookup on the args.
APPEND_OPCODES.add(Op.ShadowAttributes, vm => {
  let shadow = vm.frame.getShadow();

  vm.pushCallerScope();
  if (!shadow) return;

  vm.invokeBlock(shadow, EvaluatedArgs.empty());
});

// export class DidRenderLayoutOpcode extends Opcode {
//   public type = "did-render-layout";

//   evaluate(vm: VM) {
//     let manager = vm.frame.getManager();
//     let component = vm.frame.getComponent();
//     let bounds = vm.stack().popBlock();

//     manager.didRenderLayout(component, bounds);

//     vm.env.didCreate(component, manager);

//     vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
//   }
// }

APPEND_OPCODES.add(Op.DidRenderLayout, vm => {
  let manager = vm.frame.getManager();
  let component = vm.frame.getComponent();
  let bounds = vm.stack().popBlock();

  manager.didRenderLayout(component, bounds);

  vm.env.didCreate(component, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
});

// export class CloseComponentOpcode extends Opcode {
//   public type = "close-component";

//   evaluate(vm: VM) {
//     vm.popScope();
//     vm.popDynamicScope();
//     vm.commitCacheGroup();
//   }
// }

APPEND_OPCODES.add(Op.CloseComponent, vm => {
  vm.popScope();
  vm.popDynamicScope();
  vm.commitCacheGroup();
});

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

  evaluate(_vm: UpdatingVM) {
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
