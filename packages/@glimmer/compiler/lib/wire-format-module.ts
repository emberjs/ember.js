import type {
  Nullable,
  SerializedInlineBlock,
  SerializedTemplateBlock,
  WireFormat,
} from '@glimmer/interfaces';
import { opcodes as Op } from '@glimmer/wire-format/lib/opcodes';

export const OPS_MODULE = '@glimmer/opcode-compiler/ops';

export interface OpImport {
  local: string;
  module: string;
  name: string;
  /** The numeric SexpOpcode the export compiles, or -1 for a keyword value. */
  id: number;
}

export interface LexicalKeyword {
  module: string;
  name: string;
}

export interface PrinterOptions {
  /**
   * Strict keywords to turn into lexical scope entries. A keyword in this
   * map is printed as `GetLexicalSymbol` with a slot after the template's
   * own locals, and its import is added to `imports`. The runtime then
   * needs no resolver for it.
   */
  lexicalKeywords?: Record<string, LexicalKeyword>;
  /** How many lexical scope entries the template has before keywords. */
  scopeOffset?: number;
}

const NAMES: Record<number, string> = {};
for (let [name, value] of Object.entries(Op)) {
  NAMES[value] = name;
}

/**
 * Prints a wire format block as JavaScript source. Each tuple head becomes an
 * identifier that the caller must bind to the matching export of
 * `@glimmer/opcode-compiler/ops`. Everything else stays JSON.
 */
export class WireFormatModulePrinter {
  readonly imports: OpImport[] = [];
  /** Keyword name to the identifier bound to its import, in slot order. */
  readonly keywordSlots: Array<{ name: string; local: string }> = [];
  private seen = new Set<string>();
  private upvars: string[] = [];
  private lexicalKeywords: Record<string, LexicalKeyword>;
  private scopeOffset: number;

  constructor(options: PrinterOptions = {}) {
    this.lexicalKeywords = options.lexicalKeywords ?? {};
    this.scopeOffset = options.scopeOffset ?? 0;
  }

  block(block: SerializedTemplateBlock): string {
    let [statements, locals, upvars] = block;
    this.upvars = upvars;
    return `[${this.statements(statements)},${lit(locals)},${lit(upvars)}]`;
  }

  private keywordSlot(upvar: number): string | null {
    let name = this.upvars[upvar];
    let keyword = name === undefined ? undefined : this.lexicalKeywords[name];

    if (name === undefined || keyword === undefined) {
      return null;
    }

    let slot = this.keywordSlots.findIndex((entry) => entry.name === name);

    if (slot === -1) {
      let local = `__kw_${name.replace(/[^A-Za-z0-9_$]/g, '_')}`;
      slot = this.keywordSlots.push({ name, local }) - 1;
      this.imports.push({ local, module: keyword.module, name: keyword.name, id: -1 });
    }

    return `[${this.head(Op.GetLexicalSymbol)},${this.scopeOffset + slot}]`;
  }

  private head(op: number, variant?: string): string {
    let name = variant ?? NAMES[op];

    if (name === undefined) {
      throw new Error(`Unknown wire format opcode ${op}`);
    }

    let local = `__wf_${name}`;

    if (!this.seen.has(local)) {
      this.seen.add(local);
      this.imports.push({ local, module: OPS_MODULE, name, id: op });
    }

    return local;
  }

  private statements(statements: WireFormat.Statement[]): string {
    return `[${statements.map((s) => this.statement(s)).join(',')}]`;
  }

  private statement(s: WireFormat.Statement): string {
    let tail: string[];

    switch (s[0]) {
      case Op.Append:
        if (!Array.isArray(s[1])) {
          return `[${this.head(s[0], 'AppendStatic')},${lit(s[1])}]`;
        }
        tail = [this.expr(s[1])];
        break;
      case Op.TrustingAppend:
        tail = [this.expr(s[1])];
        break;
      case Op.Comment:
      case Op.OpenElement:
      case Op.OpenElementWithSplat:
      case Op.AttrSplat:
        tail = [lit(s[1])];
        break;
      case Op.Debugger:
        tail = [lit(s[1]), lit(s[2]), lit(s[3])];
        break;
      case Op.FlushElement:
      case Op.CloseElement:
        tail = [];
        break;
      case Op.Modifier:
        tail = [this.expr(s[1]), this.params(s[2]), this.hash(s[3])];
        break;
      case Op.Block:
      case Op.InvokeComponent:
        tail = [this.expr(s[1]), this.params(s[2]), this.hash(s[3]), this.blocks(s[4])];
        break;
      case Op.Component:
        tail = [this.expr(s[1]), this.elementParams(s[2]), this.hash(s[3]), this.blocks(s[4])];
        break;
      case Op.StaticAttr:
      case Op.StaticComponentAttr:
        tail = rest([lit(s[1]), lit(s[2])], s.length > 3 ? lit(s[3]) : undefined);
        break;
      case Op.DynamicAttr:
      case Op.ComponentAttr:
      case Op.TrustingDynamicAttr:
      case Op.TrustingComponentAttr:
        tail = rest([lit(s[1]), this.expr(s[2])], s.length > 3 ? lit(s[3]) : undefined);
        break;
      case Op.Yield:
        tail = [lit(s[1]), this.params(s[2])];
        break;
      case Op.InElement:
        tail = rest(
          [this.inlineBlock(s[1]), this.expr(s[2]), this.expr(s[3])],
          s.length > 4 ? this.expr(s[4]) : undefined
        );
        break;
      case Op.If:
        tail = [this.expr(s[1]), this.inlineBlock(s[2]), this.optionalBlock(s[3])];
        break;
      case Op.Each:
        tail = [
          this.expr(s[1]),
          s[2] === null ? 'null' : this.expr(s[2]),
          this.inlineBlock(s[3]),
          this.optionalBlock(s[4]),
        ];
        break;
      case Op.Let:
        tail = [this.params(s[1]), this.inlineBlock(s[2])];
        break;
      case Op.WithDynamicVars:
        tail = [this.hash(s[1]), this.inlineBlock(s[2])];
        break;
      default:
        throw new Error(`Unhandled statement opcode ${String((s as unknown[])[0])}`);
    }

    return `[${[this.head(s[0]), ...tail].join(',')}]`;
  }

  private expr(e: WireFormat.Expression): string {
    if (!Array.isArray(e)) {
      return lit(e);
    }

    let tail: string[];

    switch (e[0]) {
      case Op.GetStrictKeyword: {
        let lexical = this.keywordSlot(e[1]);
        if (lexical !== null) return lexical;
        tail = [lit(e[1])];
        break;
      }
      case Op.GetSymbol:
      case Op.GetLexicalSymbol:
      case Op.GetFreeAsComponentOrHelperHead:
      case Op.GetFreeAsHelperHead:
      case Op.GetFreeAsModifierHead:
      case Op.GetFreeAsComponentHead:
        tail = (e as unknown[]).slice(1).map((v) => lit(v));
        break;
      case Op.Undefined:
        tail = [];
        break;
      case Op.Concat:
      case Op.Log:
        tail = [this.params(e[1])];
        break;
      case Op.Call:
        tail = [this.expr(e[1]), this.params(e[2]), this.hash(e[3])];
        break;
      case Op.HasBlock:
      case Op.HasBlockParams:
      case Op.Not:
      case Op.GetDynamicVar:
        tail = [this.expr(e[1])];
        break;
      case Op.Curry:
        tail = [this.expr(e[1]), lit(e[2]), this.params(e[3]), this.hash(e[4])];
        break;
      case Op.IfInline:
        tail = rest([this.expr(e[1]), this.expr(e[2])], e.length > 3 ? this.expr(e[3]) : undefined);
        break;
      default:
        throw new Error(`Unhandled expression opcode ${String((e as unknown[])[0])}`);
    }

    return `[${[this.head(e[0]), ...tail].join(',')}]`;
  }

  private params(params: Nullable<WireFormat.Expression[]> | undefined): string {
    if (params === null) return 'null';
    if (params === undefined) return 'undefined';
    return `[${params.map((p) => this.expr(p)).join(',')}]`;
  }

  private hash(hash: WireFormat.Core.Hash | undefined): string {
    if (hash === null) return 'null';
    if (hash === undefined) return 'undefined';
    return `[${lit(hash[0])},[${hash[1].map((p) => this.expr(p)).join(',')}]]`;
  }

  private blocks(blocks: WireFormat.Core.Blocks | undefined): string {
    if (blocks === null) return 'null';
    if (blocks === undefined) return 'undefined';
    return `[${lit(blocks[0])},[${blocks[1].map((b) => this.inlineBlock(b)).join(',')}]]`;
  }

  private elementParams(params: WireFormat.Core.ElementParameters): string {
    if (params === null) return 'null';
    return `[${params.map((p) => this.statement(p)).join(',')}]`;
  }

  private inlineBlock(block: SerializedInlineBlock): string {
    return `[${this.statements(block[0])},${lit(block[1])}]`;
  }

  private optionalBlock(block: Nullable<SerializedInlineBlock>): string {
    return block === null ? 'null' : this.inlineBlock(block);
  }
}

function rest(head: string[], last: string | undefined): string[] {
  if (last !== undefined) {
    head.push(last);
  }

  return head;
}

function lit(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}
