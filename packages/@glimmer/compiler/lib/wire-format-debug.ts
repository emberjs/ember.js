import {
  Option,
  SerializedInlineBlock,
  SerializedTemplateBlock,
  SexpOpcodes as Op,
  WireFormat,
} from '@glimmer/interfaces';
import { dict } from '@glimmer/util';

import { inflateAttrName, inflateTagName } from './utils';

export default class WireFormatDebugger {
  private upvars: string[];
  private symbols: string[];

  constructor([_statements, symbols, _hasEval, upvars]: SerializedTemplateBlock) {
    this.upvars = upvars;
    this.symbols = symbols;
  }

  format(program: SerializedTemplateBlock): unknown {
    let out = [];

    for (let statement of program[0]) {
      out.push(this.formatOpcode(statement));
    }

    return out;
  }

  formatOpcode(opcode: WireFormat.Syntax): unknown {
    if (Array.isArray(opcode)) {
      switch (opcode[0]) {
        case Op.Append:
          return ['append', this.formatOpcode(opcode[1])];
        case Op.TrustingAppend:
          return ['trusting-append', this.formatOpcode(opcode[1])];

        case Op.Block:
          return [
            'block',
            this.formatOpcode(opcode[1]),
            this.formatParams(opcode[2]),
            this.formatHash(opcode[3]),
            this.formatBlocks(opcode[4]),
          ];

        case Op.InElement:
          return [
            'in-element',
            opcode[1],
            this.formatOpcode(opcode[2]),
            opcode[3] ? this.formatOpcode(opcode[3]) : undefined,
          ];

        case Op.OpenElement:
          return ['open-element', inflateTagName(opcode[1])];

        case Op.OpenElementWithSplat:
          return ['open-element-with-splat', inflateTagName(opcode[1])];

        case Op.CloseElement:
          return ['close-element'];

        case Op.FlushElement:
          return ['flush-element'];

        case Op.StaticAttr:
          return ['static-attr', inflateAttrName(opcode[1]), opcode[2], opcode[3]];

        case Op.StaticComponentAttr:
          return ['static-component-attr', inflateAttrName(opcode[1]), opcode[2], opcode[3]];

        case Op.DynamicAttr:
          return [
            'dynamic-attr',
            inflateAttrName(opcode[1]),
            this.formatOpcode(opcode[2]),
            opcode[3],
          ];

        case Op.ComponentAttr:
          return [
            'component-attr',
            inflateAttrName(opcode[1]),
            this.formatOpcode(opcode[2]),
            opcode[3],
          ];

        case Op.AttrSplat:
          return ['attr-splat'];

        case Op.Yield:
          return ['yield', opcode[1], this.formatParams(opcode[2])];

        case Op.Partial:
          return ['partial', this.formatOpcode(opcode[1]), opcode[2]];

        case Op.DynamicArg:
          return ['dynamic-arg', opcode[1], this.formatOpcode(opcode[2])];

        case Op.StaticArg:
          return ['static-arg', opcode[1], this.formatOpcode(opcode[2])];

        case Op.TrustingDynamicAttr:
          return [
            'trusting-dynamic-attr',
            inflateAttrName(opcode[1]),
            this.formatOpcode(opcode[2]),
            opcode[3],
          ];

        case Op.TrustingComponentAttr:
          return [
            'trusting-component-attr',
            inflateAttrName(opcode[1]),
            this.formatOpcode(opcode[2]),
            opcode[3],
          ];

        case Op.Debugger:
          return ['debugger', opcode[1]];

        case Op.Comment:
          return ['comment', opcode[1]];

        case Op.Modifier:
          return [
            'modifier',
            this.formatOpcode(opcode[1]),
            this.formatParams(opcode[2]),
            this.formatHash(opcode[3]),
          ];

        case Op.Component:
          return [
            'component',
            this.formatOpcode(opcode[1]),
            this.formatElementParams(opcode[2]),
            this.formatHash(opcode[3]),
            this.formatBlocks(opcode[4]),
          ];

        case Op.HasBlock:
          return ['has-block', this.formatOpcode(opcode[1])];

        case Op.HasBlockParams:
          return ['has-block-params', this.formatOpcode(opcode[1])];

        case Op.Undefined:
          return ['undefined'];

        case Op.Call:
          return [
            'call',
            this.formatOpcode(opcode[1]),
            this.formatParams(opcode[2]),
            this.formatHash(opcode[3]),
          ];

        case Op.Concat:
          return ['concat', this.formatParams(opcode[1] as WireFormat.Core.Params)];

        case Op.GetStrictFree:
          return ['get-strict-free', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsFallback:
          return ['GetFreeAsFallback', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsComponentOrHelperHeadOrThisFallback:
          return [
            'GetFreeAsComponentOrHelperHeadOrThisFallback',
            this.upvars[opcode[1]],
            opcode[2],
          ];

        case Op.GetFreeAsComponentOrHelperHead:
          return ['GetFreeAsComponentOrHelperHead', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsHelperHeadOrThisFallback:
          return ['GetFreeAsHelperHeadOrThisFallback', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsHelperHead:
          return ['GetFreeAsHelperHead', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsComponentHead:
          return ['GetFreeAsComponentHead', this.upvars[opcode[1]], opcode[2]];

        case Op.GetFreeAsModifierHead:
          return ['GetFreeAsModifierHead', this.upvars[opcode[1]], opcode[2]];

        case Op.GetSymbol: {
          if (opcode[1] === 0) {
            return ['get-symbol', 'this', opcode[2]];
          } else {
            return ['get-symbol', this.symbols[opcode[1] - 1], opcode[2]];
          }
        }
      }
    } else {
      return opcode;
    }
  }

  private formatElementParams(opcodes: Option<WireFormat.ElementParameter[]>): Option<unknown[]> {
    if (opcodes === null) return null;
    return opcodes.map((o) => this.formatOpcode(o));
  }

  private formatParams(opcodes: Option<WireFormat.Expression[]>): Option<unknown[]> {
    if (opcodes === null) return null;
    return opcodes.map((o) => this.formatOpcode(o));
  }

  private formatHash(hash: WireFormat.Core.Hash): Option<object> {
    if (hash === null) return null;

    return hash[0].reduce((accum, key, index) => {
      accum[key] = this.formatOpcode(hash[1][index]);
      return accum;
    }, dict());
  }

  private formatBlocks(blocks: WireFormat.Core.Blocks): Option<object> {
    if (blocks === null) return null;

    return blocks[0].reduce((accum, key, index) => {
      accum[key] = this.formatBlock(blocks[1][index]);
      return accum;
    }, dict());
  }

  private formatBlock(block: SerializedInlineBlock): object {
    return {
      statements: block[0].map((s) => this.formatOpcode(s)),
      parameters: block[1],
    };
  }
}
