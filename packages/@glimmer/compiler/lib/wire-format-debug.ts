import {
  WireFormat,
  SexpOpcodes as Op,
  Option,
  SerializedInlineBlock,
  SerializedTemplateBlock,
} from '@glimmer/interfaces';
import { dict, assertNever } from '@glimmer/util';

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
          return ['append', this.formatOpcode(opcode[1]), opcode[2]];
        case Op.AttrSplat:
          return ['attr-splat'];
        case Op.Block:
          return [
            'block',
            this.formatOpcode(opcode[1]),
            this.formatParams(opcode[2]),
            this.formatHash(opcode[3]),
            this.formatBlocks(opcode[4]),
          ];

        case Op.OpenElement:
          return ['open-element', opcode[1], opcode[2]];

        case Op.CloseElement:
          return ['close-element'];

        case Op.FlushElement:
          return ['flush-element'];

        case Op.StaticAttr:
          return ['static-attr', opcode[1], opcode[2], opcode[3]];

        case Op.DynamicAttr:
          return ['dynamic-attr', opcode[1], this.formatOpcode(opcode[2]), opcode[3]];

        case Op.ComponentAttr:
          return ['component-attr', opcode[1], this.formatOpcode(opcode[2]), opcode[3]];

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
          return ['trusting-dynamic-attr', opcode[1], this.formatOpcode(opcode[2]), opcode[3]];

        case Op.TrustingComponentAttr:
          return ['trusting-component-attr', opcode[1], this.formatOpcode(opcode[2]), opcode[3]];

        case Op.Debugger:
          return ['debugger', opcode[1]];

        case Op.Comment:
          return ['comment', opcode[1]];

        case Op.Modifier:
          return [
            'modifier',
            this.formatOpcode(opcode[1]),
            this.formatParams(opcode[4]),
            this.formatHash(opcode[5]),
          ];

        case Op.Component:
          return [
            'component',
            opcode[1],
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

        case Op.GetSymbol:
          return ['get-symbol', this.program.symbols[opcode[1]], opcode[1]];

        case Op.GetFree:
          return ['get-free', this.program.upvars[opcode[1]]];

        case Op.GetContextualFree:
          return ['get-contextual-free', this.program.upvars[opcode[1]], opcode[2]];

        case Op.GetPath:
          return ['get-path', this.formatOpcode(opcode[1]), opcode[2]];

        case Op.HasBlock:
          return ['has-block', opcode[1]];

        case Op.HasBlockParams:
          return ['has-block-params', opcode[1]];

        case Op.Undefined:
          return ['undefined'];

        case Op.Call:
          debugger;
          return [
            'call',
            this.formatOpcode(opcode[3]),
            this.formatParams(opcode[4]),
            this.formatHash(opcode[5]),
          ];

        case Op.Concat:
          return ['concat', this.formatParams(opcode[1] as WireFormat.Core.Params)];

        default: {
          let opName = opcode[0];
          throw assertNever(opName, `unexpected ${opName}`);
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
