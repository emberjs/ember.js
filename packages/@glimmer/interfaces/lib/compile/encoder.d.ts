import { CompileTimeConstants, CompileTimeHeap } from '../program';
import { Dict, Option } from '../core';
import { SingleBuilderOperand } from './operands';
import { NamedBlocks, HandleResult } from '../template';
import { Op, MachineOp } from '../vm-opcodes';
import * as WireFormat from './wire-format';
import { InternalComponentCapabilities } from '../managers/internal/component';
import { CompileTimeComponent } from '../..';

// These values are used in the same space as standard opcodes, so we need to
// start them at a higher value to prevent collisions
export const enum HighLevelBuilderOpcode {
  Label = 1000,
  StartLabels = 1001,
  StopLabels = 1002,

  Start = Label,
  End = StopLabels,
}

export const enum HighLevelResolutionOpcode {
  ResolveModifier = 1003,

  ResolveComponent = 1004,

  ResolveHelper = 1005,
  ResolveOptionalHelper = 1006,

  ResolveComponentOrHelper = 1007,
  ResolveOptionalComponentOrHelper = 1008,

  ResolveFree = 1009,
  ResolveLocal = 1010,
  ResolveTemplateLocal = 1011,

  Start = ResolveModifier,
  End = ResolveTemplateLocal,
}

export interface SimpleArgsOptions {
  positional: Option<WireFormat.Core.Params>;
  named: Option<WireFormat.Core.Hash>;
  atNames: boolean;
}

export interface ArgsOptions extends SimpleArgsOptions {
  named: WireFormat.Core.Hash;
  blocks: NamedBlocks;
}

export type StartLabelsOp = [op: HighLevelBuilderOpcode.StartLabels];

export type StopLabelsOp = [op: HighLevelBuilderOpcode.StopLabels];

export type LabelOp = [op: HighLevelBuilderOpcode.Label, op1: string];

export type HighLevelBuilderOp = StartLabelsOp | StopLabelsOp | LabelOp;

export type ResolveModifierOp = [
  op: HighLevelResolutionOpcode.ResolveModifier,
  op1: WireFormat.Expressions.Expression,
  op2: (handle: number) => void
];

export type ResolveComponentOp = [
  op: HighLevelResolutionOpcode.ResolveComponent,
  op1: WireFormat.Expressions.Expression,
  op2: (component: CompileTimeComponent) => void
];

export type ResolveComponentOrHelperOp = [
  op: HighLevelResolutionOpcode.ResolveComponentOrHelper,
  op1: WireFormat.Expressions.Expression,
  op2: {
    ifComponent: (component: CompileTimeComponent) => void;
    ifHelper: (handle: number) => void;
  }
];

export type ResolveHelperOp = [
  op: HighLevelResolutionOpcode.ResolveHelper,
  op1: WireFormat.Expressions.Expression,
  op2: (handle: number) => void
];

export type ResolveOptionalHelperOp = [
  op: HighLevelResolutionOpcode.ResolveOptionalHelper,
  op1: WireFormat.Expressions.Expression,
  op2: {
    ifHelper: (handle: number, name: string, moduleName: string) => void;
  }
];

export type ResolveOptionalComponentOrHelperOp = [
  op: HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper,
  op1: WireFormat.Expressions.Expression,
  op2: {
    ifComponent: (component: CompileTimeComponent) => void;
    ifHelper: (handle: number) => void;
    ifValue: (handle: number) => void;
  }
];

export type ResolveFreeOp = [
  op: HighLevelResolutionOpcode.ResolveFree,
  op1: number,
  op2: (handle: number) => void
];

export type ResolveTemplateLocalOp = [
  op: HighLevelResolutionOpcode.ResolveTemplateLocal,
  op1: number,
  op2: (handle: number) => void
];

export type ResolveLocalOp = [
  op: HighLevelResolutionOpcode.ResolveLocal,
  op1: number,
  op2: (name: string, moduleName: string) => void
];

export type HighLevelResolutionOp =
  | ResolveModifierOp
  | ResolveComponentOp
  | ResolveComponentOrHelperOp
  | ResolveHelperOp
  | ResolveOptionalHelperOp
  | ResolveOptionalComponentOrHelperOp
  | ResolveFreeOp
  | ResolveTemplateLocalOp
  | ResolveLocalOp;

export type HighLevelOp = HighLevelBuilderOp | HighLevelResolutionOp;

export type BuilderOpcode = Op | MachineOp;

export type BuilderOp = [
  op: BuilderOpcode,
  op1?: SingleBuilderOperand,
  op1?: SingleBuilderOperand,
  op1?: SingleBuilderOperand
];

export interface EncoderError {
  problem: string;
  span: {
    start: number;
    end: number;
  };
}

/**
 * The Encoder receives a stream of opcodes from the syntax compiler and turns
 * them into a binary program.
 */
export interface Encoder {
  /**
   * Finalize the current compilation unit, add a `(Return)`, and push the opcodes from
   * the buffer into the program. At this point, some of the opcodes might still be
   * placeholders, such as in the case of recursively compiled templates.
   *
   * @param compiler
   * @param size
   */
  commit(size: number): HandleResult;

  /**
   * Push a syscall into the program with up to three optional
   * operands.
   *
   * @param opcode
   * @param args up to three operands, formatted as
   *   { type: "type", value: value }
   */
  push(
    constants: CompileTimeConstants,
    opcode: BuilderOpcode,
    ...args: SingleBuilderOperand[]
  ): void;

  /**
   * Start a new labels block. A labels block is a scope for labels that
   * can be referred to before they are declared. For example, when compiling
   * an `if`, the `JumpUnless` opcode occurs before the target label. To
   * accommodate this use-case ergonomically, the `Encoder` allows a syntax
   * to create a labels block and then refer to labels that have not yet
   * been declared. Once the block is complete, a second pass replaces the
   * label names with offsets.
   *
   * The pattern is:
   *
   * ```ts
   * encoder.reserve(Op.JumpUnless);
   * encoder.target(encoder.pos, 'ELSE');
   * ```
   *
   * The `reserve` method creates a placeholder opcode with space for a target
   * in the future, and the `target` method registers the blank operand position
   * to be replaced with an offset to `ELSE`, once it's known.
   */
  startLabels(): void;

  /**
   * Finish the current labels block and replace label names with offsets,
   * now that all of the offsets are known.
   */
  stopLabels(): void;

  /**
   * Mark the current position with a label name. This label name
   * can be used by any other opcode in this label block.
   * @param name
   * @param index
   */
  label(name: string): void;

  error(error: EncoderError): void;
}
