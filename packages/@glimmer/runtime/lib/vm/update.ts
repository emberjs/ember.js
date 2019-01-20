import {
  Bounds,
  DynamicScope,
  Environment,
  ExceptionHandler,
  GlimmerTreeChanges,
  JitOrAotBlock,
  RuntimeContext,
  Scope,
  TemplateMeta,
  AotRuntimeContext,
  JitRuntimeContext,
  ElementBuilder,
  LiveBlock,
  UpdatableBlock,
} from '@glimmer/interfaces';
import {
  // Tags
  combine,
  combineSlice,
  CONSTANT_TAG,
  INITIAL,
  IterationArtifacts,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate,
  PathReference,
  Revision,
  Tag,
  TagWrapper,
  UpdatableTag,
  END,
} from '@glimmer/reference';
import { associate, expect, LinkedList, Option, Stack } from '@glimmer/util';
import { SimpleComment, SimpleNode } from '@simple-dom/interface';
import { move as moveBounds } from '../bounds';
import { asyncReset, detach } from '../lifetime';
import { UpdatingOpcode, UpdatingOpSeq } from '../opcodes';
import { InternalVM, VmInitCallback, JitVM } from './append';
import { NewElementBuilder } from './element-builder';

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

export interface VMState {
  readonly pc: number;
  readonly scope: Scope<JitOrAotBlock>;
  readonly dynamicScope: DynamicScope;
  readonly stack: unknown[];
}

export interface ResumableVMState<V extends InternalVM> {
  resume(runtime: RuntimeContext<TemplateMeta>, builder: ElementBuilder): V;
}

export class ResumableVMStateImpl<V extends InternalVM> implements ResumableVMState<V> {
  constructor(readonly state: VMState, private resumeCallback: VmInitCallback<V>) {}

  resume(
    runtime: V extends JitVM ? JitRuntimeContext : AotRuntimeContext,
    builder: ElementBuilder
  ): V {
    return this.resumeCallback(runtime, this.state, builder);
  }
}

export abstract class BlockOpcode extends UpdatingOpcode implements Bounds {
  public type = 'block';
  public next = null;
  public prev = null;
  readonly children: LinkedList<UpdatingOpcode>;

  protected readonly bounds: LiveBlock;

  constructor(
    protected state: ResumableVMState<InternalVM>,
    protected runtime: RuntimeContext<TemplateMeta>,
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
    state: ResumableVMState<InternalVM>,
    runtime: RuntimeContext<TemplateMeta>,
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
    let vm = state.resume(runtime, elementStack);

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
  private map: Map<unknown, BlockOpcode>;
  private updating: LinkedList<UpdatingOpcode>;

  private didInsert = false;
  private didDelete = false;

  constructor(private opcode: ListBlockOpcode, private marker: SimpleComment) {
    this.map = opcode.map;
    this.updating = opcode['children'];
  }

  insert(
    _env: Environment,
    key: unknown,
    item: PathReference<unknown>,
    memo: PathReference<unknown>,
    before: unknown
  ) {
    let { map, opcode, updating } = this;
    let nextSibling: Option<SimpleNode> = null;
    let reference: Option<BlockOpcode> = null;

    if (typeof before === 'string') {
      reference = map.get(before)!;
      nextSibling = reference['bounds'].firstNode();
    } else {
      nextSibling = this.marker;
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode: Option<TryOpcode> = null;

    vm.execute(vm => {
      tryOpcode = vm.iterate(memo, item);
      map.set(key, tryOpcode);
      vm.pushUpdating(new LinkedList<UpdatingOpcode>());
      vm.updateWith(tryOpcode);
      vm.pushUpdating(tryOpcode.children);
    });

    updating.insertBefore(tryOpcode!, reference);

    this.didInsert = true;
  }

  retain(
    _env: Environment,
    _key: unknown,
    _item: PathReference<unknown>,
    _memo: PathReference<unknown>
  ) {}

  move(
    _env: Environment,
    key: unknown,
    _item: PathReference<unknown>,
    _memo: PathReference<unknown>,
    before: unknown
  ) {
    let { map, updating } = this;

    let entry = map.get(key)!;

    if (before === END) {
      moveBounds(entry, this.marker);
      updating.remove(entry);
      updating.append(entry);
    } else {
      let reference = map.get(before)!;
      moveBounds(entry, reference.firstNode());
      updating.remove(entry);
      updating.insertBefore(entry, reference);
    }
  }

  delete(env: Environment, key: unknown) {
    let { map, updating } = this;
    let opcode = map.get(key)!;
    detach(opcode, env);
    updating.remove(opcode);
    map.delete(key);

    this.didDelete = true;
  }

  done() {
    this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
  }
}

export class ListBlockOpcode extends BlockOpcode {
  public type = 'list-block';
  public map = new Map<unknown, BlockOpcode>();
  public artifacts: IterationArtifacts;
  public tag: Tag;

  private lastIterated: Revision = INITIAL;
  private _tag: TagWrapper<UpdatableTag>;

  constructor(
    state: ResumableVMState<InternalVM>,
    runtime: RuntimeContext<TemplateMeta>,
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

  vmForInsertion(nextSibling: Option<SimpleNode>): InternalVM<JitOrAotBlock> {
    let { bounds, state, runtime } = this;

    let elementStack = NewElementBuilder.forInitialRender(runtime.env, {
      element: bounds.parentElement(),
      nextSibling,
    });

    return state.resume(runtime, elementStack);
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
