import { CompileTimeConstants, CompileTimeHeap } from '../program';
import { Dict, Option } from '../core';
import { SingleBuilderOperand, BuilderHandleThunk, SingleBuilderOperands } from './operands';
import { NamedBlocks, HandleResult } from '../template';
import { Op, MachineOp } from '../vm-opcodes';
import * as WireFormat from './wire-format';
import { InternalComponentCapabilities } from '../managers/internal/component';
import { CompileTimeComponent } from '../..';

export interface Labels<InstructionEncoder> {
  readonly labels: Dict<number>;
  readonly targets: Array<{ at: number; target: string }>;

  label(name: string, index: number): void;
  target(at: number, target: string): void;
  patch(encoder: InstructionEncoder): void;
}

export type HighLevelOp = HighLevelBuilderOp | HighLevelResolutionOp;

export interface AllOpMap {
  [HighLevelBuilderOpcode.Label]: LabelOp;
  [HighLevelBuilderOpcode.StartLabels]: StartLabelsOp;
  [HighLevelBuilderOpcode.StopLabels]: StopLabelsOp;

  [HighLevelResolutionOpcode.Expr]: ExprOp;
  [HighLevelResolutionOpcode.ResolveModifier]: ResolveModifierOp;
  [HighLevelResolutionOpcode.ResolveComponent]: ResolveComponentOp;
  [HighLevelResolutionOpcode.ResolveHelper]: ResolveHelperOp;
  [HighLevelResolutionOpcode.ResolveComponentOrHelper]: ResolveComponentOrHelperOp;
  [HighLevelResolutionOpcode.ResolveOptionalHelper]: ResolveOptionalHelperOp;
  [HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper]: ResolveOptionalComponentOrHelperOp;
  [HighLevelResolutionOpcode.ResolveFree]: ResolveFreeOp;
}

export type AllOpcode = keyof AllOpMap;
export type AllOps = AllOpMap[keyof AllOpMap];

export type Operands<O extends AllOps> = O['op1'] extends undefined ? [] : [O['op1']];

/**
 * The high level actions that the opcode compiler can take when producing the
 * final opcode output. The wireformat first gets converted into a series of
 * actions, and then the actions are flushed and turned into the final opcodes.
 */
export const enum HighLevelOpcodeType {
  // Simple wrapper action, wraps the opcode and flushes it directly
  OpcodeWrapper = 0,

  // Used for basic structure, such as adding labels to the output for jumps
  Builder = 1,

  // Used for expressions and statements that require the resolver
  Resolution = 2,

  // Used for errors
  Error = 3,
}

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

  Expr = 1010,

  Start = ResolveModifier,
  End = Expr,
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

export interface ResolveModifierOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveModifier;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (handle: number) => ExpressionCompileActions;
  };
}

export interface ResolveComponentOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveComponent;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (component: CompileTimeComponent) => ExpressionCompileActions;
  };
}
export interface ResolveComponentOrHelperOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveComponentOrHelper;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (componentOrHandle: CompileTimeComponent | number) => ExpressionCompileActions;
  };
}

export interface ResolveHelperOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveHelper;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (handle: number) => ExpressionCompileActions;
  };
}
export interface ResolveOptionalHelperOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveOptionalHelper;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (handleOrName: number | string) => ExpressionCompileActions;
  };
}

export interface ResolveOptionalComponentOrHelperOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper;
  op1: {
    expr: WireFormat.Expressions.Expression;
    then: (
      componentOrHandleOrName: CompileTimeComponent | number | string
    ) => ExpressionCompileActions;
  };
}

export interface ResolveFreeOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.ResolveFree;
  op1: {
    sym: number;
    then: (handle: number) => ExpressionCompileActions;
  };
}

export type HighLevelResolutionOp = AllOpMap[HighLevelResolutionOpcode];

export type BuilderOpcode = Op | MachineOp;

/**
 * Vocabulary (in progress)
 *
 * Op: An entire operation (composed of an Opcode and 0-3 operands)
 * Opcode: The name of the operation
 * Operand: An operand passed to the operation
 */

interface HighLevelOpcode {
  type: HighLevelOpcodeType;
}

export interface OpcodeWrapperOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.OpcodeWrapper;
  op: BuilderOpcode;
  op1?: SingleBuilderOperand | BuilderHandleThunk;
  op2?: SingleBuilderOperand | BuilderHandleThunk;
  op3?: SingleBuilderOperand | BuilderHandleThunk;
}

export interface StartLabelsOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Builder;
  op: HighLevelBuilderOpcode.StartLabels;
  op1: undefined;
}

export interface StopLabelsOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Builder;
  op: HighLevelBuilderOpcode.StopLabels;
  op1: undefined;
}

export interface LabelOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Builder;
  op: HighLevelBuilderOpcode.Label;
  op1: string;
}

export interface ExprOp extends HighLevelOpcode {
  type: HighLevelOpcodeType.Resolution;
  op: HighLevelResolutionOpcode.Expr;
  op1: WireFormat.Expression;
}

export type HighLevelBuilderOp = AllOpMap[HighLevelBuilderOpcode];

export type HighLevelBuilderOperands = [HighLevelBuilderOp['op1']];

export type NO_ACTION = { 'no-action': true };

export type CompileOp = OpcodeWrapperOp | HighLevelBuilderOp;
export type CompileAction = OpcodeWrapperOp | HighLevelBuilderOp | NO_ACTION;
export interface NestedCompileActions extends Array<CompileActions | CompileAction> {}
export type CompileActions = CompileAction | NestedCompileActions;

export type StatementCompileOp = CompileOp | HighLevelResolutionOp;
export type StatementCompileAction = StatementCompileOp | NO_ACTION;
export interface NestedStatementCompileActions
  extends Array<StatementCompileAction | NestedStatementCompileActions> {}
export type StatementCompileActions = NestedStatementCompileActions | StatementCompileAction;

export type ExpressionCompileOp = CompileOp | HighLevelResolutionOp | ExprOp;
export type ExpressionCompileAction = ExpressionCompileOp | NO_ACTION;
export interface NestedExpressionCompileActions
  extends Array<ExpressionCompileAction | NestedExpressionCompileActions> {}

export type ExpressionCompileActions = NestedExpressionCompileActions | ExpressionCompileAction;

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
  commit(heap: CompileTimeHeap, size: number): HandleResult;

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
    ...args: SingleBuilderOperands
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
