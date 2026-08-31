import type {
  SerializedInlineBlock,
  SerializedTemplateBlock,
  WireFormat,
} from '@glimmer/interfaces';
import { opcodes as Op } from '@glimmer/wire-format/lib/opcodes';

import type { LexicalKeyword } from './wire-format-module';

export interface KeywordSlot {
  name: string;
  keyword: LexicalKeyword;
}

/**
 * Rewrites strict keywords (`GetStrictKeyword`) that appear in
 * `lexicalKeywords` into `GetLexicalSymbol` references. The slots start
 * after the template's own lexical scope, in first-use order. The result is
 * a new block; the input is not changed.
 */
export function bindStrictKeywords(
  block: SerializedTemplateBlock,
  lexicalKeywords: Record<string, LexicalKeyword>,
  scopeOffset: number
): { block: SerializedTemplateBlock; slots: KeywordSlot[] } {
  let [statements, locals, upvars] = block;
  let slots: KeywordSlot[] = [];

  function slotFor(upvar: number): number | null {
    let name = upvars[upvar];
    let keyword = name === undefined ? undefined : lexicalKeywords[name];

    if (name === undefined || keyword === undefined) {
      return null;
    }

    let index = slots.findIndex((slot) => slot.name === name);

    if (index === -1) {
      index = slots.push({ name, keyword }) - 1;
    }

    return scopeOffset + index;
  }

  function expr(e: WireFormat.Expression): WireFormat.Expression {
    if (!Array.isArray(e)) {
      return e;
    }

    switch (e[0]) {
      case Op.GetStrictKeyword: {
        let slot = slotFor(e[1]);
        return slot === null ? e : ([Op.GetLexicalSymbol, slot] as WireFormat.Expression);
      }
      case Op.Concat:
        return [Op.Concat, params(e[1])];
      case Op.Log:
        return [Op.Log, params(e[1])];
      case Op.Call:
        return [Op.Call, expr(e[1]), params(e[2]), hash(e[3])];
      case Op.HasBlock:
        return [Op.HasBlock, expr(e[1])];
      case Op.HasBlockParams:
        return [Op.HasBlockParams, expr(e[1])];
      case Op.Not:
        return [Op.Not, expr(e[1])];
      case Op.GetDynamicVar:
        return [Op.GetDynamicVar, expr(e[1])];
      case Op.Curry:
        return [Op.Curry, expr(e[1]), e[2], params(e[3]), hash(e[4])];
      case Op.IfInline:
        return e.length > 3
          ? [Op.IfInline, expr(e[1]), expr(e[2]), expr(e[3])]
          : [Op.IfInline, expr(e[1]), expr(e[2])];
      default:
        return e;
    }
  }

  function params<T extends WireFormat.Core.Params>(p: T): T {
    return (p === null ? p : p.map((e) => expr(e))) as T;
  }

  function hash<T extends WireFormat.Core.Hash>(h: T): T {
    return (h === null ? h : [h[0], h[1].map((e) => expr(e))]) as T;
  }

  function inlineBlock(b: SerializedInlineBlock): SerializedInlineBlock {
    return [b[0].map((s) => statement(s)), b[1]];
  }

  function optionalBlock(b: SerializedInlineBlock | null): SerializedInlineBlock | null {
    return b === null ? null : inlineBlock(b);
  }

  function blocks<T extends WireFormat.Core.Blocks>(b: T): T {
    return (b === null ? b : [b[0], b[1].map((x) => inlineBlock(x))]) as T;
  }

  function elementParams(p: WireFormat.Core.ElementParameters): WireFormat.Core.ElementParameters {
    return p === null ? null : (p.map((s) => statement(s)) as WireFormat.Core.ElementParameters);
  }

  function statement<T extends WireFormat.Statement>(s: T): T {
    let out: WireFormat.Statement;

    switch (s[0]) {
      case Op.Append:
        out = [Op.Append, expr(s[1])];
        break;
      case Op.TrustingAppend:
        out = [Op.TrustingAppend, expr(s[1])];
        break;
      case Op.Modifier:
        out = [Op.Modifier, expr(s[1]), params(s[2]), hash(s[3])];
        break;
      case Op.Block:
        out = [Op.Block, expr(s[1]), params(s[2]), hash(s[3]), blocks(s[4])];
        break;
      case Op.InvokeComponent:
        out = [Op.InvokeComponent, expr(s[1]), params(s[2]), hash(s[3]), blocks(s[4])];
        break;
      case Op.Component:
        out = [Op.Component, expr(s[1]), elementParams(s[2]), hash(s[3]), blocks(s[4])];
        break;
      case Op.DynamicAttr:
      case Op.ComponentAttr:
      case Op.TrustingDynamicAttr:
      case Op.TrustingComponentAttr:
        out = (s.length > 3
          ? [s[0], s[1], expr(s[2]), s[3]]
          : [s[0], s[1], expr(s[2])]) as unknown as T;
        break;
      case Op.Yield:
        out = [Op.Yield, s[1], params(s[2])];
        break;
      case Op.InElement:
        out = (s.length > 4
          ? [Op.InElement, inlineBlock(s[1]), s[2], expr(s[3]), expr(s[4])]
          : [Op.InElement, inlineBlock(s[1]), s[2], expr(s[3])]) as unknown as T;
        break;
      case Op.If:
        out = [Op.If, expr(s[1]), inlineBlock(s[2]), optionalBlock(s[3])];
        break;
      case Op.Each:
        out = [
          Op.Each,
          expr(s[1]),
          s[2] === null ? null : expr(s[2]),
          inlineBlock(s[3]),
          optionalBlock(s[4]),
        ];
        break;
      case Op.Let:
        out = [Op.Let, params(s[1]), inlineBlock(s[2])];
        break;
      case Op.WithDynamicVars:
        out = [Op.WithDynamicVars, hash(s[1]), inlineBlock(s[2])];
        break;
      default:
        out = s;
    }

    return out as T;
  }

  return {
    block: [statements.map((s) => statement(s)), locals, upvars],
    slots,
  };
}
