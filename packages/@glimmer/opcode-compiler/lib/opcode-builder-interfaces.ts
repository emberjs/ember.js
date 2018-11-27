import {
  Compiler,
  LayoutWithContext,
  VMHandle,
  Option,
  CompilableBlock,
  NamedBlocks,
  MaybeResolvedLayout,
} from '@glimmer/interfaces';
import * as WireFormat from '@glimmer/wire-format';

import { ComponentArgs, Primitive } from './interfaces';
import { MachineRegister } from '@glimmer/vm';

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

export interface CompilerBuilder<Locator> {
  resolveLayoutForTag(tag: string, referrer: Locator): MaybeResolvedLayout;
}

export interface ComponentBuilder {
  static(handle: number, args: ComponentArgs): void;
}

export default interface OpcodeBuilder<Locator = unknown> {
  readonly compiler: CompilerBuilder<Locator>;
  readonly component: ComponentBuilder;
  readonly referrer: Locator;

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

  list(label: string, block: Block): void;
  iterate(label: string): void;
  putIterator(): void;

  jump(label: string): void;
  jumpUnless(label: string): void;
  returnTo(label: string): void;

  remoteElement(block: Block): void;
  dynamicScope(names: Option<string[]>, block: Block): void;
  bindDynamicScope(names: string[]): void;

  staticComponentHelper(
    tag: string,
    hash: WireFormat.Core.Hash,
    template: Option<CompilableBlock>
  ): boolean;

  dynamicComponent(options: DynamicComponent): void;

  // TODO: These don't seem like the right abstraction, but leaving
  // them for now in the interest of expedience.
  popFrame(): void;
  commit(): number;
}
