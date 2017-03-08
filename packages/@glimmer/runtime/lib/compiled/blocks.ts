import { SymbolTable, ProgramSymbolTable, BlockSymbolTable } from '@glimmer/interfaces';

/**
 * The term "block" in the runtime refers to a section
 * of code in a Glimmer template. The most common kinds
 * of blocks that you will encounter are `Program`s, which
 * represent the top-level of a file, and `InlineBlocks`,
 * which represent blocks interior to a file.
 *
 * All blocks represent a list of statements. `InlineBlock`s
 * also have a list of positional parameters (sometimes
 * referred to as "block params"). `FunctionBlock`s have
 * a list of named parameters and a list of block
 * parameters. Syntactically, `FunctionBlock`s refer to
 * their named parameters using `@name` syntax, and
 * refer to their block parameters using `{{yield}}` and
 * `{{has-block}}` syntax.
 *
 * Semantically, a `FunctionBlock` has a clean top-level
 * scope. It accesses data through its `this` context,
 * and through named arguments (`@name`) and block
 * arguments.
 *
 * Semantically, an `InlineBlock` inherits its lexical
 * scope from its environment, and may be invoked with
 * one or more positional arguments. When invoked with
 * positional arguments, the names of those arguments
 * are available in the block, and shadow identical names
 * in the parent scope.
 *
 * The lifecycle of a block in the runtime is:
 *
 * First, a block comes in from the wire format as as
 * `WireFormat.SerializedBlock`.
 */

export interface OpSlice {
  start: number;
  end: number;
}

export class CompiledStaticTemplate implements OpSlice {
  constructor(public start: number, public end: number) {
  }
}

export class CompiledDynamicTemplate<S extends SymbolTable> implements OpSlice {
  constructor(public start: number, public end: number, public symbolTable: S) {
  }
}

export type CompiledDynamicBlock = CompiledDynamicTemplate<BlockSymbolTable>;
export type CompiledDynamicProgram = CompiledDynamicTemplate<ProgramSymbolTable>;
