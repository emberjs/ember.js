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
  MacroBlocks,
  MacroInlines,
  Macros,
} from '@glimmer/interfaces';
import { dict, assert } from '@glimmer/util';
import { UNHANDLED } from './concat';
import { expectString, isGet, simplePathName } from '../utils';

export class MacrosImpl implements Macros {
  public blocks: MacroBlocks;
  public inlines: MacroInlines;

  constructor() {
    let { blocks, inlines } = populateBuiltins(new Blocks(), new Inlines());
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

export class Blocks implements MacroBlocks {
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

export class Inlines implements MacroInlines {
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
    let [, , value] = sexp;

    // TODO: Fix this so that expression macros can return
    // things like components, so that {{component foo}}
    // is the same as {{(component foo)}}

    if (!Array.isArray(value)) return UNHANDLED;

    let name: string;
    let params: Option<WireFormat.Core.Params>;
    let hash: Option<WireFormat.Core.Hash>;

    if (value[0] === SexpOpcodes.Call) {
      let nameOrError = expectString(
        value[1],
        context.meta,
        'Expected head of call to be a string'
      );

      if (typeof nameOrError !== 'string') {
        return nameOrError;
      }

      name = nameOrError;
      params = value[2];
      hash = value[3];
    } else if (isGet(value)) {
      let pathName = simplePathName(value, context.meta);

      if (pathName === null) {
        return UNHANDLED;
      }

      name = pathName;
      params = null;
      hash = null;
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
