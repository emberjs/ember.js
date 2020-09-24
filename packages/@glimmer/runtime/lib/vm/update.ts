import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  DynamicScope,
  ElementBuilder,
  Environment,
  ExceptionHandler,
  GlimmerTreeChanges,
  LiveBlock,
  Option,
  RuntimeContext,
  Scope,
  UpdatableBlock,
} from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import {
  OpaqueIterationItem,
  OpaqueIterator,
  Reference,
  updateRef,
  valueForRef,
} from '@glimmer/reference';
import { expect, Stack, logStep } from '@glimmer/util';
import { resetTracking, runInTrackingTransaction } from '@glimmer/validator';
import { SimpleComment } from '@simple-dom/interface';
import { clear, move as moveBounds } from '../bounds';
import { associateDestroyableChild, destroy, destroyChildren } from '../destroyables';
import { UpdatingOpcode } from '../opcodes';
import { InternalVM, VmInitCallback } from './append';
import { LiveBlockList, NewElementBuilder } from './element-builder';

export default class UpdatingVM {
  public env: Environment;
  public dom: GlimmerTreeChanges;
  public alwaysRevalidate: boolean;

  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();

  constructor(env: Environment, { alwaysRevalidate = false }) {
    this.env = env;
    this.dom = env.getDOM();
    this.alwaysRevalidate = alwaysRevalidate;
  }

  execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler) {
    if (DEBUG) {
      let hasErrored = true;
      try {
        runInTrackingTransaction!(() => this._execute(opcodes, handler), '- While rendering:');

        // using a boolean here to avoid breaking ergonomics of "pause on uncaught exceptions"
        // which would happen with a `catch` + `throw`
        hasErrored = false;
      } finally {
        if (hasErrored) {
          console.error(`\n\nError occurred:\n\n${resetTracking()}\n\n`);
        }
      }
    } else {
      this._execute(opcodes, handler);
    }
  }

  private _execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler) {
    let { frameStack } = this;

    this.try(opcodes, handler);

    while (true) {
      if (frameStack.isEmpty()) break;

      let opcode = this.frame.nextStatement();

      if (opcode === undefined) {
        frameStack.pop();
        continue;
      }

      opcode.evaluate(this);
    }
  }

  private get frame() {
    return expect(this.frameStack.current, 'bug: expected a frame');
  }

  goto(index: number) {
    this.frame.goto(index);
  }

  try(ops: UpdatingOpcode[], handler: Option<ExceptionHandler>) {
    this.frameStack.push(new UpdatingVMFrame(ops, handler));
  }

  throw() {
    this.frame.handleException();
    this.frameStack.pop();
  }
}

export interface VMState {
  readonly pc: number;
  readonly scope: Scope;
  readonly dynamicScope: DynamicScope;
  readonly stack: unknown[];
}

export interface ResumableVMState {
  resume(runtime: RuntimeContext, builder: ElementBuilder): InternalVM;
}

export class ResumableVMStateImpl implements ResumableVMState {
  constructor(readonly state: VMState, private resumeCallback: VmInitCallback) {}

  resume(runtime: RuntimeContext, builder: ElementBuilder): InternalVM {
    return this.resumeCallback(runtime, this.state, builder);
  }
}

export abstract class BlockOpcode extends UpdatingOpcode implements Bounds {
  public type = 'block';
  public children: UpdatingOpcode[];

  protected readonly bounds: LiveBlock;

  constructor(
    protected state: ResumableVMState,
    protected runtime: RuntimeContext,
    bounds: LiveBlock,
    children: UpdatingOpcode[]
  ) {
    super();

    this.children = children;
    this.bounds = bounds;
  }

  parentElement() {
    return this.bounds.parentElement();
  }

  firstNode() {
    return this.bounds.firstNode();
  }

  lastNode() {
    return this.bounds.lastNode();
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, null);
  }
}

export class TryOpcode extends BlockOpcode implements ExceptionHandler {
  public type = 'try';

  protected bounds!: UpdatableBlock; // Hides property on base class

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, this);
  }

  handleException() {
    let { state, bounds, runtime } = this;

    destroyChildren(this);

    let elementStack = NewElementBuilder.resume(runtime.env, bounds);
    let vm = state.resume(runtime, elementStack);

    let updating: UpdatingOpcode[] = [];
    let children = (this.children = []);

    let result = vm.execute((vm) => {
      vm.pushUpdating(updating);
      vm.updateWith(this);
      vm.pushUpdating(children);
    });

    associateDestroyableChild(this, result.drop);
  }
}

export class ListItemOpcode extends TryOpcode {
  public retained = false;
  public index = -1;

  constructor(
    state: ResumableVMState,
    runtime: RuntimeContext,
    bounds: UpdatableBlock,
    public key: unknown,
    public memo: Reference,
    public value: Reference
  ) {
    super(state, runtime, bounds, []);
  }

  updateReferences(item: OpaqueIterationItem) {
    this.retained = true;
    updateRef(this.value, item.value);
    updateRef(this.memo, item.memo);
  }

  shouldRemove(): boolean {
    return !this.retained;
  }

  reset() {
    this.retained = false;
  }
}

export class ListBlockOpcode extends BlockOpcode {
  public type = 'list-block';
  public children!: ListItemOpcode[];

  private opcodeMap = new Map<unknown, ListItemOpcode>();
  private marker: SimpleComment | null = null;
  private lastIterator: OpaqueIterator;

  protected readonly bounds!: LiveBlockList;

  constructor(
    state: ResumableVMState,
    runtime: RuntimeContext,
    bounds: LiveBlockList,
    children: ListItemOpcode[],
    private iterableRef: Reference<OpaqueIterator>
  ) {
    super(state, runtime, bounds, children);
    this.lastIterator = valueForRef(iterableRef);
  }

  initializeChild(opcode: ListItemOpcode) {
    opcode.index = this.children.length - 1;
    this.opcodeMap.set(opcode.key, opcode);
  }

  evaluate(vm: UpdatingVM) {
    let iterator = valueForRef(this.iterableRef);

    if (this.lastIterator !== iterator) {
      let { bounds } = this;
      let { dom } = vm;

      let marker = (this.marker = dom.createComment(''));
      dom.insertAfter(
        bounds.parentElement(),
        marker,
        expect(bounds.lastNode(), "can't insert after an empty bounds")
      );

      this.sync(iterator);

      this.parentElement().removeChild(marker);
      this.marker = null;
      this.lastIterator = iterator;
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  private sync(iterator: OpaqueIterator) {
    let { opcodeMap: itemMap, children } = this;

    let currentOpcodeIndex = 0;
    let seenIndex = 0;

    this.children = this.bounds.boundList = [];

    while (true) {
      let item = iterator.next();

      if (item === null) break;

      let opcode = children[currentOpcodeIndex];
      let { key } = item;

      // Items that have already been found and moved will already be retained,
      // we can continue until we find the next unretained item
      while (opcode !== undefined && opcode.retained === true) {
        opcode = children[++currentOpcodeIndex];
      }

      if (opcode !== undefined && opcode.key === key) {
        this.retainItem(opcode, item);
        currentOpcodeIndex++;
      } else if (itemMap.has(key)) {
        let itemOpcode = itemMap.get(key)!;

        // The item opcode was seen already, so we should move it.
        if (itemOpcode.index < seenIndex) {
          this.moveItem(itemOpcode, item, opcode);
        } else {
          // Update the seen index, we are going to be moving this item around
          // so any other items that come before it will likely need to move as
          // well.
          seenIndex = itemOpcode.index;

          let seenUnretained = false;

          // iterate through all of the opcodes between the current position and
          // the position of the item's opcode, and determine if they are all
          // retained.
          for (let i = currentOpcodeIndex + 1; i < seenIndex; i++) {
            if (children[i].retained === false) {
              seenUnretained = true;
              break;
            }
          }

          // If we have seen only retained opcodes between this and the matching
          // opcode, it means that all the opcodes in between have been moved
          // already, and we can safely retain this item's opcode.
          if (seenUnretained === false) {
            this.retainItem(itemOpcode, item);
            currentOpcodeIndex = seenIndex + 1;
          } else {
            this.moveItem(itemOpcode, item, opcode);
            currentOpcodeIndex++;
          }
        }
      } else {
        this.insertItem(item, opcode);
      }
    }

    for (let i = 0; i < children.length; i++) {
      let opcode = children[i];

      if (opcode.retained === false) {
        this.deleteItem(opcode);
      } else {
        opcode.reset();
      }
    }
  }

  private retainItem(opcode: ListItemOpcode, item: OpaqueIterationItem) {
    if (LOCAL_DEBUG) {
      logStep!('list-updates', ['retain', item.key]);
    }

    let { children } = this;

    updateRef(opcode.memo, item.memo);
    updateRef(opcode.value, item.value);
    opcode.retained = true;

    opcode.index = children.length;
    children.push(opcode);
  }

  private insertItem(item: OpaqueIterationItem, before: ListItemOpcode) {
    if (LOCAL_DEBUG) {
      logStep!('list-updates', ['insert', item.key]);
    }

    let { opcodeMap, bounds, state, runtime, children } = this;
    let { key } = item;
    let nextSibling = before === undefined ? this.marker : before.firstNode();

    let elementStack = NewElementBuilder.forInitialRender(runtime.env, {
      element: bounds.parentElement(),
      nextSibling,
    });

    let vm = state.resume(runtime, elementStack);

    vm.execute((vm) => {
      vm.pushUpdating();
      let opcode = vm.enterItem(item);

      opcode.index = children.length;
      children.push(opcode);
      opcodeMap.set(key, opcode);
      associateDestroyableChild(this, opcode);
    });
  }

  private moveItem(opcode: ListItemOpcode, item: OpaqueIterationItem, before: ListItemOpcode) {
    let { children } = this;

    updateRef(opcode.memo, item.memo);
    updateRef(opcode.value, item.value);
    opcode.retained = true;

    let currentSibling, nextSibling;

    if (before === undefined) {
      moveBounds(opcode, this.marker);
    } else {
      currentSibling = opcode.lastNode().nextSibling;
      nextSibling = before.firstNode();

      // Items are moved throughout the algorithm, so there are cases where the
      // the items already happen to be siblings (e.g. an item in between was
      // moved before this move happened). Check to see if they are siblings
      // first before doing the move.
      if (currentSibling !== nextSibling) {
        moveBounds(opcode, nextSibling);
      }
    }

    opcode.index = children.length;
    children.push(opcode);

    if (LOCAL_DEBUG) {
      let type = currentSibling && currentSibling === nextSibling ? 'move-retain' : 'move';
      logStep!('list-updates', [type, item.key]);
    }
  }

  private deleteItem(opcode: ListItemOpcode) {
    if (LOCAL_DEBUG) {
      logStep!('list-updates', ['delete', opcode.key]);
    }

    destroy(opcode);
    clear(opcode);
    this.opcodeMap.delete(opcode.key);
  }
}

class UpdatingVMFrame {
  private current = 0;

  constructor(private ops: UpdatingOpcode[], private exceptionHandler: Option<ExceptionHandler>) {}

  goto(index: number) {
    this.current = index;
  }

  nextStatement(): UpdatingOpcode | undefined {
    return this.ops[this.current++];
  }

  handleException() {
    if (this.exceptionHandler) {
      this.exceptionHandler.handleException();
    }
  }
}
