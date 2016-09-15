import { Scope, DynamicScope, Environment } from '../environment';
import { DestroyableBounds, clear, move as moveBounds } from '../bounds';
import { ElementStack, Tracker, UpdatableTracker } from '../builder';
import { LOGGER, Opaque, Stack, LinkedList, Dict, dict } from 'glimmer-util';
import {
  ConstReference,
  PathReference,
  IterationArtifacts,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate,

  // Tags
  combine,
  Revision,
  UpdatableTag,
  combineSlice,
  CONSTANT_TAG,
  INITIAL
} from 'glimmer-reference';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { OpcodeJSON, OpSeq, UpdatingOpcode, UpdatingOpSeq } from '../opcodes';
import { LabelOpcode } from '../compiled/opcodes/vm';
import { DOMChanges } from '../dom/helper';
import * as Simple from '../dom/interfaces';

import VM from './append';

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

      let opcode = this.frameStack.current.nextStatement();

      if (opcode === null) {
        this.frameStack.pop();
        continue;
      }

      LOGGER.debug(`[VM] OP ${opcode.type}`);
      LOGGER.trace(opcode);

      opcode.evaluate(this);
    }
  }

  goto(op: UpdatingOpcode) {
    this.frameStack.current.goto(op);
  }

  try(ops: UpdatingOpSeq, handler: ExceptionHandler) {
    this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
  }

  throw() {
    this.frameStack.current.handleException();
    this.frameStack.pop();
  }

  evaluateOpcode(opcode: UpdatingOpcode) {
    opcode.evaluate(this);
  }
}

export interface ExceptionHandler {
  handleException();
}

export interface VMState {
  env: Environment;
  scope: Scope;
  dynamicScope: DynamicScope;
}

export abstract class BlockOpcode extends UpdatingOpcode implements DestroyableBounds {
  public type = "block";
  public next = null;
  public prev = null;

  protected env: Environment;
  protected scope: Scope;
  protected dynamicScope: DynamicScope;
  protected children: LinkedList<UpdatingOpcode>;
  protected bounds: DestroyableBounds;
  public ops: OpSeq;

  constructor(ops: OpSeq, state: VMState, bounds: DestroyableBounds, children: LinkedList<UpdatingOpcode>) {
    super();
    let { env, scope, dynamicScope } = state;
    this.ops = ops;
    this.children = children;
    this.env = env;
    this.scope = scope;
    this.dynamicScope = dynamicScope;
    this.bounds = bounds;
  }

  abstract didInitializeChildren();

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
    let begin = this.ops.head() as LabelOpcode;
    let end = this.ops.tail() as LabelOpcode;
    let details = dict<string>();

    details["guid"] = `${this._guid}`;
    details["begin"] = begin.inspect();
    details["end"] = end.inspect();

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

  private _tag: UpdatableTag;

  protected bounds: UpdatableTracker;

  constructor(ops: OpSeq, state: VMState, bounds: UpdatableTracker, children: LinkedList<UpdatingOpcode>) {
    super(ops, state, bounds, children);
    this.tag = this._tag = new UpdatableTag(CONSTANT_TAG);
  }

  didInitializeChildren() {
    this._tag.update(combineSlice(this.children));
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, this);
  }

  handleException() {
    let { env, scope, dynamicScope } = this;

    let elementStack = ElementStack.resume(
      this.env,
      this.bounds,
      this.bounds.reset(env)
    );

    let vm = new VM(env, scope, dynamicScope, elementStack);
    let result = vm.execute(this.ops);

    this.children = result.opcodes();
    this.didInitializeChildren();
  }

  toJSON() : OpcodeJSON {
    let json = super.toJSON();
    let begin = this.ops.head() as LabelOpcode;
    let end = this.ops.tail() as LabelOpcode;

    json["details"]["begin"] = JSON.stringify(begin.inspect());
    json["details"]["end"] = JSON.stringify(end.inspect());

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
    let nextSibling: Simple.Node = null;
    let reference = null;

    if (before) {
      reference = map[before];
      nextSibling = reference.bounds.firstNode();
    } else {
      nextSibling = this.marker;
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode: TryOpcode;

    vm.execute(opcode.ops, vm => {
      vm.frame.setArgs(EvaluatedArgs.positional([item, memo]));
      vm.frame.setOperand(item);
      vm.frame.setCondition(new ConstReference(true));
      vm.frame.setKey(key);

      let state = vm.capture();
      let tracker = vm.stack().pushUpdatableBlock();

      tryOpcode = new TryOpcode(opcode.ops, state, tracker, vm.updatingOpcodeStack.current);
    });

    tryOpcode.didInitializeChildren();

    updating.insertBefore(tryOpcode, reference);

    map[key] = tryOpcode;

    this.didInsert = true;
  }

  retain(key: string, item: PathReference<Opaque>, memo: PathReference<Opaque>) {
  }

  move(key: string, item: PathReference<Opaque>, memo: PathReference<Opaque>, before: string) {
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
    clear(opcode);
    opcode.didDestroy();
    this.updating.remove(opcode);
    delete map[key];

    this.didDelete = true;
  }

  done() {
    if (this.didInsert || this.didDelete) {
      this.opcode.didInitializeChildren();
    }
  }
}

export class ListBlockOpcode extends BlockOpcode {
  public type = "list-block";
  public map = dict<BlockOpcode>();
  public artifacts: IterationArtifacts;

  private lastIterated: Revision = INITIAL;
  private _tag: UpdatableTag;

  constructor(ops: OpSeq, state: VMState, bounds: Tracker, children: LinkedList<UpdatingOpcode>, artifacts: IterationArtifacts) {
    super(ops, state, bounds, children);
    this.artifacts = artifacts;
    let _tag = this._tag = new UpdatableTag(CONSTANT_TAG);
    this.tag = combine([artifacts.tag, _tag]);
  }

  didInitializeChildren() {
    this.lastIterated = this.artifacts.tag.value();
    this._tag.update(combineSlice(this.children));
  }

  evaluate(vm: UpdatingVM) {
    let { artifacts, lastIterated } = this;

    if (!artifacts.tag.validate(lastIterated)) {
      let { bounds } = this;
      let { dom } = vm;

      let marker = dom.createComment('');
      dom.insertAfter(bounds.parentElement(), marker, bounds.lastNode());

      let target = new ListRevalidationDelegate(this, marker);
      let synchronizer = new IteratorSynchronizer({ target, artifacts });

      synchronizer.sync();

      this.parentElement().removeChild(marker);
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  vmForInsertion(nextSibling: Simple.Node) {
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

    json["details"]["map"] = `{${inner}}`;

    return json;
  }
}

class UpdatingVMFrame {
  private vm: UpdatingVM;
  private ops: UpdatingOpSeq;
  private current: UpdatingOpcode;
  private exceptionHandler: ExceptionHandler;

  constructor(vm: UpdatingVM, ops: UpdatingOpSeq, handler: ExceptionHandler) {
    this.vm = vm;
    this.ops = ops;
    this.current = ops.head();
    this.exceptionHandler = handler;
  }

  goto(op: UpdatingOpcode) {
    this.current = op;
  }

  nextStatement(): UpdatingOpcode {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  handleException() {
    this.exceptionHandler.handleException();
  }
}
