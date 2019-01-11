import {
  ContainingMetadata,
  SyntaxCompilationContext,
  TemplateCompilationContext,
  WholeProgramCompilationContext,
  CompileMode,
} from '@glimmer/interfaces';
import { EncoderImpl } from './encoder';
import { Macros } from '../syntax/macros';
import { ProgramCompilationContext } from '../program-context';
import { DefaultCompileTimeResolverDelegate, ResolverDelegate } from './delegate';

export function syntaxCompilationContext(
  program: WholeProgramCompilationContext,
  macros: Macros
): SyntaxCompilationContext {
  return {
    program,
    macros,
  };
}

export function Context(
  resolver: ResolverDelegate = {},
  mode: CompileMode = CompileMode.aot,
  macros = new Macros()
) {
  return {
    program: new ProgramCompilationContext(new DefaultCompileTimeResolverDelegate(resolver), mode),
    macros,
  };
}

export function templateCompilationContext(
  syntax: SyntaxCompilationContext,
  meta: ContainingMetadata
): TemplateCompilationContext {
  let encoder = new EncoderImpl();

  return {
    syntax,
    encoder,
    meta,
  };
}
