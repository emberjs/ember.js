import {
  Compiler,
  LayoutWithContext,
  VMHandle,
  Option,
  CompilableBlock,
  NamedBlocks,
  MaybeResolvedLayout,
  ComponentCapabilities,
  CompilableProgram,
} from '@glimmer/interfaces';
import * as WireFormat from '@glimmer/wire-format';

import { ComponentArgs, Primitive } from './interfaces';
import { MachineRegister, SavedRegister, Op } from '@glimmer/vm';
import { SerializedInlineBlock, Statements, Core, Expression } from '@glimmer/wire-format';

export type Label = string;

export type When = (match: number, callback: () => void) => void;

export interface OpcodeBuilderConstructor<Locator> {
  new (compiler: Compiler, containingLayout: LayoutWithContext): OpcodeBuilder<Locator>;
}

export type VMHandlePlaceholder = [number, () => VMHandle];

export interface ReplayableIf {
  args(): number;
  ifTrue(): void;
  ifFalse?(): void;
}

export interface Replayable {
  args(): number;
  body(): void;
}

export type Block = () => void;

export interface DynamicComponent {
  definition: WireFormat.Expression;
  attrs: Option<CompilableBlock>;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  synthetic: boolean;
  blocks: NamedBlocks;
}

export interface StaticComponent {
  capabilities: ComponentCapabilities;
  layout: CompilableProgram;
  attrs: Option<CompilableBlock>;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  synthetic: boolean;
  blocks: NamedBlocks;
}

export interface Component {
  capabilities: ComponentCapabilities | true;
  attrs: Option<CompilableBlock>;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  synthetic: boolean;
  blocks: NamedBlocks;
  layout?: CompilableProgram;
}

export interface CurryComponent {
  definition: WireFormat.Expression;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  synthetic: boolean;
}

export interface CompileBlock {
  name: string;
  params: Core.Params;
  hash: Core.Hash;
  blocks: NamedBlocks;
}

export interface CompileHelper {
  handle: number;
  params: Option<Core.Params>;
  hash: Core.Hash;
}

export interface CompilerBuilder<Locator> {
  resolveLayoutForTag(tag: string, referrer: Locator): MaybeResolvedLayout;
  resolveHelper(name: string, referrer: Locator): Option<number>;
  resolveModifier(name: string, referrer: Locator): Option<number>;
}

export interface ComponentBuilder {
  static(handle: number, args: ComponentArgs): void;
}

export interface StringOperand {
  type: 'string';
  value: string;
}

export interface ArrayOperand {
  type: 'array';
  value: number[];
}

export interface StringArrayOperand {
  type: 'string-array';
  value: string[];
}

export interface HandleOperand {
  type: 'handle';
  value: number;
}

export type BuilderOperand =
  | StringOperand
  | ArrayOperand
  | StringArrayOperand
  | HandleOperand
  | number;
export type BuilderOperands =
  | []
  | [BuilderOperand]
  | [BuilderOperand, BuilderOperand]
  | [BuilderOperand, BuilderOperand, BuilderOperand];

export default interface OpcodeBuilder<Locator = unknown> {
  readonly compiler: CompilerBuilder<Locator>;
  readonly component: ComponentBuilder;
  readonly referrer: Locator;

  readonly asPartial: boolean;
  readonly evalSymbols: Option<string[]>;

  push(name: Op, ...args: BuilderOperands): void;

  replayableIf(options: ReplayableIf): void;
  replayable(options: Replayable): void;
  frame(options: Block): void;

  expr(expression: WireFormat.Expression): void;
  params(expression: WireFormat.Expression[]): void;

  invokeStaticBlock(block: CompilableBlock, callerCount?: number): void;

  toBoolean(): void;

  dup(register?: MachineRegister, offset?: number): void;
  pop(count?: number): void;

  pushPrimitiveReference(primitive: Primitive): void;

  label(label: string): void;
  labels(block: Block): void;

  withSavedRegister(register: SavedRegister, block: Block): void;

  list(label: string, block: Block): void;
  iterate(label: string): void;
  putIterator(): void;

  jump(label: string): void;
  jumpUnless(label: string): void;
  returnTo(label: string): void;

  remoteElement(block: Block): void;
  staticAttr(name: string, namespace: Option<string>, value: string): void;
  dynamicAttr(name: string, namespace: Option<string>, trusting: boolean): void;

  guardedAppend(expression: Expression, trusting: boolean): void;

  dynamicScope(names: Option<string[]>, block: Block): void;
  bindDynamicScope(names: string[]): void;

  staticComponentHelper(
    tag: string,
    hash: WireFormat.Core.Hash,
    template: Option<CompilableBlock>
  ): boolean;

  helper(helper: CompileHelper): void;
  modifier(modifier: CompileHelper): void;

  invokeDynamicComponent(options: DynamicComponent): void;
  invokeStaticComponent(options: StaticComponent): void;
  curryComponent(options: CurryComponent): void;
  invokeComponent(options: Component): void;
  wrappedComponent(layout: LayoutWithContext<Locator>, attrsBlockNumber: number): number;
  staticComponent(handle: number, args: ComponentArgs): void;

  yield(to: number, params: Option<WireFormat.Core.Params>): void;

  // eval
  debugger(symbols: string[], evalInfo: number[]): void;
  invokePartial(referrer: Locator, symbols: string[], evalInfo: number[]): void;

  // TODO: These don't seem like the right abstraction, but leaving
  // them for now in the interest of expedience.
  popFrame(): void;
  commit(): number;
  templates(blocks: Core.Blocks): NamedBlocks;
  inlineBlock(block: SerializedInlineBlock): CompilableBlock;
  compileInline(sexp: Statements.Append): ['expr', Expression] | true;
  compileBlock(block: CompileBlock): void;
  hasBlockParams(symbol: number): void;
  setComponentAttrs(value: boolean): void;
}
