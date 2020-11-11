import { CompileTimeConstants, CompileTimeHeap } from '../program';
import { Dict, Option } from '../core';
import { SingleBuilderOperand, BuilderHandleThunk, SingleBuilderOperands } from './operands';
import {
  NamedBlocks,
  CompilableBlock,
  CompilableProgram,
  CompilableTemplate,
  HandleResult,
} from '../template';
import { Op, MachineOp } from '../vm-opcodes';
import * as WireFormat from './wire-format';
import { InternalComponentCapabilities } from '../managers/internal/component';

export interface Labels<InstructionEncoder> {
  readonly labels: Dict<number>;
  readonly targets: Array<{ at: number; target: string }>;

  label(name: string, index: number): void;
  target(at: number, target: string): void;
  patch(encoder: InstructionEncoder): void;
}

export type HighLevelOp =
  | HighLevelBuilderOp
  | HighLevelCompileOp
  | HighLevelResolutionOp
  | CompileErrorOp;

export interface AllOpMap {
  Label: LabelOp;
  Option: OptionOp;
  StartLabels: StartLabelsOp;
  StopLabels: StopLabelsOp;

  IfResolved: IfResolvedOp;
  Expr: ExprOp;
  ResolveFree: ResolveFreeOp;
  ResolveContextualFree: ResolveContextualFreeOp;
  SimpleArgs: SimpleArgsOp;

  CompileInline: CompileInlineOp;
  CompileBlock: CompileBlockOp;
  IfResolvedComponent: IfResolvedComponentOp;
  DynamicComponent: DynamicComponentOp;

  Error: CompileErrorOp;
}

export type AllOpcode = keyof AllOpMap;
export type AllOps = AllOpMap[keyof AllOpMap];

export type Operands<O extends AllOps> = O['op1'] extends undefined ? [] : [O['op1']];

// Must be kept in sync with isSimpleOpcode in encoder.ts
export const enum HighLevelBuilderOpcode {
  Label = 'Label',
  Option = 'Option',
  StartLabels = 'StartLabels',
  StopLabels = 'StopLabels',
}

// Must be kept in sync with isCompileOpcode in encoder.ts
export const enum HighLevelCompileOpcode {
  CompileInline = 'CompileInline',
  CompileBlock = 'CompileBlock',
  IfResolvedComponent = 'IfResolvedComponent',
  DynamicComponent = 'DynamicComponent',
}

// Must be kept in sync with isResolutionOpcode in encoder.ts
export const enum HighLevelResolutionOpcode {
  IfResolved = 'IfResolved',
  Expr = 'Expr',
  ResolveFree = 'ResolveFree',
  ResolveContextualFree = 'ResolveContextualFree',
  SimpleArgs = 'SimpleArgs',
}

// Must be kept in sync with isErrorOpcode in encoder.ts
export const enum ErrorOpcode {
  Error = 'Error',
}

export type HighLevelOpcode =
  | HighLevelBuilderOpcode
  | HighLevelCompileOpcode
  | HighLevelResolutionOpcode;

export const enum ResolveHandle {
  Modifier = 'Modifier',
  Helper = 'Helper',
  ComponentDefinition = 'ComponentDefinition',
}

export interface CompileInlineOp {
  type: 'Compile';
  op: HighLevelCompileOpcode.CompileInline;
  op1: {
    inline: WireFormat.Statements.Append;
    ifUnhandled: (sexp: WireFormat.Statements.Append) => ExpressionCompileActions;
  };
}

export interface CompileBlockOp {
  type: 'Compile';
  op: HighLevelCompileOpcode.CompileBlock;
  op1: WireFormat.Statements.Block;
}

export interface ArgsOptions {
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  blocks: NamedBlocks;
  atNames: boolean;
}

export interface IfResolvedOp {
  type: 'Resolution';
  op: HighLevelResolutionOpcode.IfResolved;
  op1: {
    kind: ResolveHandle;
    name: string;
    andThen: (handle: number) => ExpressionCompileActions;
    orElse?: () => ExpressionCompileActions;
    span: {
      start: number;
      end: number;
    };
  };
}

export interface IfResolvedComponentBlocks {
  attrs: CompilableBlock;
  blocks: NamedBlocks;
}

export interface IfResolvedComponentOp {
  type: 'Compile';
  op: HighLevelCompileOpcode.IfResolvedComponent;
  op1: {
    name: string;
    attrs: WireFormat.Statements.Attribute[];
    blocks: WireFormat.Core.Blocks;
    staticTemplate: (
      handle: number,
      capabilities: InternalComponentCapabilities,
      template: CompilableProgram,
      blocks: IfResolvedComponentBlocks
    ) => StatementCompileActions;
    dynamicTemplate: (
      handle: number,
      capabilities: InternalComponentCapabilities,
      blocks: IfResolvedComponentBlocks
    ) => StatementCompileActions;
    orElse?: () => ExpressionCompileActions;
  };
}

export interface DynamicComponentOp {
  type: 'Compile';
  op: HighLevelCompileOpcode.DynamicComponent;
  op1: {
    definition: WireFormat.Expression;
    attrs: Option<WireFormat.Statements.Attribute[]>;
    params: Option<WireFormat.Core.Params>;
    args: WireFormat.Core.Hash;
    blocks: WireFormat.Core.Blocks | NamedBlocks;
    atNames: boolean;
    curried: boolean;
  };
}

export type HighLevelCompileOp =
  | CompileInlineOp
  | CompileBlockOp
  | IfResolvedComponentOp
  | DynamicComponentOp;

export type HighLevelCompileOperands = [HighLevelCompileOp['op1']];

export type HighLevelResolutionOp =
  | IfResolvedOp
  | ExprOp
  | ResolveFreeOp
  | ResolveContextualFreeOp
  | SimpleArgsOp;

export type BuilderOpcode = Op | MachineOp;

/**
 * Vocabulary (in progress)
 *
 * Op: An entire operation (composed of an Opcode and 0-3 operands)
 * Opcode: The name of the operation
 * Operand: An operand passed to the operation
 */

export interface BuilderOp {
  type: 'Number';
  op: BuilderOpcode;
  op1?: SingleBuilderOperand | BuilderHandleThunk;
  op2?: SingleBuilderOperand | BuilderHandleThunk;
  op3?: SingleBuilderOperand | BuilderHandleThunk;
}

export interface OptionOp {
  type: 'Simple';
  op: HighLevelBuilderOpcode.Option;
  op1: Option<CompileActions>;
}

export interface StartLabelsOp {
  type: 'Simple';
  op: HighLevelBuilderOpcode.StartLabels;
  op1: undefined;
}

export interface StopLabelsOp {
  type: 'Simple';
  op: HighLevelBuilderOpcode.StopLabels;
  op1: undefined;
}

export interface LabelOp {
  type: 'Simple';
  op: HighLevelBuilderOpcode.Label;
  op1: string;
}

export interface SimpleArgsOp {
  type: 'Resolution';
  op: HighLevelResolutionOpcode.SimpleArgs;
  op1: {
    params: Option<WireFormat.Core.Params>;
    hash: WireFormat.Core.Hash;
    atNames: boolean;
  };
}

export interface ExprOp {
  type: 'Resolution';
  op: HighLevelResolutionOpcode.Expr;
  op1: WireFormat.Expression;
}

export interface ResolveFreeOp {
  type: 'Resolution';
  op: HighLevelResolutionOpcode.ResolveFree;
  op1: number;
}

export interface ResolveContextualFreeOp {
  type: 'Resolution';
  op: HighLevelResolutionOpcode.ResolveContextualFree;
  op1: {
    freeVar: number;
    context: WireFormat.ExpressionContext;
  };
}

export interface CompileErrorOp {
  type: 'Error';
  op: ErrorOpcode.Error;
  op1: {
    problem: string;
    start: number;
    end: number;
  };
}

export type HighLevelBuilderOp = LabelOp | OptionOp | StartLabelsOp | StopLabelsOp;

export type HighLevelBuilderOperands = [HighLevelBuilderOp['op1']];

export type NO_ACTION = { 'no-action': true };

export type CompileOp = BuilderOp | HighLevelBuilderOp;
export type CompileAction = BuilderOp | HighLevelBuilderOp | NO_ACTION;
export interface NestedCompileActions extends Array<CompileActions | CompileAction> {}
export type CompileActions = CompileAction | NestedCompileActions;

export type StatementCompileOp = CompileOp | HighLevelCompileOp | HighLevelResolutionOp;
export type StatementCompileAction = StatementCompileOp | CompileErrorOp | NO_ACTION;
export interface NestedStatementCompileActions
  extends Array<StatementCompileAction | NestedStatementCompileActions> {}
export type StatementCompileActions = NestedStatementCompileActions | StatementCompileAction;

export type ExpressionCompileOp = CompileOp | HighLevelResolutionOp | ExprOp;
export type ExpressionCompileAction = ExpressionCompileOp | CompileErrorOp | NO_ACTION;
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
   * accomodate this use-case ergonomically, the `Encoder` allows a syntax
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
