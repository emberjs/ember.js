import { Scope } from '../environment';
import { Reference, PathReference, ReferenceIterator } from 'glimmer-reference';
import { TRUST, Option, unwrap, expect } from 'glimmer-util';
import { InlineBlock } from '../scanner';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { Opcode, OpSeq } from '../opcodes';
import { LabelOpcode } from '../compiled/opcodes/vm';
import { Component, ComponentManager } from '../component/interfaces';

export class CapturedFrame {
  constructor(
    private operand: Option<PathReference<any>>,
    private args: Option<EvaluatedArgs>,
    private condition: Option<Reference<boolean>>
  ) {}
}

class Frame {
  ops: OpSeq;
  op: Opcode;
  operand: Option<PathReference<any>> = null;
  immediate: any = null;
  args: Option<EvaluatedArgs> = null;
  callerScope: Option<Scope> = null;
  blocks: Option<Blocks> = null;
  condition: Option<Reference<boolean>> = null;
  iterator: Option<ReferenceIterator> = null;
  key: Option<string> = null;

  constructor(
    ops: OpSeq,
    public component: Component = null,
    public manager: Option<ComponentManager<Component>> = null,
    public shadow: Option<InlineBlock> = null
  ) {
    this.ops = ops;
    this.op = ops.head();
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

  push(ops: OpSeq, component: Component = null, manager: Option<ComponentManager<Component>> = null, shadow: Option<InlineBlock> = null) {
    let frame = (this.frame === null) ? (this.frame = 0) : ++this.frame;

    if (this.frames.length <= frame) {
      this.frames.push(null as TRUST<Frame, 'the null is replaced on the next line'>);
    }

    this.frames[frame] = new Frame(ops, component, manager, shadow);
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

  getOps(): OpSeq {
    return this.currentFrame.ops;
  }

  getCurrent(): Opcode {
    return this.currentFrame.op;
  }

  setCurrent(op: Opcode): Opcode {
    return this.currentFrame.op = op;
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

  goto(op: LabelOpcode) {
    this.setCurrent(op);
  }

  hasOpcodes(): boolean {
    return this.frame !== null;
  }

  nextStatement(): Option<Opcode> {
    let op = this.frames[unwrap(this.frame)].op;
    let ops = this.getOps();

    if (op) {
      this.setCurrent(ops.nextNode(op));
      return op;
    } else {
      this.pop();
      return null;
    }
  }
}
