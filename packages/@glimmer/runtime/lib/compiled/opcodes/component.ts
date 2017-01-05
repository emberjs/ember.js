import { OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Assert } from './vm';
import { Component, ComponentManager, ComponentDefinition } from '../../component/interfaces';
import { UpdatingVM, VM } from '../../vm';
import { EvaluatedArgs } from '../../compiled/expressions/args';
import { DynamicScope } from '../../environment';
import Bounds from '../../bounds';
import { APPEND_OPCODES, Op as Op } from '../../opcodes';
import { Opaque, Dict, Option } from '@glimmer/util';
import {
  CONSTANT_TAG,
  ReferenceCache,
  VersionedPathReference,
  Tag,
  combine,
  isConst
} from '@glimmer/reference';

APPEND_OPCODES.add(Op.PushDynamicComponent, vm => {
  let reference = vm.evalStack.pop<VersionedPathReference<ComponentDefinition<Opaque>>>();
  let cache = isConst(reference) ? undefined : new ReferenceCache<ComponentDefinition<Opaque>>(reference);
  let definition = cache ? cache.peek() : reference.value();

  vm.evalStack.push(definition);

  if (cache) {
    vm.updateWith(new Assert(cache));
  }
});

APPEND_OPCODES.add(Op.PushComponentManager, (vm, { op1: definition }) => {
  vm.evalStack.push(vm.constants.other(definition));
});

export class Arguments {
  private positional: number = 0;
  private named: number = 0;
  private start: number = 0;
  private namedDict: Dict<number> = null as any;
  private vm: VM = null as any;

  setup(positional: number, named: number, namedDict: Dict<number>, vm: VM) {
    this.positional = positional;
    this.named = named;
    this.namedDict = namedDict;
    this.start = positional + named;
    this.vm = vm;
  }

  at<T extends VersionedPathReference<Opaque>>(pos: number): T {
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    //
    // at(0) === pos1 === top - start
    // at(1) === pos2 === top - (start - 1)
    // at(2) === pos3 === top - (start - 2)
    let fromTop = this.start - pos;
    return this.vm.evalStack.fromTop<T>(fromTop);
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    // namedDict: { named1: 1, named2: 0 };
    //
    // get('named1') === named1 === top - (start - 1)
    // get('named2') === named2 === top - start
    let fromTop = this.namedDict[name];
    return this.vm.evalStack.fromTop<T>(fromTop);
  }
}

const ARGS = new Arguments();

interface InitialComponentState<T> {
  definition: ComponentDefinition<T>,
  manager: ComponentManager<T>,
  component: null
}

interface ComponentState<T> {
  definition: ComponentDefinition<T>,
  manager: ComponentManager<T>,
  component: null
}

APPEND_OPCODES.add(Op.SetComponentLocal, (vm, { op1: local }) => {
  let stack = vm.evalStack;

  let manager = stack.pop();
  let definition = stack.pop();

  vm.setLocal(local, { definition, manager, component: null });
});

APPEND_OPCODES.add(Op.PushComponentArgs, (vm, { op1: positional, op2: named, op3: _namedDict }) => {
  let namedDict = vm.constants.getOther<Dict<number>>(_namedDict);
  ARGS.setup(positional, named, namedDict, vm);
});

APPEND_OPCODES.add(Op.PushCreatedComponent, (vm, { op1: flags }) => {
  let manager = vm.evalStack.top<ComponentManager<Opaque>>();
  let definition = vm.evalStack.fromTop<ComponentDefinition<Opaque>>(1);
  let env = vm.env;

  let dynamicScope = vm.dynamicScope();
  let self = vm.getSelf();
  let hasDefaultBlock = flags & 0b01;

  ARGS.setup()

  vm.evalStack.push(manager.create(env, definition, null, dynamicScope, self, hasDefaultBlock))
});

APPEND_OPCODES.add(Op.PushComponent, (vm, { op1: _component }) => {
  let definition = vm.constants.getOther<ComponentDefinition<Component>>(_component);
  vm.evalStack.push(definition);
});

APPEND_OPCODES.add(Op.OpenComponent, (vm, { op1: _shadow }) => {
  let hash = vm.evalStack.pop<EvaluatedArgs>();
  let definition = vm.evalStack.pop<ComponentDefinition<Opaque>>();
  let shadow = vm.constants.getBlock(_shadow);

  let dynamicScope = vm.pushDynamicScope();
  let callerScope = vm.scope();

  let manager = definition.manager;
  let args = manager.prepareArgs(definition, hash, dynamicScope);
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

  vm.invokeBlock(shadow);
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
  public tag: Tag = CONSTANT_TAG;

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
