import {
  WireFormat,
  SexpOpcodes as Op,
  Option,
  SerializedInlineBlock,
  SerializedTemplateBlock,
} from '@glimmer/interfaces';
import { dict, exhausted } from '@glimmer/util';
import { inflateAttrName, inflateTagName } from './utils';

export default class WireFormatDebugger {
  constructor(private program: SerializedTemplateBlock, _parameters?: number[]) {}

  format(): unknown {
    let out = [];

    for (let statement of this.program.statements) {
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
            this.formatAttrs(opcode[2]),
            this.formatHash(opcode[3]),
            this.formatBlocks(opcode[4]),
          ];

        // case Op.DynamicComponent:
        //   return [
        //     'dynamic-component',
        //     this.formatOpcode(opcode[1]),
        //     this.formatAttrs(opcode[2]),
        //     this.formatHash(opcode[3]),
        //     this.formatBlocks(opcode[4]),
        //   ];

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

        default: {
          let [op, sym, path] = opcode;
          let opName: string;
          let varName: string;
          if (op === Op.GetSymbol) {
            varName = this.program.symbols[sym];
            opName = 'get-symbol';
          } else {
            varName = this.program.upvars[sym];
            switch (op) {
              case Op.GetFree:
                opName = 'get-free';
                break;
              case Op.GetFreeInAppendSingleId:
                opName = 'get-free-in-append-single-id';
                break;
              case Op.GetFreeInBlockHead:
                opName = 'get-free-in-block-head';
                break;
              case Op.GetFreeInCallHead:
                opName = 'get-free-in-call-head';
                break;
              case Op.GetFreeInComponentHead:
                opName = 'get-free-in-component-head';
                break;
              case Op.GetFreeInExpression:
                opName = 'get-free-in-expression';
                break;
              case Op.GetFreeInModifierHead:
                opName = 'get-free-in-modifier-head';
                break;
              default:
                return exhausted(op);
            }
          }
          return path ? [opName, varName, path] : [opName, varName];
        }
      }
    } else {
      return opcode;
    }
  }

  private formatAttrs(opcodes: Option<WireFormat.Attribute[]>): Option<unknown[]> {
    if (opcodes === null) return null;
    return opcodes.map(o => this.formatOpcode(o));
  }

  private formatParams(opcodes: Option<WireFormat.Expression[]>): Option<unknown[]> {
    if (opcodes === null) return null;
    return opcodes.map(o => this.formatOpcode(o));
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
      parameters: block.parameters,
      statements: block.statements.map(s => this.formatOpcode(s)),
    };
  }
}
