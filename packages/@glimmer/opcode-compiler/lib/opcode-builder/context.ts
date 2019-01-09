import {
  ContainingMetadata,
  SyntaxCompilationContext,
  TemplateCompilationContext,
  WholeProgramCompilationContext,
  CompileTimeResolverDelegate,
  CompileMode,
} from '@glimmer/interfaces';
import { EncoderImpl } from './encoder';
import { Macros } from '../syntax/macros';
import { ProgramCompilationContext } from '../program-context';

export function syntaxCompilationContext(
  program: WholeProgramCompilationContext,
  macros: Macros
): SyntaxCompilationContext {
  return {
    program,
    macros,
  };
}

export function Syntax(
  resolver: CompileTimeResolverDelegate,
  mode: CompileMode = CompileMode.aot,
  macros = new Macros()
) {
  return {
    program: new ProgramCompilationContext(resolver, mode),
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
