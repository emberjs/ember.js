import {
  CompileTimeResolver,
  ContainingMetadata,
  SyntaxCompilationContext,
  TemplateCompilationContext,
  CompileTimeArtifacts,
} from '@glimmer/interfaces';
import { EncoderImpl } from './encoder';
import { MacrosImpl } from '../syntax/macros';
import { CompileTimeCompilationContextImpl } from '../program-context';

export function syntaxCompilationContext(
  artifacts: CompileTimeArtifacts,
  resolver: CompileTimeResolver,
  macros = new MacrosImpl()
): SyntaxCompilationContext {
  return {
    program: new CompileTimeCompilationContextImpl(artifacts, resolver),
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
