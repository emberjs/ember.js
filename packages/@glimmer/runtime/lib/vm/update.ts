import { Scope, DynamicScope, Environment } from '../environment';
import { DestroyableBounds, clear, move as moveBounds } from '../bounds';
import { ElementStack, Tracker, UpdatableTracker } from '../builder';
import { Option, Opaque, Stack, LinkedList, Dict, dict, expect } from '@glimmer/util';
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
  INITIAL
} from '@glimmer/reference';
import { Constants, OpcodeJSON, UpdatingOpcode, UpdatingOpSeq } from '../opcodes';
import { DOMChanges } from '../dom/helper';
import * as Simple from '../dom/interfaces';


import VM, { EvaluationStack } from './append';

export default class UpdatingVM {
  public env: Environment;
  public dom: DOMChanges;
  public alwaysRevalidate: boolean;
  public constants: Constants;

  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();

  constructor(env: Environment, { alwaysRevalidate = false }) {
    this.env = env;
    this.constants = env.constants;
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
    this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
  }

  throw() {
    this.frame.handleException();
    this.frameStack.pop();
  }

  evaluateOpcode(opcode: UpdatingOpcode) {
    opcode.evaluate(this);
  }
}

export interface ExceptionHandler {
  handleException(): void;
}

export interface VMState {
  env: Environment;
  scope: Scope;
  dynamicScope: DynamicScope;
  stack: EvaluationStack;
  bp: number;
}

export abstract class BlockOpcode extends UpdatingOpcode implements DestroyableBounds {
  public type = "block";
  public next = null;
  public prev = null;
  public children: LinkedList<UpdatingOpcode>;

  protected env: Environment;
  protected scope: Scope;
  protected dynamicScope: DynamicScope;
  protected stack: EvaluationStack;
  protected bp: number;
  protected bounds: DestroyableBounds;

  constructor(public start: number, public end: number, state: VMState, bounds: DestroyableBounds, children: LinkedList<UpdatingOpcode>) {
    super();
    let { env, scope, dynamicScope, stack, bp } = state;
    this.children = children;
    this.env = env;
    this.scope = scope;
    this.dynamicScope = dynamicScope;
    this.stack = stack;
    this.bp = bp;
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

  destroy() {
    this.bounds.destroy();
  }

  didDestroy() {
    this.env.didDestroy(this.bounds);
  }

  toJSON() : OpcodeJSON {
    let details = dict<string>();

    details["guid"] = `${this._guid}`;

    return {
      guid: this._guid,
      type: this.type,
      details,
      children: this.children.toArray().map(op => op.toJSON())
    };
  }
}

export class TryOpcode extends BlockOpcode implements ExceptionHandler {
  public type = "try";

  private _tag: TagWrapper<UpdatableTag>;

  protected bounds: UpdatableTracker;

  constructor(start: number, end: number, state: VMState, bounds: UpdatableTracker, children: LinkedList<UpdatingOpcode>) {
    super(start, end, state, bounds, children);
    this.tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
  }

  didInitializeChildren() {
    this._tag.inner.update(combineSlice(this.children));
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, this);
  }

  handleException() {
    let { env, scope, start, end, dynamicScope, stack, bp } = this;

    let elementStack = ElementStack.resume(
      this.env,
      this.bounds,
      this.bounds.reset(env)
    );

    let vm = new VM(env, scope, dynamicScope, elementStack);
    let result = vm.resume(start, end, stack.snapshot(), bp);

    this.children = result.opcodes();
    this.didInitializeChildren();
  }

  toJSON() : OpcodeJSON {
    let json = super.toJSON();

    let details = json["details"];
    if (!details) {
      details = json["details"] = {};
    }

    return super.toJSON();
  }
}

class ListRevalidationDelegate implements IteratorSynchronizerDelegate {
  private map: Dict<BlockOpcode>;
  private updating: LinkedList<UpdatingOpcode>;

  private didInsert = false;
  private didDelete = false;

  constructor(private opcode: ListBlockOpcode, private marker: Simple.Comment) {
    this.map = opcode.map;
    this.updating = opcode['children'];
  }

  insert(key: string, item: PathReference<Opaque>, memo: PathReference<Opaque>, before: string) {
    let { map, opcode, updating } = this;
    let nextSibling: Option<Simple.Node> = null;
    let reference: Option<BlockOpcode> = null;

    if (before) {
      reference = map[before];
      nextSibling = reference['bounds'].firstNode();
    } else {
      nextSibling = this.marker;
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode: Option<TryOpcode> = null;

    let { start, end } = opcode;

    vm.execute(start, end, vm => {
      map[key] = tryOpcode = vm.iterate(start, end, memo, item, vm.updating());
    });

    tryOpcode!.didInitializeChildren();

    updating.insertBefore(tryOpcode!, reference);

    this.didInsert = true;
  }

  retain(_key: string, _item: PathReference<Opaque>, _memo: PathReference<Opaque>) {
  }

  move(key: string, _item: PathReference<Opaque>, _memo: PathReference<Opaque>, before: string) {
    let { map, updating } = this;

    let entry = map[key];
    let reference = map[before] || null;

    if (before) {
      moveBounds(entry, reference.firstNode());
    } else {
      moveBounds(entry, this.marker);
    }

    updating.remove(entry);
    updating.insertBefore(entry, reference);
  }

  delete(key: string) {
    let { map } = this;
    let opcode = map[key];
    opcode.didDestroy();
    clear(opcode);
    this.updating.remove(opcode);
    delete map[key];

    this.didDelete = true;
  }

  done() {
    this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
  }
}

export class ListBlockOpcode extends BlockOpcode {
  public type = "list-block";
  public map = dict<BlockOpcode>();
  public artifacts: IterationArtifacts;

  private lastIterated: Revision = INITIAL;
  private _tag: TagWrapper<UpdatableTag>;

  constructor(start: number, end: number, state: VMState, bounds: Tracker, children: LinkedList<UpdatingOpcode>, artifacts: IterationArtifacts) {
    super(start, end, state, bounds, children);
    this.artifacts = artifacts;
    let _tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
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
      dom.insertAfter(bounds.parentElement(), marker, expect(bounds.lastNode(), "can't insert after an empty bounds"));

      let target = new ListRevalidationDelegate(this, marker);
      let synchronizer = new IteratorSynchronizer({ target, artifacts });

      synchronizer.sync();

      this.parentElement().removeChild(marker);
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  vmForInsertion(nextSibling: Option<Simple.Node>): VM {
    let { env, scope, dynamicScope } = this;

    let elementStack = ElementStack.forInitialRender(
      this.env,
      this.bounds.parentElement(),
      nextSibling
    );

    return new VM(env, scope, dynamicScope, elementStack);
  }

  toJSON() : OpcodeJSON {
    let json = super.toJSON();
    let map = this.map;

    let inner = Object.keys(map).map(key => {
      return `${JSON.stringify(key)}: ${map[key]._guid}`;
    }).join(", ");

    let details = json["details"];
    if (!details) {
      details = json["details"] = {};
    }

    details["map"] = `{${inner}}`;

    return json;
  }
}

class UpdatingVMFrame {
  private current: Option<UpdatingOpcode>;

  constructor(private vm: UpdatingVM, private ops: UpdatingOpSeq, private exceptionHandler: Option<ExceptionHandler>) {
    this.vm = vm;
    this.ops = ops;
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
