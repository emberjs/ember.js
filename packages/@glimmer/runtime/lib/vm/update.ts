import { Scope, DynamicScope, Environment } from '../environment';
import { move as moveBounds } from '../bounds';
import { NewElementBuilder, LiveBlock, UpdatableBlock } from './element-builder';
import { Option, Opaque, Stack, LinkedList, Dict, dict, expect, associate } from '@glimmer/util';
import {
  PathReference,
  IterationArtifacts,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate,

  // Tags
  combine,
  Revision,
  UpdatableTag,
  TagWrapper,
  combineSlice,
  CONSTANT_TAG,
  INITIAL,
  Tag,
} from '@glimmer/reference';
import { UpdatingOpcode, UpdatingOpSeq } from '../opcodes';
import { DOMChanges } from '../dom/helper';
import { Simple, Bounds } from '@glimmer/interfaces';

import VM, { RuntimeProgram } from './append';
import { asyncReset, detach } from '../lifetime';

export default class UpdatingVM {
  public env: Environment;
  public dom: DOMChanges;
  public alwaysRevalidate: boolean;

  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();

  constructor(env: Environment, { alwaysRevalidate = false }) {
    this.env = env;
    this.dom = env.getDOM();
    this.alwaysRevalidate = alwaysRevalidate;
  }

  execute(opcodes: UpdatingOpSeq, handler: ExceptionHandler) {
    let { frameStack } = this;

    this.try(opcodes, handler);

    while (true) {
      if (frameStack.isEmpty()) break;

      let opcode = this.frame.nextStatement();

      if (opcode === null) {
        this.frameStack.pop();
        continue;
      }

      opcode.evaluate(this);
    }
  }

  private get frame() {
    return expect(this.frameStack.current, 'bug: expected a frame');
  }

  goto(op: UpdatingOpcode) {
    this.frame.goto(op);
  }

  try(ops: UpdatingOpSeq, handler: Option<ExceptionHandler>) {
    this.frameStack.push(new UpdatingVMFrame(ops, handler));
  }

  throw() {
    this.frame.handleException();
    this.frameStack.pop();
  }
}

export interface ExceptionHandler {
  handleException(): void;
}

/**
  The Runtime is the set of static structures that contain the compiled
  code and any host configuration.

  The contents of the Runtime do not change as the VM executes, unlike
  the VM state.
 */
export interface Runtime {
  env: Environment;
  program: RuntimeProgram<Opaque>;
}

export interface VMState {
  pc: number;
  scope: Scope;
  dynamicScope: DynamicScope;
  stack: Opaque[];
}

export abstract class BlockOpcode extends UpdatingOpcode implements Bounds {
  public type = 'block';
  public next = null;
  public prev = null;
  readonly children: LinkedList<UpdatingOpcode>;

  protected readonly bounds: LiveBlock;

  constructor(
    protected state: VMState,
    protected runtime: Runtime,
    bounds: LiveBlock,
    children: LinkedList<UpdatingOpcode>
  ) {
    super();

    this.children = children;
    this.bounds = bounds;
  }

  abstract didInitializeChildren(): void;

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

  public tag: Tag;

  private _tag: TagWrapper<UpdatableTag>;

  protected bounds!: UpdatableBlock; // Hides property on base class

  constructor(
    state: VMState,
    runtime: Runtime,
    bounds: UpdatableBlock,
    children: LinkedList<UpdatingOpcode>
  ) {
    super(state, runtime, bounds, children);
    this.tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
  }

  didInitializeChildren() {
    this._tag.inner.update(combineSlice(this.children));
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, this);
  }

  handleException() {
    let { state, bounds, children, prev, next, runtime } = this;

    children.clear();
    asyncReset(this, runtime.env);

    let elementStack = NewElementBuilder.resume(runtime.env, bounds);
    let vm = VM.resume(state, runtime, elementStack);

    let updating = new LinkedList<UpdatingOpcode>();

    let result = vm.execute(vm => {
      vm.pushUpdating(updating);
      vm.updateWith(this);
      vm.pushUpdating(children);
    });

    associate(this, result.drop);

    this.prev = prev;
    this.next = next;
  }
}

class ListRevalidationDelegate implements IteratorSynchronizerDelegate<Environment> {
  private map: Dict<BlockOpcode>;
  private updating: LinkedList<UpdatingOpcode>;

  private didInsert = false;
  private didDelete = false;

  constructor(private opcode: ListBlockOpcode, private marker: Simple.Comment) {
    this.map = opcode.map;
    this.updating = opcode['children'];
  }

  insert(
    _env: Environment,
    key: string,
    item: PathReference<Opaque>,
    memo: PathReference<Opaque>,
    before: string
  ) {
    let { map, opcode, updating } = this;
    let nextSibling: Option<Simple.Node> = null;
    let reference: Option<BlockOpcode> = null;

    if (typeof before === 'string') {
      reference = map[before];
      nextSibling = reference['bounds'].firstNode();
    } else {
      nextSibling = this.marker;
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode: Option<TryOpcode> = null;

    vm.execute(vm => {
      map[key] = tryOpcode = vm.iterate(memo, item);
      vm.pushUpdating(new LinkedList<UpdatingOpcode>());
      vm.updateWith(tryOpcode);
      vm.pushUpdating(tryOpcode.children);
    });

    updating.insertBefore(tryOpcode!, reference);

    this.didInsert = true;
  }

  retain(
    _env: Environment,
    _key: string,
    _item: PathReference<Opaque>,
    _memo: PathReference<Opaque>
  ) {}

  move(
    _env: Environment,
    key: string,
    _item: PathReference<Opaque>,
    _memo: PathReference<Opaque>,
    before: string
  ) {
    let { map, updating } = this;

    let entry = map[key];
    let reference = map[before] || null;

    if (typeof before === 'string') {
      moveBounds(entry, reference.firstNode());
    } else {
      moveBounds(entry, this.marker);
    }

    updating.remove(entry);
    updating.insertBefore(entry, reference);
  }

  delete(env: Environment, key: string) {
    let { map, updating } = this;
    let opcode = map[key];
    detach(opcode, env);
    updating.remove(opcode);
    delete map[key];

    this.didDelete = true;
  }

  done() {
    this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
  }
}

export class ListBlockOpcode extends BlockOpcode {
  public type = 'list-block';
  public map = dict<BlockOpcode>();
  public artifacts: IterationArtifacts;
  public tag: Tag;

  private lastIterated: Revision = INITIAL;
  private _tag: TagWrapper<UpdatableTag>;

  constructor(
    state: VMState,
    runtime: Runtime,
    bounds: LiveBlock,
    children: LinkedList<UpdatingOpcode>,
    artifacts: IterationArtifacts
  ) {
    super(state, runtime, bounds, children);
    this.artifacts = artifacts;
    let _tag = (this._tag = UpdatableTag.create(CONSTANT_TAG));
    this.tag = combine([artifacts.tag, _tag]);
  }

  didInitializeChildren(listDidChange = true) {
    this.lastIterated = this.artifacts.tag.value();

    if (listDidChange) {
      this._tag.inner.update(combineSlice(this.children));
    }
  }

  evaluate(vm: UpdatingVM) {
    let { artifacts, lastIterated } = this;

    if (!artifacts.tag.validate(lastIterated)) {
      let { bounds } = this;
      let { dom } = vm;

      let marker = dom.createComment('');
      dom.insertAfter(
        bounds.parentElement(),
        marker,
        expect(bounds.lastNode(), "can't insert after an empty bounds")
      );

      let target = new ListRevalidationDelegate(this, marker);
      let synchronizer = new IteratorSynchronizer({ target, artifacts, env: vm.env });

      synchronizer.sync();

      this.parentElement().removeChild(marker);
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  vmForInsertion(nextSibling: Option<Simple.Node>): VM<Opaque> {
    let { bounds, state, runtime } = this;

    let elementStack = NewElementBuilder.forInitialRender(runtime.env, {
      element: bounds.parentElement(),
      nextSibling,
    });

    return VM.resume(state, runtime, elementStack);
  }
}

class UpdatingVMFrame {
  private current: Option<UpdatingOpcode>;

  constructor(private ops: UpdatingOpSeq, private exceptionHandler: Option<ExceptionHandler>) {
    this.current = ops.head();
  }

  goto(op: UpdatingOpcode) {
    this.current = op;
  }

  nextStatement(): Option<UpdatingOpcode> {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  handleException() {
    if (this.exceptionHandler) {
      this.exceptionHandler.handleException();
    }
  }
}
