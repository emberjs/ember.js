import { populateBuiltins } from './builtins';
import {
  WireFormat,
  NamedBlocks,
  TemplateCompilationContext,
  StatementCompileActions,
  Option,
  Unhandled,
  SexpOpcodes,
  CompileTimeResolverDelegate,
  ContainingMetadata,
} from '@glimmer/interfaces';
import { dict, assert } from '@glimmer/util';
import { UNHANDLED } from './concat';

export class Macros {
  public blocks: Blocks;
  public inlines: Inlines;

  constructor() {
    let { blocks, inlines } = populateBuiltins();
    this.blocks = blocks;
    this.inlines = inlines;
  }
}

export interface MacroContext {
  resolver: CompileTimeResolverDelegate;
  meta: ContainingMetadata;
}

export type BlockMacro = (
  params: WireFormat.Core.Params,
  hash: WireFormat.Core.Hash,
  blocks: NamedBlocks,
  context: MacroContext
) => StatementCompileActions;

export type MissingBlockMacro = (
  name: string,
  params: WireFormat.Core.Params,
  hash: WireFormat.Core.Hash,
  blocks: NamedBlocks,
  context: MacroContext
) => StatementCompileActions;

export class Blocks {
  private names = dict<number>();
  private funcs: BlockMacro[] = [];
  private missing: MissingBlockMacro | undefined;

  add(name: string, func: BlockMacro) {
    this.funcs.push(func as BlockMacro);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing(func: MissingBlockMacro) {
    this.missing = func as MissingBlockMacro;
  }

  compile(
    name: string,
    params: WireFormat.Core.Params,
    hash: WireFormat.Core.Hash,
    blocks: NamedBlocks,
    context: TemplateCompilationContext
  ): StatementCompileActions {
    let index = this.names[name];

    let macroContext = {
      resolver: context.syntax.program.resolverDelegate,
      meta: context.meta,
    };

    if (index === undefined) {
      assert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
      let func = this.missing!;
      let handled = func(name, params, hash, blocks, macroContext);
      assert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
      return handled;
    } else {
      let func = this.funcs[index];
      return func(params, hash, blocks, macroContext);
    }
  }
}

export type AppendSyntax = WireFormat.Statements.Append;
export type AppendMacro = (
  name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  context: MacroContext
) => StatementCompileActions | Unhandled;

export class Inlines {
  private names = dict<number>();
  private funcs: AppendMacro[] = [];
  private missing: AppendMacro | undefined;

  add(name: string, func: AppendMacro) {
    this.funcs.push(func as AppendMacro);
    this.names[name] = this.funcs.length - 1;
  }

  addMissing(func: AppendMacro) {
    this.missing = func as AppendMacro;
  }

  compile(
    sexp: AppendSyntax,
    context: TemplateCompilationContext
  ): StatementCompileActions | Unhandled {
    let value = sexp[1];

    // TODO: Fix this so that expression macros can return
    // things like components, so that {{component foo}}
    // is the same as {{(component foo)}}

    if (!Array.isArray(value)) return UNHANDLED;

    let name: string;
    let params: Option<WireFormat.Core.Params>;
    let hash: Option<WireFormat.Core.Hash>;

    if (value[0] === SexpOpcodes.Helper) {
      name = value[1];
      params = value[2];
      hash = value[3];
    } else if (value[0] === SexpOpcodes.Unknown) {
      name = value[1];
      params = hash = null;
    } else {
      return UNHANDLED;
    }

    let index = this.names[name];

    let macroContext = {
      resolver: context.syntax.program.resolverDelegate,
      meta: context.meta,
    };

    if (index === undefined && this.missing) {
      let func = this.missing;
      return func(name, params, hash, macroContext);
    } else if (index !== undefined) {
      let func = this.funcs[index];
      return func(name, params, hash, macroContext);
    } else {
      return UNHANDLED;
    }
  }
}
