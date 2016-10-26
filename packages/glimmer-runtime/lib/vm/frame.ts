import { Scope } from '../environment';
import { Reference, PathReference, ReferenceIterator } from 'glimmer-reference';
import { InlineBlock } from '../compiled/blocks';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { Opcode, OpSeq } from '../opcodes';
import { LabelOpcode } from '../compiled/opcodes/vm';
import { Component, ComponentManager } from '../component/interfaces';

export class CapturedFrame {
  constructor(
    private operand: PathReference<any>,
    private args: EvaluatedArgs,
    private condition: Reference<boolean>
  ) {}
}

class Frame {
  ops: OpSeq;
  op: Opcode;
  operand: PathReference<any> = null;
  immediate: any = null;
  args: EvaluatedArgs = null;
  callerScope: Scope = null;
  blocks: Blocks = null;
  condition: Reference<boolean> = null;
  iterator: ReferenceIterator = null;
  key: string = null;

  constructor(
    ops: OpSeq,
    public component: Component = null,
    public manager: ComponentManager<Component> = null,
    public shadow: string[] = null
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
  default: InlineBlock;
  inverse: InlineBlock;
}

export class FrameStack {
  private frames: Frame[] = [];
  private frame: number = undefined;

  push(ops: OpSeq, component: Component = null, manager: ComponentManager<Component> = null, shadow: string[] = null) {
    let frame = (this.frame === undefined) ? (this.frame = 0) : ++this.frame;

    if (this.frames.length <= frame) {
      this.frames.push(null);
    }

    this.frames[frame] = new Frame(ops, component, manager, shadow);
  }

  pop() {
    let { frames, frame } = this;
    frames[frame] = null;
    this.frame = frame === 0 ? undefined : frame - 1;
  }

  capture(): CapturedFrame {
    return this.frames[this.frame].capture();
  }

  restore(frame: CapturedFrame) {
    this.frames[this.frame].restore(frame);
  }

  getOps(): OpSeq {
    return this.frames[this.frame].ops;
  }

  getCurrent(): Opcode {
    return this.frames[this.frame].op;
  }

  setCurrent(op: Opcode): Opcode {
    return this.frames[this.frame].op = op;
  }

  getOperand<T>(): PathReference<T> {
    return this.frames[this.frame].operand;
  }

  setOperand<T>(operand: PathReference<T>): PathReference<T> {
    return this.frames[this.frame].operand = operand;
  }

  getImmediate<T>(): T {
    return this.frames[this.frame].immediate;
  }

  setImmediate<T>(value: T): T {
    return this.frames[this.frame].immediate = value;
  }

  getArgs(): EvaluatedArgs {
    return this.frames[this.frame].args;
  }

  setArgs(args: EvaluatedArgs): EvaluatedArgs {
    let frame = this.frames[this.frame];
    return frame.args = args;
  }

  getCondition(): Reference<boolean> {
    return this.frames[this.frame].condition;
  }

  setCondition(condition: Reference<boolean>): Reference<boolean> {
    return this.frames[this.frame].condition = condition;
  }

  getIterator(): ReferenceIterator {
    return this.frames[this.frame].iterator;
  }

  setIterator(iterator: ReferenceIterator): ReferenceIterator {
    return this.frames[this.frame].iterator = iterator;
  }

  getKey(): string {
    return this.frames[this.frame].key;
  }

  setKey(key: string): string {
    return this.frames[this.frame].key = key;
  }

  getBlocks(): Blocks {
    return this.frames[this.frame].blocks;
  }

  setBlocks(blocks: Blocks): Blocks {
    return this.frames[this.frame].blocks = blocks;
  }

  getCallerScope(): Scope {
    return this.frames[this.frame].callerScope;
  }

  setCallerScope(callerScope: Scope): Scope {
    return this.frames[this.frame].callerScope = callerScope;
  }

  getComponent(): Component {
    return this.frames[this.frame].component;
  }

  getManager(): ComponentManager<Component> {
    return this.frames[this.frame].manager;
  }

  getShadow(): string[] {
    return this.frames[this.frame].shadow;
  }

  goto(op: LabelOpcode) {
    this.setCurrent(op);
  }

  hasOpcodes(): boolean {
    return this.frame !== undefined;
  }

  nextStatement(): Opcode {
    let op = this.frames[this.frame].op;
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
