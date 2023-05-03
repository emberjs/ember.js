import { SourceSlice } from '../../source/slice';
import { SpanList } from '../../source/span-list';
import { SymbolTable } from '../../symbol-table';
import { Args, NamedArguments } from './args';
import type { ComponentArg, ElementModifier, HtmlOrSplatAttr } from './attr-block';
import type { CallFields } from './base';
import type { ExpressionNode } from './expr';
import type { NamedBlock, NamedBlocks } from './internal-node';
import { BaseNodeFields, node } from './node';

/**
 * Content Nodes are allowed in content positions in templates. They correspond to behavior in the
 * [Data][data] tokenization state in HTML.
 *
 * [data]: https://html.spec.whatwg.org/multipage/parsing.html#data-state
 */
export type ContentNode =
  | HtmlText
  | HtmlComment
  | AppendContent
  | InvokeBlock
  | InvokeComponent
  | SimpleElement
  | GlimmerComment;

export class GlimmerComment extends node('GlimmerComment').fields<{ text: SourceSlice }>() {}
export class HtmlText extends node('HtmlText').fields<{ chars: string }>() {}
export class HtmlComment extends node('HtmlComment').fields<{ text: SourceSlice }>() {}

export class AppendContent extends node('AppendContent').fields<{
  value: ExpressionNode;
  trusting: boolean;
  table: SymbolTable;
}>() {
  get callee(): ExpressionNode {
    if (this.value.type === 'Call') {
      return this.value.callee;
    } else {
      return this.value;
    }
  }

  get args(): Args {
    if (this.value.type === 'Call') {
      return this.value.args;
    } else {
      return Args.empty(this.value.loc.collapse('end'));
    }
  }
}

export class InvokeBlock extends node('InvokeBlock').fields<
  CallFields & { blocks: NamedBlocks }
>() {}

interface InvokeComponentFields {
  callee: ExpressionNode;
  blocks: NamedBlocks;
  attrs: readonly HtmlOrSplatAttr[];
  componentArgs: readonly ComponentArg[];
  modifiers: readonly ElementModifier[];
}

/**
 * Corresponds to a component invocation. When the content of a component invocation contains no
 * named blocks, `blocks` contains a single named block named `"default"`. When a component
 * invocation is self-closing, `blocks` is empty.
 */
export class InvokeComponent extends node('InvokeComponent').fields<InvokeComponentFields>() {
  get args(): Args {
    let entries = this.componentArgs.map((a) => a.toNamedArgument());

    return Args.named(
      new NamedArguments({
        loc: SpanList.range(entries, this.callee.loc.collapse('end')),
        entries,
      })
    );
  }
}

interface SimpleElementOptions extends BaseNodeFields {
  tag: SourceSlice;
  body: readonly ContentNode[];
  attrs: readonly HtmlOrSplatAttr[];
  componentArgs: readonly ComponentArg[];
  modifiers: readonly ElementModifier[];
}

/**
 * Corresponds to a simple HTML element. The AST allows component arguments and modifiers to support
 * future extensions.
 */
export class SimpleElement extends node('SimpleElement').fields<SimpleElementOptions>() {
  get args(): Args {
    let entries = this.componentArgs.map((a) => a.toNamedArgument());

    return Args.named(
      new NamedArguments({
        loc: SpanList.range(entries, this.tag.loc.collapse('end')),
        entries,
      })
    );
  }
}

export type ElementNode = NamedBlock | InvokeComponent | SimpleElement;
