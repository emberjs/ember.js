import {
  Option,
  LayoutWithContext,
  ContainingMetadata,
  SerializedInlineBlock,
  WireFormat,
  SymbolTable,
  CompilableTemplate,
  Statement,
  SyntaxCompilationContext,
  CompilableBlock,
  CompilableProgram,
  Template,
  TemplateMeta,
} from '@glimmer/interfaces';
import { meta } from './opcode-builder/helpers/shared';
import { EMPTY_ARRAY } from '@glimmer/util';
import { templateCompilationContext } from './opcode-builder/context';
import { concatStatements } from './syntax/concat';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugCompiler } from './compiler';
import { patchStdlibs } from '@glimmer/program';
import { STATEMENTS } from './syntax/statements';
import { precompile } from '@glimmer/compiler';
import templateFactory from './template';

export const PLACEHOLDER_HANDLE = -1;

class CompilableTemplateImpl<S extends SymbolTable> implements CompilableTemplate<S> {
  compiled: Option<number> = null;

  constructor(
    readonly statements: WireFormat.Statement[],
    readonly meta: ContainingMetadata,
    // Part of CompilableTemplate
    readonly symbolTable: S
  ) {}

  // Part of CompilableTemplate
  compile(context: SyntaxCompilationContext): number {
    return maybeCompile(this, context);
  }
}

export function preprocess<M extends TemplateMeta>(template: string, meta: M): Template<M> {
  let wrapper = JSON.parse(precompile(template));
  let factory = templateFactory<M>(wrapper);
  return factory.create(meta);
}

export function compilable<R>(layout: LayoutWithContext<R>): CompilableProgram {
  let block = layout.block;
  return new CompilableTemplateImpl(block.statements, meta(layout), {
    symbols: block.symbols,
    hasEval: block.hasEval,
  });
}

function maybeCompile(
  compilable: CompilableTemplateImpl<SymbolTable>,
  context: SyntaxCompilationContext
): number {
  if (compilable.compiled !== null) return compilable.compiled!;

  compilable.compiled = PLACEHOLDER_HANDLE;

  let { statements, meta } = compilable;

  let compiled = (compilable.compiled = compileStatements(statements, meta, context));
  patchStdlibs(context.program);

  return compiled;
}

export function compileStatements(
  statements: Statement[],
  meta: ContainingMetadata,
  syntaxContext: SyntaxCompilationContext
): number {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);

  for (let i = 0; i < statements.length; i++) {
    concatStatements(context, sCompiler.compile(statements[i], context.meta));
  }

  let handle = context.encoder.commit(syntaxContext.program.heap, meta.size);

  if (DEBUG) {
    debugCompiler(context, handle);
  }

  return handle;
}

export function compilableBlock(
  overloadBlock: SerializedInlineBlock | WireFormat.Statement[],
  containing: ContainingMetadata
): CompilableBlock {
  let block = Array.isArray(overloadBlock)
    ? { statements: overloadBlock, parameters: EMPTY_ARRAY }
    : overloadBlock;

  return new CompilableTemplateImpl(block.statements, containing, { parameters: block.parameters });
}
