import { Scope, DynamicScope, Environment } from '../environment';
import { Bounds, clear, move as moveBounds } from '../bounds';
import { ElementStack, Tracker } from '../builder';
import { Stack, LinkedList, InternedString, Dict, dict } from 'glimmer-util';
import { ConstReference, Destroyable, PathReference, IterationArtifacts, IteratorSynchronizer, IteratorSynchronizerDelegate } from 'glimmer-reference';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { OpcodeJSON, OpSeq, UpdatingOpcode, UpdatingOpSeq } from '../opcodes';
import { LabelOpcode } from '../compiled/opcodes/vm';
import { DOMHelper } from '../dom';

import VM from './append';

export default class UpdatingVM {
  public env: Environment;
  public dom: DOMHelper;
  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();

  constructor(env: Environment) {
    this.env = env;
    this.dom = env.getDOM();
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

      opcode.evaluate(this);
    }
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
  block: Tracker;
}

export interface BlockOpcodeOptions {
  ops: OpSeq;
  state: VMState;
  updating: LinkedList<UpdatingOpcode>;
}

export abstract class BlockOpcode extends UpdatingOpcode implements Bounds, Destroyable {
  public type = "block";
  public next = null;
  public prev = null;

  protected env: Environment;
  protected scope: Scope;
  protected dynamicScope: DynamicScope;
  protected updating: LinkedList<UpdatingOpcode>;
  protected bounds: Tracker;
  public ops: OpSeq;

  constructor({ ops, updating, state }: BlockOpcodeOptions) {
    super();
    let { env, scope, dynamicScope, block } = state;
    this.ops = ops;
    this.updating = updating;
    this.env = env;
    this.scope = scope;
    this.dynamicScope = dynamicScope;
    this.bounds = block;
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
    vm.try(this.updating, null);
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
      children: this.updating.toArray().map(op => op.toJSON())
    };
  }
}

export class TryOpcode extends BlockOpcode implements UpdatingOpcode, ExceptionHandler, Destroyable {
  public type = "try";

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, this);
  }

  handleException() {
    let { env, scope, dynamicScope } = this;

    let elementStack = ElementStack.resume({
      dom: this.env.getDOM(),
      tracker: this.bounds,
      nextSibling: this.bounds.reset(env)
    });

    let vm = new VM({ env, scope, dynamicScope, elementStack });
    let result = vm.execute(this.ops);

    this.updating = result.opcodes();
  }

  destroy() {
    this.bounds.destroy();
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

export class ListRevalidationDelegate implements IteratorSynchronizerDelegate {
  private opcode: ListBlockOpcode;
  private map: Dict<BlockOpcode>;
  private updating: LinkedList<UpdatingOpcode>;
  private marker: Comment;

  constructor(opcode: ListBlockOpcode, marker: Comment) {
    this.opcode = opcode;
    this.map = opcode.map;
    this.updating = opcode['updating'];
    this.marker = marker;
  }

  insert(key: InternedString, item: PathReference<any>, before: InternedString) {
    let { map, opcode, updating } = this;
    let nextSibling: Node = null;
    let reference = null;

    if (before) {
      reference = map[<string>before];
      nextSibling = reference.bounds.firstNode();
    } else {
      nextSibling = this.marker;
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode;

    vm.execute(opcode.ops, vm => {
      vm.frame.setArgs(EvaluatedArgs.positional([item]));
      vm.frame.setOperand(item);
      vm.frame.setCondition(new ConstReference(true));
      vm.frame.setKey(key);

      let state = vm.capture();

      tryOpcode = new TryOpcode({
        state,
        ops: opcode.ops,
        updating: vm.updatingOpcodeStack.current
      });
    });

    updating.insertBefore(tryOpcode, reference);

    map[<string>key] = tryOpcode;
  }

  retain(key: InternedString, item: PathReference<any>) {
  }

  move(key: InternedString, item: PathReference<any>, before: InternedString) {
    let { map, updating } = this;

    let entry = map[<string>key];
    let reference = map[<string>before] || null;

    if (before) {
      moveBounds(entry, reference.firstNode());
    } else {
      moveBounds(entry, this.marker);
    }

    updating.remove(entry);
    updating.insertBefore(entry, reference);
  }

  delete(key: InternedString) {
    let { map } = this;
    let opcode = map[<string>key];
    clear(opcode);
    opcode.didDestroy();
    this.updating.remove(opcode);
    delete map[<string>key];
  }

  done() {
  }
}

export interface ListBlockOpcodeOptions extends BlockOpcodeOptions {
  artifacts: IterationArtifacts;
}

export class ListBlockOpcode extends BlockOpcode {
  public type = "list-block";
  public map = dict<BlockOpcode>();
  public artifacts: IterationArtifacts;

  constructor(options: ListBlockOpcodeOptions) {
    super(options);
    this.artifacts = options.artifacts;
  }

  evaluate(vm: UpdatingVM) {
    // Revalidate list somehow....
    let { artifacts, bounds } = this;
    let { dom } = vm;

    let marker = dom.createComment('');
    dom.insertAfter(bounds.parentElement(), marker, bounds.lastNode());

    let target = new ListRevalidationDelegate(this, marker);
    let synchronizer = new IteratorSynchronizer({ target, artifacts });

    synchronizer.sync();

    this.parentElement().removeChild(marker);

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  vmForInsertion(nextSibling: Node) {
    let { env, scope, dynamicScope } = this;

    let elementStack = ElementStack.forInitialRender({
      dom: this.env.getDOM(),
      parentNode: this.bounds.parentElement(),
      nextSibling
    });

    return new VM({ env, scope, dynamicScope, elementStack });
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

export class UpdatingVMFrame {
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

  nextStatement(): UpdatingOpcode {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  handleException() {
    this.exceptionHandler.handleException();
  }
}
