import { Scope, Environment, Opcode } from '../environment';
import { Reference, PathReference, ReferenceIterator } from '@glimmer/reference';
import { TRUST, Option, unwrap, expect } from '@glimmer/util';
import { InlineBlock } from '../scanner';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { Component, ComponentManager } from '../component/interfaces';

export class CapturedFrame {
  constructor(
    public operand: Option<PathReference<any>>,
    public args: Option<EvaluatedArgs>,
    public condition: Option<Reference<boolean>>
  ) {}
}

class Frame {
  ip: number;
  operand: Option<PathReference<any>> = null;
  immediate: any = null;
  args: Option<EvaluatedArgs> = null;
  callerScope: Option<Scope> = null;
  blocks: Option<Blocks> = null;
  condition: Option<Reference<boolean>> = null;
  iterator: Option<ReferenceIterator> = null;
  key: Option<string> = null;

  constructor(
    public start: number,
    public end: number,
    public component: Component = null,
    public manager: Option<ComponentManager<Component>> = null,
    public shadow: Option<InlineBlock> = null
  ) {
    this.ip = start;
  }

  capture(): CapturedFrame {
    return new CapturedFrame(this.operand, this.args, this.condition);
  }

  restore(frame: CapturedFrame) {
    this.operand = frame['operand'];
    this.args = frame['args'];
    this.condition = frame['condition'];
  }
}

export interface Blocks {
  default: Option<InlineBlock>;
  inverse: Option<InlineBlock>;
}

export class FrameStack {
  private frames: Frame[] = [];
  private frame: Option<number> = null;

  private get currentFrame(): Frame {
    return this.frames[unwrap(this.frame)];
  }

  push(start: number, end: number, component: Component = null, manager: Option<ComponentManager<Component>> = null, shadow: Option<InlineBlock> = null) {
    let frame = (this.frame === null) ? (this.frame = 0) : ++this.frame;

    if (this.frames.length <= frame) {
      this.frames.push(null as TRUST<Frame, 'the null is replaced on the next line'>);
    }

    this.frames[frame] = new Frame(start, end, component, manager, shadow);
  }

  pop() {
    let { frames, frame } = this;
    frames[expect(frame, 'only pop after pushing')] = null as TRUST<Frame, "this frame won't be accessed anymore">;
    this.frame = frame === 0 ? null : frame - 1;
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
    return unwrap(this.currentFrame.operand);
  }

  setOperand<T>(operand: PathReference<T>): PathReference<T> {
    return this.currentFrame.operand = operand;
  }

  getImmediate<T>(): T {
    return this.currentFrame.immediate;
  }

  setImmediate<T>(value: T): T {
    return this.currentFrame.immediate = value;
  }

  // FIXME: These options are required in practice by the existing code, but
  // figure out why.

  getArgs(): Option<EvaluatedArgs> {
    return this.currentFrame.args;
  }

  setArgs(args: EvaluatedArgs): EvaluatedArgs {
    return this.currentFrame.args = args;
  }

  getCondition(): Reference<boolean> {
    return unwrap(this.currentFrame.condition);
  }

  setCondition(condition: Reference<boolean>): Reference<boolean> {
    return this.currentFrame.condition = condition;
  }

  getIterator(): ReferenceIterator {
    return unwrap(this.currentFrame.iterator);
  }

  setIterator(iterator: ReferenceIterator): ReferenceIterator {
    return this.currentFrame.iterator = iterator;
  }

  getKey(): Option<string> {
    return this.currentFrame.key;
  }

  setKey(key: string): string {
    return this.currentFrame.key = key;
  }

  getBlocks(): Blocks {
    return unwrap(this.currentFrame.blocks);
  }

  setBlocks(blocks: Blocks): Blocks {
    return this.currentFrame.blocks = blocks;
  }

  getCallerScope(): Scope {
    return unwrap(this.currentFrame.callerScope);
  }

  setCallerScope(callerScope: Scope): Scope {
    return this.currentFrame.callerScope = callerScope;
  }

  getComponent(): Component {
    return unwrap(this.currentFrame.component);
  }

  getManager(): ComponentManager<Component> {
    return unwrap(this.currentFrame.manager);
  }

  getShadow(): Option<InlineBlock> {
    return this.currentFrame.shadow;
  }

  goto(ip: number) {
    this.setCurrent(ip);
  }

  hasOpcodes(): boolean {
    return this.frame !== null;
  }

  nextStatement(env: Environment): Option<Opcode> {
    let frame = this.frames[unwrap(this.frame)];
    let ip = frame.ip;
    let end = frame.end;

    if (ip < end) {
      let program = env.program;
      frame.ip += 4;
      return program.opcode(ip);
    } else {
      this.pop();
      return null;
    }
  }
}
