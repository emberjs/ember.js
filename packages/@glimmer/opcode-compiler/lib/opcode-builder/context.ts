import {
  ContainingMetadata,
  SyntaxCompilationContext,
  TemplateCompilationContext,
  WholeProgramCompilationContext,
  CompileMode,
} from '@glimmer/interfaces';
import { EncoderImpl } from './encoder';
import { MacrosImpl } from '../syntax/macros';
import { ProgramCompilationContext, JitProgramCompilationContext } from '../program-context';
import { DefaultCompileTimeResolverDelegate, ResolverDelegate } from './delegate';
import { JitSyntaxCompilationContext } from '@glimmer/runtime';

export function syntaxCompilationContext(
  program: WholeProgramCompilationContext,
  macros: MacrosImpl
): SyntaxCompilationContext {
  return {
    program,
    macros,
  };
}

export function Context(
  resolver: ResolverDelegate = {},
  mode: CompileMode = CompileMode.aot,
  macros = new MacrosImpl()
) {
  return {
    program: new ProgramCompilationContext(new DefaultCompileTimeResolverDelegate(resolver), mode),
    macros,
  };
}

export function JitContext(
  resolver: ResolverDelegate = {},
  macros = new MacrosImpl()
): JitSyntaxCompilationContext {
  return {
    program: new JitProgramCompilationContext(new DefaultCompileTimeResolverDelegate(resolver)),
    macros,
  };
}

export function AotContext(resolver: ResolverDelegate = {}, macros = new MacrosImpl()) {
  return {
    program: new ProgramCompilationContext(
      new DefaultCompileTimeResolverDelegate(resolver),
      CompileMode.aot
    ),
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
