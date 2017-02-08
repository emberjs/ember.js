import { Scope, Environment, Opcode } from '../environment';
import { Reference, PathReference, ReferenceIterator } from '@glimmer/reference';
import { Option, unwrap } from '@glimmer/util';
import { Block } from '../scanner';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { Component, ComponentManager } from '../component/interfaces';

export class CapturedFrame {
  constructor(
    public operand: Option<PathReference<any>>,
    public args: Option<EvaluatedArgs>,
    public condition: Option<Reference<boolean>>
  ) {}
}

interface VolatileRegisters {
  immediate: any;
  callerScope: Option<Scope>;
  blocks: Option<Blocks>;
  iterator: Option<ReferenceIterator>;
  key: Option<string>;
  component: Component;
  manager: Option<ComponentManager<Component>>;
}

interface SavedRegisters {
  operand: Option<PathReference<any>>;
  args: Option<EvaluatedArgs>;
  condition: Option<Reference<boolean>>;
}

function volatileRegisters(component: Component, manager: Option<ComponentManager<Component>>): VolatileRegisters {
  return {
    immediate: null,
    callerScope: null,
    blocks: null,
    iterator: null,
    key: null,
    component,
    manager,
  };
}

function savedRegisters(): SavedRegisters {
  return {
    operand: null,
    args: null,
    condition: null
  };
}

const FREED: any = null;

class Frame {
  ip: number;
  volatile: VolatileRegisters;
  saved: SavedRegisters;

  constructor(
    public start: number,
    public end: number,
    component: Component = null,
    manager: Option<ComponentManager<Component>> = null,
  ) {
    this.ip = start;
    this.volatile = volatileRegisters(component, manager);
    this.saved = savedRegisters();
  }

  capture(): CapturedFrame {
    let { operand, args, condition } = this.saved;
    return new CapturedFrame(operand, args, condition);
  }

  restore(frame: CapturedFrame) {
    this.saved.operand = frame.operand;
    this.saved.args = frame.args;
    this.saved.condition = frame.condition;
  }

  dealloc() {
    this.volatile = FREED;
    this.saved = FREED;
  }
}

export interface Blocks {
  default: Option<Block>;
  inverse: Option<Block>;
}

export class FrameStack {
  private frames: Frame[] = [];
  private frame: number = -1;

  private get currentFrame(): Frame {
    return this.frames[this.frame];
  }

  push(start: number, end: number, component: Component = null, manager: Option<ComponentManager<Component>> = null) {
    let pos = ++this.frame;

    if (pos < this.frames.length) {
      let frame = this.frames[pos];
      Frame.call(frame, start, end, component, manager);
    } else {
      this.frames[pos] = new Frame(start, end, component, manager);
    }
  }

  pop() {
    this.currentFrame.dealloc();
    this.frame--;
  }

  capture(): CapturedFrame {
    return this.currentFrame.capture();
  }

  restore(frame: CapturedFrame) {
    this.currentFrame.restore(frame);
  }

  getStart(): number {
    return this.currentFrame.start;
  }

  getEnd(): number {
    return this.currentFrame.end;
  }

  getCurrent(): number {
    return this.currentFrame.ip;
  }

  setCurrent(ip: number): number {
    return this.currentFrame.ip = ip;
  }

  getOperand<T>(): PathReference<T> {
    return unwrap(this.currentFrame.saved.operand);
  }

  setOperand<T>(operand: PathReference<T>): PathReference<T> {
    return this.currentFrame.saved.operand = operand;
  }

  getImmediate<T>(): T {
    return this.currentFrame.volatile.immediate;
  }

  setImmediate<T>(value: T): T {
    return this.currentFrame.volatile.immediate = value;
  }

  // FIXME: These options are required in practice by the existing code, but
  // figure out why.

  getArgs(): Option<EvaluatedArgs> {
    return this.currentFrame.saved.args;
  }

  setArgs(args: EvaluatedArgs): EvaluatedArgs {
    return this.currentFrame.saved.args = args;
  }

  getCondition(): Reference<boolean> {
    return unwrap(this.currentFrame.saved.condition);
  }

  setCondition(condition: Reference<boolean>): Reference<boolean> {
    return this.currentFrame.saved.condition = condition;
  }

  getIterator(): ReferenceIterator {
    return unwrap(this.currentFrame.volatile.iterator);
  }

  setIterator(iterator: ReferenceIterator): ReferenceIterator {
    return this.currentFrame.volatile.iterator = iterator;
  }

  getKey(): Option<string> {
    return this.currentFrame.volatile.key;
  }

  setKey(key: string): string {
    return this.currentFrame.volatile.key = key;
  }

  getBlocks(): Blocks {
    return unwrap(this.currentFrame.volatile.blocks);
  }

  setBlocks(blocks: Blocks): Blocks {
    return this.currentFrame.volatile.blocks = blocks;
  }

  getCallerScope(): Scope {
    return unwrap(this.currentFrame.volatile.callerScope);
  }

  setCallerScope(callerScope: Scope): Scope {
    return this.currentFrame.volatile.callerScope = callerScope;
  }

  getComponent(): Component {
    return unwrap(this.currentFrame.volatile.component);
  }

  getManager(): ComponentManager<Component> {
    return unwrap(this.currentFrame.volatile.manager);
  }

  goto(ip: number) {
    this.setCurrent(ip);
  }

  hasOpcodes(): boolean {
    return this.frame !== -1;
  }

  nextStatement(env: Environment): Option<Opcode> {
    let frame = this.currentFrame;
    let ip = frame.ip;
    let end = frame.end;

    if (ip <= end) {
      let program = env.program;
      frame.ip += 4;
      return program.opcode(ip);
    } else {
      this.pop();
      return null;
    }
  }
}
