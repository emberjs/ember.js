import { SourceSlice } from '../../source/slice';
import { SpanList } from '../../source/span-list';
import { BlockSymbolTable, ProgramSymbolTable } from '../../symbol-table';
import { Args, NamedArguments } from './args';
import type { ComponentArg, ElementModifier, HtmlOrSplatAttr } from './attr-block';
import type { GlimmerParentNodeOptions } from './base';
import { BaseNodeFields, node } from './node';

/**
 * Corresponds to an entire template.
 */
export class Template extends node().fields<
  {
    table: ProgramSymbolTable;
  } & GlimmerParentNodeOptions
>() {}

/**
 * Represents a block. In principle this could be merged with `NamedBlock`, because all cases
 * involving blocks have at least a notional name.
 */
export class Block extends node().fields<
  { scope: BlockSymbolTable } & GlimmerParentNodeOptions
>() {}

/**
 * Corresponds to a collection of named blocks.
 */
export class NamedBlocks extends node().fields<{ blocks: readonly NamedBlock[] }>() {
  /**
   * Get the `NamedBlock` for a given name.
   */
  get(name: 'default'): NamedBlock;
  get(name: string): NamedBlock | null;
  get(name: string): NamedBlock | null {
    return this.blocks.filter((block) => block.name.chars === name)[0] || null;
  }
}

export interface NamedBlockFields extends BaseNodeFields {
  name: SourceSlice;
  block: Block;

  // these are not currently supported, but are here for future expansion
  attrs: readonly HtmlOrSplatAttr[];
  componentArgs: readonly ComponentArg[];
  modifiers: readonly ElementModifier[];
}

/**
 * Corresponds to a single named block. This is used for anonymous named blocks (`default` and
 * `else`).
 */
export class NamedBlock extends node().fields<NamedBlockFields>() {
  get args(): Args {
    let entries = this.componentArgs.map((a) => a.toNamedArgument());

    return Args.named(
      new NamedArguments({
        loc: SpanList.range(entries, this.name.loc.collapse('end')),
        entries,
      })
    );
  }
}
